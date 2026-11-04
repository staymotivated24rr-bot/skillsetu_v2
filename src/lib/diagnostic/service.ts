import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { HYBRID_VERSION } from './hybrid-vnext';
import type { DiagnosticRun, DiagnosticResponse, Prisma } from '@prisma/client';
import { db } from '../db';
import { AppError } from '../errors';
import { blockDiagnostic as pythonDiagnostic } from './block-bank';
import {
  draftPreviewEnabled,
  starterDiagnostic,
  STARTER_BANK_ID,
  STARTER_BANK_PREFIX,
  validateStarterSource,
} from './starter-v3/bank';
import { buildQuestionReview } from './report-review';
import {
  answerSchema,
  ENGINE_VERSION,
  grade,
  makeReport,
  publicQuestion,
  selectNext,
  validateBank,
} from './engine';
import type { Answer, Bank, Report, RunView } from './types';
export const SESSION_COOKIE = 'skillsetu-diagnostic';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function enter(name: string) {
  const token = randomBytes(32).toString('base64url');
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, selectedRoleId: 'python-developer' } });
    await tx.diagnosticSession.create({
      data: {
        tokenHash: digest(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
  });
  return token;
}
export async function sessionFor(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError('Enter the diagnostic pilot to continue.', 401);
  const session = await db.diagnosticSession.findUnique({ where: { tokenHash: digest(token) } });
  if (!session || session.expiresAt <= new Date())
    throw new AppError('Your pilot session expired. Enter again to continue.', 401);
  return session;
}
type StoredRun = DiagnosticRun & { responses: DiagnosticResponse[] };
function bankFor(run: DiagnosticRun): Bank {
  if (
    ![
      ENGINE_VERSION,
      'rules-2.0.0',
      'rules-3.0.0',
      'hybrid-4.0.0-draft.1',
      HYBRID_VERSION,
    ].includes(run.engineVersion) ||
    digest(run.bankSnapshot) !== run.bankDigest
  )
    throw new AppError('This assessment version needs recovery. Your answers are preserved.', 409);
  if (run.bankId.startsWith(STARTER_BANK_PREFIX) && !draftPreviewEnabled())
    throw new AppError('Draft preview is disabled. Saved draft attempts are preserved.', 404);
  return JSON.parse(run.bankSnapshot) as Bank;
}
function view(run: StoredRun): RunView {
  const bank = bankFor(run),
    current = bank.questions.find((q) => q.id === run.currentQuestionId);
  const last = run.responses.at(-1);
  const report: Report | null =
    run.status === 'completed' && run.report ? JSON.parse(run.report) : null;
  return {
    id: run.id,
    status: run.status,
    bankId: run.bankId,
    role: bank.roleName,
    answered: run.responses.length,
    minimum: bank.policy.minimum,
    target: bank.policy.target,
    maximum: bank.policy.maximum,
    competencies: bank.competencies.map((c) => ({
      id: c.id,
      name: c.name,
      count: run.responses.filter(
        (r) => bank.questions.find((q) => q.id === r.questionId)!.competencyId === c.id,
      ).length,
    })),
    current: current ? publicQuestion(current) : null,
    rationale:
      run.status === 'completed'
        ? run.currentRationale
        : (run.currentRationale.startsWith('Independent fresh')
            ? 'Independent fresh diagnostic. No previous-report routing or credit. '
            : run.currentRationale.startsWith('Begin a fresh reassessment')
              ? 'Prior results supply routing only, never proficiency credit. '
              : '') +
          `This task samples ${bank.competencies.find((c) => c.id === current?.competencyId)?.name ?? 'Python reasoning'} through a different code or decision context. Questions adapt; results and explanations appear only in the final report.`,
    hint: run.hintUsed && current ? current.hint : null,
    draft: JSON.parse(run.draft) as Answer,
    lastFeedback: last ? { questionId: last.questionId, assisted: last.assisted } : null,
    report,
    review: report ? buildQuestionReview(bank, report, run.responses) : null,
  };
}
export async function getRun(sessionId: string, runId?: string, preview = false) {
  if (preview && !draftPreviewEnabled()) throw new AppError('Draft preview is disabled.', 404);
  const run = await db.diagnosticRun.findFirst({
    where: {
      sessionId,
      ...(runId
        ? { id: runId }
        : { bankId: preview ? STARTER_BANK_ID : { not: { startsWith: STARTER_BANK_PREFIX } } }),
    },
    orderBy: { startedAt: 'desc' },
    include: { responses: { orderBy: { position: 'asc' } } },
  });
  if (runId && !run) throw new AppError('Assessment not found.', 404);
  return run ? view(run) : null;
}
export async function startRun(
  sessionId: string,
  restart = false,
  mode: 'independent' | 'prior-informed' = 'independent',
  restartFrom?: string,
  preview = false,
) {
  if (preview && !draftPreviewEnabled()) throw new AppError('Draft preview is disabled.', 404);
  if (preview) validateStarterSource();
  const selectedBank = preview ? starterDiagnostic : pythonDiagnostic;
  validateBank(selectedBank);
  const id = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "DiagnosticSession" WHERE id = ${sessionId} FOR UPDATE`;
    const existing = await tx.diagnosticRun.findFirst({
      where: {
        sessionId,
        bankId: preview ? STARTER_BANK_ID : { not: { startsWith: STARTER_BANK_PREFIX } },
      },
      orderBy: { startedAt: 'desc' },
    });
    if (
      restartFrom &&
      !(await tx.diagnosticRun.findFirst({ where: { id: restartFrom, sessionId } }))
    )
      throw new AppError('Assessment not found.', 404);
    if (
      existing &&
      (!restart ||
        (existing.status === 'in_progress' && (!restartFrom || existing.id !== restartFrom)))
    )
      return existing.id;
    const newRunId = randomUUID();
    const engineVersion = preview ? HYBRID_VERSION : 'rules-3.0.0';
    const bankSnapshot = JSON.stringify(selectedBank),
      selection = selectNext(selectedBank, [], { version: engineVersion, seed: newRunId });
    const published = await tx.assessmentBank.upsert({
      where: { id: selectedBank.id },
      update: {},
      create: {
        id: selectedBank.id,
        roleId: selectedBank.roleId,
        kind: preview ? 'adaptive-diagnostic-draft' : 'adaptive-diagnostic',
        version: selectedBank.version,
        contentVersion: selectedBank.version,
        content: bankSnapshot,
        digest: digest(bankSnapshot),
      },
    });
    if (published.digest !== digest(bankSnapshot) || published.content !== bankSnapshot)
      throw new AppError('Published diagnostic content changed. Publish a new bank version.', 409);
    selection.rationale =
      'Independent fresh diagnostic. No previous-report routing or credit. ' + selection.rationale;
    if (mode === 'prior-informed' && existing?.report) {
      const prior = JSON.parse(existing.report) as Report;
      const gap =
        prior.findings.find((f) => f.status === 'Likely gap') ??
        prior.findings.find((f) => f.status === 'Insufficient evidence');
      if (gap) {
        const question = selectedBank.questions.find(
          (q) =>
            q.competencyId === gap.competencyId &&
            q.difficulty === 2 &&
            (preview || q.id.includes('parallel')),
        );
        if (question) {
          const routed = preview
            ? selectNext(selectedBank, [], {
                version: engineVersion,
                seed: newRunId,
                initialCompetency: gap.competencyId,
              })
            : { questionId: question.id, rationale: '' };
          selection.questionId = routed.questionId;
          selection.rationale = `Begin a fresh reassessment at previously unresolved ${gap.name}. Prior results supply routing only, never proficiency credit. Fixed-bank familiarity limits this comparison. ${routed.rationale}`;
        }
      }
    }
    return (
      await tx.diagnosticRun.create({
        data: {
          id: newRunId,
          sessionId,
          roleId: selectedBank.roleId,
          bankId: selectedBank.id,
          engineVersion,
          bankSnapshot,
          bankDigest: digest(bankSnapshot),
          currentQuestionId: selection.questionId,
          currentRationale: selection.rationale,
        },
      })
    ).id;
  });
  return (await getRun(sessionId, id))!;
}
async function owned(tx: Prisma.TransactionClient, sessionId: string, runId: string) {
  // Include ownership in the lock query: an arbitrary ID cannot lock another learner's row.
  await tx.$queryRaw`SELECT id FROM "DiagnosticRun" WHERE id = ${runId} AND "sessionId" = ${sessionId} FOR UPDATE`;
  const run = await tx.diagnosticRun.findFirst({
    where: { id: runId, sessionId },
    include: { responses: { orderBy: { position: 'asc' } } },
  });
  if (!run) throw new AppError('Assessment not found.', 404);
  return run;
}
export async function respond(sessionId: string, runId: string, questionId: string, raw: Answer) {
  return db.$transaction(async (tx) => {
    const run = await owned(tx, sessionId, runId),
      bank = bankFor(run);
    const question = bank.questions.find((q) => q.id === questionId);
    if (!question) throw new AppError('Question not found.', 404);
    const result = grade(question, raw, { allowUnsure: run.engineVersion === HYBRID_VERSION }),
      serialized = JSON.stringify(result.payload);
    const existing = run.responses.find((r) => r.questionId === questionId);
    if (existing) {
      if (existing.payload !== serialized)
        throw new AppError('A submitted answer cannot be changed.', 409);
      return view(run); // Exact transport retry is safe, including the final answer.
    }
    if (run.status !== 'in_progress' || run.currentQuestionId !== questionId)
      throw new AppError('This question is no longer active. Resume your assessment.', 409);
    const response = await tx.diagnosticResponse.create({
      data: {
        runId,
        questionId,
        position: run.responses.length,
        payload: serialized,
        correct: result.correct,
        assisted: run.hintUsed,
        misconception:
          result.correct || run.hintUsed || result.payload.text?.toLowerCase() === 'unsure'
            ? null
            : question.optionHypotheses
              ? (question.optionHypotheses[result.payload.selected!] ?? null)
              : run.engineVersion === HYBRID_VERSION
                ? null
                : question.misconception,
        rationale: run.currentRationale,
      },
    });
    const responses = [...run.responses, response],
      selection = selectNext(bank, responses, { version: run.engineVersion, seed: run.id });
    const completed = !selection.questionId;
    const updated = await tx.diagnosticRun.update({
      where: { id: runId },
      data: {
        currentQuestionId: selection.questionId,
        currentRationale: selection.rationale,
        hintUsed: false,
        draft: '{}',
        status: completed ? 'completed' : 'in_progress',
        completedAt: completed ? new Date() : null,
        report: completed
          ? JSON.stringify(makeReport(bank, responses, selection.rationale, run.engineVersion))
          : null,
      },
    });
    return view({ ...updated, responses });
  });
}
export async function saveInteraction(
  sessionId: string,
  runId: string,
  questionId: string,
  action: 'draft' | 'hint',
  answer?: Answer,
) {
  return db.$transaction(async (tx) => {
    const run = await owned(tx, sessionId, runId);
    if (run.status !== 'in_progress' || run.currentQuestionId !== questionId)
      throw new AppError('This question is no longer active. Resume your assessment.', 409);
    const draft = action === 'draft' ? JSON.stringify(answerSchema.parse(answer)) : run.draft;
    const updated = await tx.diagnosticRun.update({
      where: { id: runId },
      data: { draft, hintUsed: run.hintUsed || action === 'hint' },
    });
    return view({ ...updated, responses: run.responses });
  });
}
