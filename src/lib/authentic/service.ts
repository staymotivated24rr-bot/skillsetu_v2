import { createHash } from 'node:crypto';
import { db } from '../db';
import { AppError } from '../errors';
import { gradeTask, publicTask } from './grading';
import type { AssessmentBank, TaskPayload, RepairModule, PublicBank, PublicRepair } from './types';
import { pythonBanks, pythonRepairs } from './python-banks';
export async function ensurePublishedPythonBanks() {
  const existing = await db.assessmentBank.findMany({
    where: { id: { in: pythonBanks.map((bank) => bank.id) } },
    select: { id: true, content: true, digest: true },
  });
  const known = new Map(existing.map((row) => [row.id, row]));
  for (const bank of pythonBanks) {
    const content = JSON.stringify(bank);
    const digest = createHash('sha256').update(content).digest('hex');
    const current = known.get(bank.id);
    if (current) {
      if (current.digest !== digest || current.content !== content) {
        const references = await db.assessmentAttempt.count({ where: { bankId: bank.id } });
        if (references)
          throw new AppError(
            `Published assessment bank ${bank.id} does not match the immutable application copy.`,
            500,
          );
        await db.assessmentBank.update({
          where: { id: bank.id },
          data: {
            roleId: bank.roleId,
            kind: bank.kind,
            version: bank.version,
            contentVersion: bank.contentVersion,
            content,
            digest,
          },
        });
      }
      continue;
    }
    const row = await db.assessmentBank.upsert({
      where: { id: bank.id },
      create: {
        id: bank.id,
        roleId: bank.roleId,
        kind: bank.kind,
        version: bank.version,
        contentVersion: bank.contentVersion,
        content,
        digest,
      },
      update: {},
    });
    if (row.digest !== digest || row.content !== content)
      throw new AppError(
        `Published assessment bank ${bank.id} changed while it was being initialized.`,
        500,
      );
  }
}

