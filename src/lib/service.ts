import { roleCatalog, roleConfig } from './role-catalog';
import { db } from './db';
import { mastery, planGaps, readiness, readinessLabel, scoreAssessment } from './engine';
import { provider } from './provider';
import type { DemoState, Item, LessonContent, Option, Score, Skill, CohortView } from './types';
import { AppError } from './errors';
export { AppError } from './errors';
import { ensurePublishedPythonBanks, publicBank, publicRepair } from './authentic/service';
import { pythonRepairs, pythonBanks } from './authentic/python-banks';
import { scoreEvidence, strength } from './authentic/grading';
import type { AssessmentBank, EvidenceSummary, RepairModule } from './authentic/types';
export async function getSkills(roleId = 'data-analyst'): Promise<Skill[]> {
  checkedRole(roleId);
  const rows = await db.roleSkillRequirement.findMany({
    where: { roleId },
    include: { skill: { include: { category: true } } },
  });
  return rows.map((r) => ({
    id: r.skillId,
    name: r.skill.name,
    description: r.skill.description,
    category: r.skill.category.name,
    prerequisites: JSON.parse(r.skill.prerequisites),
    target: r.target,
    importance: r.importance,
  }));
}
function checkedRole(roleId: string) {
  if (!roleCatalog.some((r) => r.id === roleId)) throw new AppError('Unknown target role.');
  return roleConfig(roleId);
}
async function activeRole(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Your demo session has expired. Start a new student demo.', 401);
  return checkedRole(user.selectedRoleId);
}
export async function selectRole(userId: string, roleId: string) {
  checkedRole(roleId);
  await activeRole(userId);
  await db.user.update({ where: { id: userId }, data: { selectedRoleId: roleId } });
}
export async function createStudent(name: string, roleId = 'data-analyst') {
  checkedRole(roleId);
  return db.user.create({ data: { name, selectedRoleId: roleId } });
}
export async function getState(userId: string): Promise<DemoState> {
  const role = await activeRole(userId);
  const roleId = role.id;
  const lessonScope = { skill: { requirements: { some: { roleId } } } };
  const [user, skills, assessments, attempts, lessons, progress, employer] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true } }),
    getSkills(roleId),
    db.assessment.findMany({
      where: { roleId },
      include: {
        scenarios: {
          orderBy: { position: 'asc' },
          include: { questions: { orderBy: { position: 'asc' }, include: { mappings: true } } },
        },
      },
    }),
    db.assessmentAttempt.findMany({
      where: { userId, assessment: { roleId } },
      orderBy: { startedAt: 'asc' },
      include: {
        assessment: true,
        bank: true,
        evidence: { orderBy: { answeredAt: 'asc' } },
        answers: {
          orderBy: [
            { question: { scenario: { position: 'asc' } } },
            { question: { position: 'asc' } },
          ],
          include: { question: true },
        },
        scores: true,
      },
    }),
    db.lesson.findMany({ where: lessonScope }),
    db.lessonProgress.findMany({
      where: { userId, lesson: lessonScope },
      include: { answers: { orderBy: { answeredAt: 'asc' } }, lesson: true },
    }),
    db.employerProfile.findUniqueOrThrow({
      where: { id: role.employerId },
      include: { requirements: true },
    }),
  ]);
  const scenarios = Object.fromEntries(
    assessments.map((a) => [
      a.kind,
      a.scenarios.map((s) => ({
        id: s.id,
        title: s.title,
        stakeholder: s.stakeholder,
        stakeholderRole: s.stakeholderRole,
        company: s.company,
        brief: s.brief,
        data: s.data,
        items: s.questions.map((q) => ({
          id: q.id,
          phase: q.phase,
          prompt: q.prompt,
          context: q.context,
          options: (JSON.parse(q.options) as Option[]).map((o) => ({ text: o.text, response: '' })),
          skills: q.mappings.map((m) => ({ skillId: m.skillId, weight: m.weight })),
        })),
      })),
    ]),
  ) as DemoState['scenarios'];
  const repairRuns =
    roleId === 'python-developer'
      ? await db.repairRun.findMany({
          where: { userId },
          include: { answers: { orderBy: { answeredAt: 'asc' } } },
        })
      : [];
  return {
    repairs: roleId === 'python-developer' ? pythonRepairs.map(publicRepair) : [],
    repairProgress: repairRuns.map((r) => {
      const repairModule = JSON.parse(r.contentSnapshot) as RepairModule;
      return {
        id: r.id,
        skillId: r.skillId,
        status: r.status,
        mode: r.mode,
        run: r.run,
        module: publicRepair(repairModule),
        answers: r.answers
          .filter((a) => a.run === r.run)
          .map((a) => {
            const task = repairModule.tasks.find((t) => t.id === a.taskId)!;
            return {
              taskId: a.taskId,
              payload: JSON.parse(a.payload),
              score: a.score,
              response: a.response,
              type: task.type,
              scenario: task.scenario,
              transfer: task.transfer,
              first: a.first,
            };
          }),
      };
    }),
    role,
    roles: roleCatalog,
    user,
    skills,
    scenarios,
    attempts: attempts.map((a) => ({
      id: a.id,
      bankId: a.bankId,
      assessmentVersion: a.assessmentVersion,
      contentVersion: a.contentVersion,
      skillSnapshot: a.skillSnapshot ? JSON.parse(a.skillSnapshot) : undefined,
      bank: a.bank ? publicBank(JSON.parse(a.bank.content), a.evidence) : undefined,
      evidence: a.evidence.map((e) => ({
        taskId: e.taskId,
        payload: JSON.parse(e.payload),
        score: e.score,
        response: e.response,
        type: e.taskType as import('./authentic/types').TaskType,
        scenario: e.scenario,
        transfer: e.transfer,
      })),
      kind: a.assessment.kind,
      status: a.status,
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
      score: a.score,
      answers: a.bank
        ? a.evidence.map((e) => ({ questionId: e.taskId, selected: 0, response: e.response }))
        : a.answers.map((x) => ({
            questionId: x.questionId,
            selected: x.selected,
            response: (JSON.parse(x.question.options) as Option[])[x.selected].response,
          })),
      scores: a.scores.map((s) => ({
        skillId: s.skillId,
        score: s.score,
        evidence: s.evidence,
        quality: s.quality ? (JSON.parse(s.quality) as EvidenceSummary) : undefined,
      })),
    })),
    lessons: lessons.map((l) => {
      const content = JSON.parse(l.content) as LessonContent;
      return {
        ...l,
        content: {
          ...content,
          items: content.items.map((i) => ({ id: i.id, prompt: i.prompt, options: i.options })),
        },
      };
    }),
    progress: progress.map((p) => {
      const content = JSON.parse(p.lesson.content) as LessonContent;
      return {
        lessonId: p.lessonId,
        mode: p.mode,
        run: p.run,
        status: p.status,
        answered: p.answers
          .filter((a) => a.run === p.run)
          .map((a) => ({
            itemId: a.itemId,
            selected: a.selected,
            correct: a.correct,
            first: a.first,
            explanation: content.items.find((i) => i.id === a.itemId)?.explanation ?? '',
          })),
      };
    }),
    employer: {
      name: employer.name,
      description: employer.description,
      requirements: employer.requirements.map((r) => ({ skillId: r.skillId, target: r.target })),
    },
  };
}
export async function startAssessment(
  userId: string,
  kind: 'diagnostic' | 'reassessment',
  expectedRoleId?: string,
) {
  const role = await activeRole(userId);
  if (role.id === 'python-developer') await ensurePublishedPythonBanks();
  if (expectedRoleId && role.id !== expectedRoleId)
    throw new AppError('Your target role changed. Refresh before starting an assessment.', 409);
  const assessmentId = role.assessmentIds[kind];
  const skillSnapshot = JSON.stringify(await getSkills(role.id));
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const currentUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (currentUser.selectedRoleId !== role.id)
      throw new AppError('Your target role changed. Refresh before starting.', 409);
    const existing = await tx.assessmentAttempt.findFirst({
      where: { userId, assessmentId, status: 'in_progress' },
    });
    if (existing) return existing.id;
    const baseline = await tx.assessmentAttempt.findFirst({
      where: { userId, assessmentId: role.assessmentIds.diagnostic, status: 'complete' },
    });
    if (kind === 'reassessment' && !baseline)
      throw new AppError('Complete a diagnostic before reassessment.');
    if (kind === 'diagnostic' && baseline)
      throw new AppError(
        'Your baseline is already recorded. Use reassessment to verify current skills.',
      );
    const banks = await tx.assessmentBank.findMany({
      where: {
        roleId: role.id,
        kind,
        ...(role.id === 'python-developer' ? { id: { in: pythonBanks.map((b) => b.id) } } : {}),
      },
      orderBy: { id: 'asc' },
    });
    const previous = await tx.assessmentAttempt.findFirst({
      where: { userId, assessmentId, bankId: { not: null } },
      orderBy: { startedAt: 'desc' },
    });
    // Stable learner-specific starting variant, then cycle through every published bank.
    const offset = [...userId].reduce((n, c) => n + c.charCodeAt(0), 0);
    const bank = banks.length
      ? banks[
          previous
            ? (banks.findIndex((b) => b.id === previous.bankId) + 1) % banks.length
            : offset % banks.length
        ]
      : undefined;
    return (
      await tx.assessmentAttempt.create({
        data: {
          userId,
          assessmentId,
          roleIdSnapshot: role.id,
          skillSnapshot,
          bankId: bank?.id,
          assessmentVersion: bank?.version ?? 'legacy-v1',
          contentVersion: bank?.contentVersion ?? 'legacy-v1',
        },
      })
    ).id;
  });
}
export async function answerAssessment(
  userId: string,
  attemptId: string,
  questionId: string,
  selected: number,
) {
  const session = await db.user.findUnique({
    where: { id: userId },
    select: { selectedRoleId: true },
  });
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "AssessmentAttempt" WHERE "id" = ${attemptId} FOR UPDATE`;
    const attempt = await tx.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        answers: true,
        bank: true,
        evidence: true,
        assessment: {
          include: {
            scenarios: {
              orderBy: { position: 'asc' },
              include: { questions: { orderBy: { position: 'asc' } } },
            },
          },
        },
      },
    });
    if (!attempt) throw new AppError('Assessment not found.', 404);
    if (attempt.assessment.roleId !== session?.selectedRoleId)
      throw new AppError(
        'This assessment belongs to another target role. Switch back to continue.',
        409,
      );
    if (attempt.bankId) throw new AppError('Use the versioned task endpoint for this assessment.');
    if (attempt.status !== 'in_progress')
      throw new AppError('This assessment has already been submitted.', 409);
    const questions = attempt.assessment.scenarios.flatMap((s) => s.questions);
    const previous = attempt.answers.find((a) => a.questionId === questionId);
    if (previous) {
      if (previous.selected !== selected)
        throw new AppError('Submitted actions cannot be changed.', 409);
      const q = questions.find((q) => q.id === questionId)!;
      return { response: (JSON.parse(q.options) as Option[])[selected].response };
    }
    const q = questions[attempt.answers.length];
    if (!q || q.id !== questionId) throw new AppError('Please complete the actions in order.');
    const options = JSON.parse(q.options) as Option[];
    if (!options[selected]) throw new AppError('Choose a valid response.');
    await tx.assessmentAnswer.create({
      data: {
        attemptId,
        questionId,
        selected,
        correct: q.correct === selected,
        score: q.correct === selected ? 1 : 0,
      },
    });
    return { response: options[selected].response };
  });
}
export async function completeAssessment(userId: string, attemptId: string) {
  const role = await activeRole(userId);
  const skills = await getSkills(role.id);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "AssessmentAttempt" WHERE "id" = ${attemptId} FOR UPDATE`;
    const attempt = await tx.assessmentAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        answers: true,
        bank: true,
        evidence: true,
        assessment: {
          include: { scenarios: { include: { questions: { include: { mappings: true } } } } },
        },
      },
    });
    if (!attempt) throw new AppError('Assessment not found.', 404);
    if (attempt.assessment.roleId !== role.id)
      throw new AppError(
        'This assessment belongs to another target role. Switch back to submit.',
        409,
      );
    if (attempt.status === 'complete') return attemptId;
    if (attempt.bank) {
      const bank = JSON.parse(attempt.bank.content) as AssessmentBank;
      if (attempt.evidence.length !== bank.tasks.length)
        throw new AppError('Finish all workplace tasks before submitting.');
      const snapshot = attempt.skillSnapshot
        ? (JSON.parse(attempt.skillSnapshot) as Skill[])
        : skills;
      const scores = scoreEvidence(bank.tasks, attempt.evidence, snapshot);
      const earlier = await tx.taskEvidence.findMany({
        where: {
          attempt: { userId, status: 'complete', assessment: { roleId: role.id } },
          taskId: { notIn: attempt.evidence.map((e) => e.taskId) },
        },
      });
      for (const score of scores) {
        const all = [...earlier, ...attempt.evidence].filter((e) =>
          (JSON.parse(e.mappings) as { skillId: string }[]).some(
            (m) => m.skillId === score.skillId,
          ),
        );
        const unique = [...new Map(all.map((e) => [e.taskId, e])).values()];
        score.quality = {
          ...strength(unique.length, {
            types: [
              ...new Set(unique.map((e) => e.taskType)),
            ] as import('./authentic/types').TaskType[],
            scenarios: [...new Set(unique.map((e) => e.scenario))],
            transfer: unique.filter((e) => e.transfer).length,
            independent: unique.filter((e) => e.taskType !== 'decision').length,
          }),
          cumulativeCount: unique.length,
        };
      }
      await tx.skillScore.createMany({
        data: scores.map(({ quality, ...score }) => ({
          ...score,
          attemptId,
          quality: JSON.stringify(quality),
        })),
      });
      await tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: { status: 'complete', completedAt: new Date(), score: readiness(scores, snapshot) },
      });
      await tx.learningPath.create({
        data: {
          userId,
          attemptId,
          skillIds: JSON.stringify(planGaps(scores, snapshot).map((g) => g.id)),
        },
      });
      await tx.readinessReport.create({
        data: { attemptId, indicator: readinessLabel(scores, snapshot) },
      });
      return attemptId;
    }
    const questions = attempt.assessment.scenarios.flatMap((s) => s.questions);
    if (attempt.answers.length !== questions.length)
      throw new AppError('Finish all simulation actions before submitting.');
    const items: Pick<Item, 'id' | 'correct' | 'skills'>[] = questions.map((q) => ({
      id: q.id,
      correct: q.correct,
      skills: q.mappings.map((m) => ({ skillId: m.skillId, weight: m.weight })),
    }));
    const scores = scoreAssessment(items, attempt.answers, skills);
    await tx.skillScore.createMany({
      data: scores.map(({ quality, ...score }) => ({
        ...score,
        attemptId,
        quality: quality ? JSON.stringify(quality) : undefined,
      })),
    });
    await tx.assessmentAttempt.update({
      where: { id: attemptId },
      data: { status: 'complete', completedAt: new Date(), score: readiness(scores, skills) },
    });
    await tx.learningPath.create({
      data: {
        userId,
        attemptId,
        skillIds: JSON.stringify(planGaps(scores, skills).map((g) => g.id)),
      },
    });
    await tx.readinessReport.create({
      data: { attemptId, indicator: readinessLabel(scores, skills) },
    });
    return attemptId;
  });
}
async function roleLesson(userId: string, lessonId: string) {
  const role = await activeRole(userId);
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, skill: { requirements: { some: { roleId: role.id } } } },
  });
  if (!lesson) throw new AppError('Lesson not found for your target role.', 404);
  const baseline = await db.assessmentAttempt.findFirst({
    where: { userId, assessmentId: role.assessmentIds.diagnostic, status: 'complete' },
  });
  if (!baseline) throw new AppError('Take the diagnostic first.');
  return lesson;
}
export async function lessonAction(
  userId: string,
  lessonId: string,
  mode: 'interactive' | 'structured',
  restart = false,
) {
  await roleLesson(userId, lessonId);
  return db.$transaction(async (tx) => {
    const old = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    if (old)
      return tx.lessonProgress.update({
        where: { id: old.id },
        data: { mode, ...(restart ? { run: old.run + 1, status: 'started' } : {}) },
      });
    return tx.lessonProgress.create({ data: { userId, lessonId, mode } });
  });
}
export async function practiceAction(
  userId: string,
  lessonId: string,
  itemId: string,
  selected?: number,
) {
  const l = await roleLesson(userId, lessonId);
  const content = JSON.parse(l.content) as LessonContent;
  const item = content.items.find((i) => i.id === itemId);
  if (!item) throw new AppError('Practice item not found.', 404);
  if (selected === undefined) return { hint: await provider.hint(item) };
  if (!item.options[selected]) throw new AppError('Choose a valid answer.');
  const explanation = await provider.explain(item);
  return db.$transaction(async (tx) => {
    const progress = await tx.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      include: { answers: true },
    });
    if (!progress) throw new AppError('Start the lesson first.');
    const current = progress.answers.filter((a) => a.run === progress.run);
    const first = !current.some((a) => a.itemId === itemId);
    if (first) {
      const next = content.items.find((i) => !current.some((a) => a.itemId === i.id));
      if (next?.id !== itemId) throw new AppError('Complete practice in order.');
    }
    const correct = item.correct === selected;
    const a = await tx.practiceAnswer.create({
      data: { progressId: progress.id, run: progress.run, itemId, selected, correct, first },
    });
    const result = mastery(content.items, [...current, a]);
    await tx.lessonProgress.update({
      where: { id: progress.id },
      data: {
        status: result.mastered ? 'mastered' : result.complete ? 'needs-practice' : 'started',
      },
    });
    return { correct, explanation, mastery: result };
  });
}
export async function cohortState(roleId = 'data-analyst'): Promise<CohortView> {
  const role = checkedRole(roleId);
  const [cohort, skills] = await Promise.all([
    db.cohort.findUniqueOrThrow({
      where: { id: role.cohortId },
      include: { college: true, members: { orderBy: { alias: 'asc' } } },
    }),
    getSkills(roleId),
  ]);
  return {
    role,
    roles: roleCatalog,
    college: cohort.college.name,
    cohort: cohort.name,
    skills,
    members: cohort.members.map((m) => ({
      alias: m.alias,
      diagnosed: m.diagnosed,
      initialScores: JSON.parse(m.initialScores) as Score[],
      currentScores: JSON.parse(m.currentScores) as Score[],
      modulesCompleted: m.modulesCompleted,
      modulesAssigned: m.modulesAssigned,
    })),
  };
}
export async function reviewAttempt(userId: string, attemptId: string) {
  const role = await activeRole(userId);
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id: attemptId, userId, status: 'complete', assessment: { roleId: role.id } },
    include: {
      bank: true,
      evidence: { orderBy: { answeredAt: 'asc' } },
      answers: {
        orderBy: [
          { question: { scenario: { position: 'asc' } } },
          { question: { position: 'asc' } },
        ],
        include: { question: { include: { scenario: true } } },
      },
    },
  });
  if (!attempt) throw new AppError('Submit the assessment before reviewing answers.', 404);
  if (attempt.bank) {
    const bank = JSON.parse(attempt.bank.content) as AssessmentBank;
    return attempt.evidence.map((e) => {
      const task = bank.tasks.find((t) => t.id === e.taskId)!;
      return {
        questionId: e.taskId,
        prompt: task.prompt,
        scenario: bank.scenarios.find((s) => s.id === task.scenario)!.title,
        selected: task.cases
          ? 'Submitted Python implementation'
          : JSON.stringify(JSON.parse(e.payload)),
        correct: e.score >= 0.75,
        explanation: task.explanation,
        answeredAt: e.answeredAt.toISOString(),
      };
    });
  }
  return attempt.answers.map((a) => ({
    questionId: a.questionId,
    prompt: a.question.prompt,
    scenario: a.question.scenario.title,
    selected: (JSON.parse(a.question.options) as Option[])[a.selected].text,
    correct: a.correct,
    explanation: a.question.explanation,
    answeredAt: a.answeredAt.toISOString(),
  }));
}