export function publicBank(
  bank: AssessmentBank,
  evidence: { taskId: string; score: number }[] = [],
): PublicBank {
  return {
    ...bank,
    tasks: bank.tasks.map((task, index) => {
      const prev = bank.tasks[index - 1];
      const result = evidence.find((e) => e.taskId === prev?.id);
      return {
        ...publicTask(task),
        revealedConstraint:
          result && prev?.followup
            ? result.score >= 0.75
              ? prev.followup.strong
              : prev.followup.risk
            : undefined,
      };
    }),
  };
}
export function publicRepair(repairModule: RepairModule): PublicRepair {
  return { ...repairModule, tasks: repairModule.tasks.map(publicTask) };
}
export async function attemptTask(userId: string, attemptId: string, taskId: string) {
  const [user, attempt] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
      include: { bank: true, evidence: { orderBy: { answeredAt: 'asc' } }, assessment: true },
    }),
  ]);
  if (!attempt?.bank) throw new AppError('Versioned assessment not found.', 404);
  if (user?.selectedRoleId !== attempt.assessment.roleId)
    throw new AppError('Switch back to this assessment’s role to continue.', 409);
  if (attempt.status !== 'in_progress')
    throw new AppError('This assessment has already been submitted.', 409);
  const bank = JSON.parse(attempt.bank.content) as AssessmentBank;
  const task = bank.tasks.find((t) => t.id === taskId);
  if (!task) throw new AppError('Task not found.', 404);
  if (
    bank.tasks[attempt.evidence.length]?.id !== taskId &&
    !attempt.evidence.some((e) => e.taskId === taskId)
  )
    throw new AppError('Complete the tasks in order.');
  return { attempt, bank, task };
}
export async function evaluateAuthentic(
  userId: string,
  attemptId: string,
  taskId: string,
  payload: TaskPayload,
) {
  const { task } = await attemptTask(userId, attemptId, taskId);
  try {
    const result = gradeTask(task, payload);
    return {
      passed: result.passed,
      total: result.total,
      score: result.score,
      response: result.response,
    };
  } catch (e) {
    throw new AppError(e instanceof Error ? e.message : 'Invalid response.');
  }
}
export async function submitAuthentic(
  userId: string,
  attemptId: string,
  taskId: string,
  payload: TaskPayload,
) {
  const { task, bank } = await attemptTask(userId, attemptId, taskId);
  let result;
  try {
    result = gradeTask(task, payload);
  } catch (e) {
    throw new AppError(e instanceof Error ? e.message : 'Invalid response.');
  }
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "AssessmentAttempt" WHERE "id" = ${attemptId} FOR UPDATE`;
    const attempt = await tx.assessmentAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { evidence: true, user: true },
    });
    if (attempt.user.selectedRoleId !== bank.roleId || attempt.status !== 'in_progress')
      throw new AppError('The role or assessment state changed. Refresh before submitting.', 409);
    const previous = attempt.evidence.find((e) => e.taskId === taskId);
    const serialized = JSON.stringify(payload);
    if (previous) {
      if (previous.payload !== serialized)
        throw new AppError('Submitted evidence cannot be changed.', 409);
      return { response: previous.response };
    }
    if (bank.tasks[attempt.evidence.length]?.id !== taskId)
      throw new AppError('Complete the tasks in order.');
    await tx.taskEvidence.create({
      data: {
        attemptId,
        taskId,
        payload: serialized,
        score: result.score,
        response: result.response,
        taskType: task.type,
        scenario: task.scenario,
        transfer: task.transfer,
        mappings: JSON.stringify(task.skillIds),
        bankId: bank.id,
        assessmentVersion: bank.version,
      },
    });
    return { response: result.response };
  });
}
export async function repairAction(
  userId: string,
  skillId: string,
  mode: 'interactive' | 'structured',
  restart = false,
) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.selectedRoleId !== 'python-developer')
    throw new AppError('Repair repairModule belongs to another role.', 409);
  const repairModule = pythonRepairs.find((m) => m.skillId === skillId);
  if (!repairModule) throw new AppError('Repair repairModule not found.', 404);
  if (
    !(await db.assessmentAttempt.findFirst({
      where: {
        userId,
        status: 'complete',
        assessment: { roleId: 'python-developer', kind: 'diagnostic' },
      },
    }))
  )
    throw new AppError('Take the diagnostic first.');
  return db.$transaction(async (tx) => {
    const old = await tx.repairRun.findUnique({ where: { userId_skillId: { userId, skillId } } });
    if (old)
      return tx.repairRun.update({
        where: { id: old.id },
        data: { mode, ...(restart ? { run: old.run + 1, status: 'started' } : {}) },
      });
    return tx.repairRun.create({
      data: {
        userId,
        skillId,
        mode,
        moduleVersion: repairModule.version,
        contentSnapshot: JSON.stringify(repairModule),
      },
    });
  });
}
export async function repairTask(
  userId: string,
  skillId: string,
  taskId: string,
  payload?: TaskPayload,
  evaluate = false,
) {
  const run = await db.repairRun.findUnique({
    where: { userId_skillId: { userId, skillId } },
    include: { user: true },
  });
  if (!run || run.user.selectedRoleId !== 'python-developer')
    throw new AppError('Start this role’s repair repairModule first.', 409);
  const repairModule = JSON.parse(run.contentSnapshot) as RepairModule;
  const task = repairModule.tasks.find((t) => t.id === taskId);
  if (!task) throw new AppError('Practice task not found.', 404);
  if (!payload)
    return {
      hint: `${repairModule.intuition} Check the stated contract on an empty, normal and invalid input.`,
      explanation: task.explanation,
    };
  let result;
  try {
    result = gradeTask(task, payload);
  } catch (e) {
    throw new AppError(e instanceof Error ? e.message : 'Invalid response.');
  }
  if (evaluate) return { ...result, explanation: task.explanation };
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "RepairRun" WHERE "id" = ${run.id} FOR UPDATE`;
    const current = await tx.repairRun.findUniqueOrThrow({
      where: { id: run.id },
      include: { answers: { where: { run: run.run } } },
    });
    if (current.run !== run.run)
      throw new AppError('The practice run changed. Refresh and retry.', 409);
    const first = !current.answers.some((a) => a.taskId === taskId);
    if (
      first &&
      repairModule.tasks.find((t) => !current.answers.some((a) => a.taskId === t.id))?.id !== taskId
    )
      throw new AppError('Complete practice in order.');
    const answer = await tx.repairAnswer.create({
      data: {
        repairId: run.id,
        run: run.run,
        taskId,
        payload: JSON.stringify(payload),
        score: result.score,
        first,
        response: result.response,
      },
    });
    const initial = [...current.answers, answer].filter((a) => a.first);
    const complete = initial.length === repairModule.tasks.length;
    const correct = initial.filter((a) => a.score >= 0.75).length;
    const mastered =
      complete &&
      correct / repairModule.tasks.length >= 0.75 &&
      initial.find((a) => a.taskId === repairModule.tasks.at(-1)!.id)!.score >= 0.75;
    await tx.repairRun.update({
      where: { id: run.id },
      data: { status: mastered ? 'mastered' : complete ? 'needs-practice' : 'started' },
    });
    return {
      ...result,
      explanation: task.explanation,
      mastered,
      correct,
      total: repairModule.tasks.length,
    };
  });
}
