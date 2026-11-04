import { createHash } from 'node:crypto';
import { db } from '../db';
import { AppError } from '../errors';
import { batchLesson, publicLesson, type LessonContent } from './content';
import { evaluateStep, learningAnswerSchema, validateLesson } from './evaluation';
import type { LearningAnswer, StudioView } from './types';
import type { Prisma } from '@prisma/client';
import { lessonCatalog, lessonForOrdinal } from './catalog';
import { lessonMastery } from './mastery';
import { lessonNavigation } from './lesson-navigation';
import { buildPathway, PATHWAY_VERSION, type PathwaySnapshot, type PathwayView } from './pathway';
import type { Bank, Report } from '../diagnostic/types';
import { draftPreviewEnabled, STARTER_BANK_PREFIX } from '../diagnostic/starter-v3/bank';
import { LEARNING_SELECTOR_VERSION, selectLearning } from './selector';
import type { PracticeHistory, SavedLearningRecommendation } from './selector-types';

const digest = (v: string) => createHash('sha256').update(v).digest('hex');
export function studioEnabled() {
  try {
    return (
      process.env.LEARNING_STUDIO_ENABLED === 'true' &&
      !process.env.VERCEL &&
      ['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL ?? '').hostname)
    );
  } catch {
    return false;
  }
}
const include = {
  target: { include: { module: true, plan: true } },
  submissions: { orderBy: [{ stepId: 'asc' as const }, { attempt: 'asc' as const }] },
  events: { orderBy: { sequence: 'asc' as const } },
};
type Stored = Prisma.DiagnosticLearningRunGetPayload<{ include: typeof include }>;
function lessonFor(run: Stored): LessonContent {
  const storedModule = run.target.module;
  if (
    digest(storedModule.contentSnapshot) !== storedModule.digest ||
    digest(run.target.plan.recommendationSnapshot) !== run.target.plan.recommendationDigest ||
    !['studio-contracts-1', 'studio-contracts-2'].includes(storedModule.evaluatorVersion) ||
    !['studio-completion-1', 'lesson-mastery-1'].includes(run.policyVersion)
  )
    throw new AppError('This lesson version needs recovery. Your records are preserved.', 409);
  const lesson = JSON.parse(storedModule.contentSnapshot) as LessonContent;
  validateLesson(lesson);
  return lessonForOrdinal(lesson, run.ordinal);
}
function view(run: Stored): StudioView {
  const lesson = lessonFor(run);
  const done = lesson.steps.filter((s) =>
    run.submissions.some((a) => a.stepId === s.id && a.correct),
  );
  const next = lesson.steps.findIndex((s) => !done.some((d) => d.id === s.id));
  return {
    id: run.id,
    ordinal: run.ordinal,
    status: run.status,
    lesson: publicLesson(lesson, next < 0 ? lesson.steps.length - 1 : next),
    currentStepId: run.currentStepId,
    draftRevision: run.draftRevision,
    drafts: JSON.parse(run.draft),
    completed: done.length,
    mastery: lessonMastery(lesson, run.submissions, run.ordinal),
    unlocked: next < 0 ? lesson.steps.length - 1 : next,
    results: [...run.submissions]
      .sort(
        (a, b) =>
          lesson.steps.findIndex((s) => s.id === a.stepId) -
            lesson.steps.findIndex((s) => s.id === b.stepId) || a.attempt - b.attempt,
      )
      .map((a) => ({
        stepId: a.stepId,
        attempt: a.attempt,
        correct: a.correct,
        assisted: a.assisted,
        first: a.first,
        feedback: a.feedback,
        answer: JSON.parse(a.payload),
      })),
    hints: Object.fromEntries(
      run.events
        .filter((e) => e.kind === 'hint')
        .map((e) => [e.stepId, JSON.parse(e.metadata).hint]),
    ),
  };
}
export async function getLearning(sessionId: string, runId?: string, lessonId = batchLesson.id) {
  const session = await db.diagnosticSession.findUnique({ where: { id: sessionId } });
  if (!session || session.expiresAt <= new Date())
    throw new AppError('Your learning session expired.', 401);
  const run = await db.diagnosticLearningRun.findFirst({
    where: {
      ...(runId ? { id: runId } : {}),
      target: {
        ...(!runId ? { module: { sourceId: lessonId } } : {}),
        plan: {
          sessionId,
          kind: { in: ['demonstration', 'standalone-lesson', 'diagnostic-pathway'] },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    include,
  });
  if (runId && !run) throw new AppError('Learning run not found.', 404);
  return run ? view(run) : null;
}

// Uses the same learning service and database; source assessments are read-only.
async function pathwayFor(tx: Prisma.TransactionClient, sessionId: string, sourceRunId: string) {
  const session = await tx.diagnosticSession.findUnique({ where: { id: sessionId } });
  if (!session || session.expiresAt <= new Date())
    throw new AppError('Your learning session expired.', 401);
  const source = await tx.diagnosticRun.findFirst({ where: { id: sourceRunId, sessionId } });
  if (!source) throw new AppError('Assessment not found.', 404);
  if (source.status !== 'completed' || !source.report)
    throw new AppError('Complete this diagnostic before opening its learning pathway.', 409);
  if (source.roleId !== 'python-developer' || digest(source.bankSnapshot) !== source.bankDigest)
    throw new AppError('This assessment needs recovery. Its records are preserved.', 409);
  if (source.bankId.startsWith(STARTER_BANK_PREFIX) && !draftPreviewEnabled())
    throw new AppError('Draft preview is disabled. Saved records are preserved.', 404);
  const plan = await tx.diagnosticLearningPlan.findUnique({
    where: { sourceRunId_mappingVersion: { sourceRunId, mappingVersion: PATHWAY_VERSION } },
  });
  const reportDigest = digest(source.report);
  if (
    plan &&
    (plan.sessionId !== sessionId ||
      plan.kind !== 'diagnostic-pathway' ||
      plan.reportDigest !== reportDigest ||
      digest(plan.recommendationSnapshot) !== plan.recommendationDigest)
  )
    throw new AppError('This learning plan needs recovery. Its records are preserved.', 409);
  const snapshot = plan
    ? (JSON.parse(plan.recommendationSnapshot) as PathwaySnapshot)
    : buildPathway(
        JSON.parse(source.bankSnapshot) as Bank,
        JSON.parse(source.report) as Report,
        sourceRunId,
      );
  return {
    plan,
    snapshot,
    reportDigest,
    bank: JSON.parse(source.bankSnapshot) as Bank,
    report: JSON.parse(source.report) as Report,
  };
}

// A separate adaptive-learning decision, derived exclusively from owned persisted evidence.
// Existing module, report, scoring and immutable practice records are never rewritten.
export async function learningRecommendation(
  sessionId: string,
  sourceRunId: string,
  save = false,
  decisionId?: string,
): Promise<SavedLearningRecommendation> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "DiagnosticSession" WHERE id=${sessionId} FOR UPDATE`;
    const source = await pathwayFor(tx, sessionId, sourceRunId);
    if (decisionId) {
      const stored = await tx.diagnosticLearningPlan.findFirst({
        where: { id: decisionId, sourceRunId, sessionId, kind: 'adaptive-learning' },
      });
      if (!stored) throw new AppError('Learning recommendation not found.', 404);
      if (
        stored.reportDigest !== source.reportDigest ||
        digest(stored.recommendationSnapshot) !== stored.recommendationDigest
      )
        throw new AppError(
          'This learning recommendation needs recovery. Records are preserved.',
          409,
        );
      return {
        recommendation: JSON.parse(stored.recommendationSnapshot),
        saved: true,
        decisionId: stored.id,
      };
    }
    // Serialize with existing starts and submissions without changing those records.
    await tx.$queryRaw`SELECT r.id FROM "DiagnosticLearningRun" r JOIN "DiagnosticLearningTarget" t ON t.id=r."targetId" JOIN "DiagnosticLearningPlan" p ON p.id=t."planId" WHERE p."sessionId"=${sessionId} FOR SHARE OF r`;
    const runs = await tx.diagnosticLearningRun.findMany({
      where: {
        target: {
          plan: {
            sessionId,
            roleId: 'python-developer',
            kind: { in: ['demonstration', 'standalone-lesson', 'diagnostic-pathway'] },
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include,
    });
    const histories: PracticeHistory[] = runs.map((run) => {
      const lesson = lessonFor(run),
        state = view(run);
      return {
        title: lesson.title,
        currentStepTitle: lesson.steps.find((s) => s.id === run.currentStepId)?.title,
        runId: run.id,
        moduleVersionId: run.target.module.id,
        lessonId: lesson.id,
        ordinal: run.ordinal,
        completed: state.completed,
        total: lesson.steps.length,
        currentStepId: run.currentStepId,
        status: run.status,
        hints: run.events.filter((e) => e.kind === 'hint').length,
        createdAt: run.createdAt.toISOString(),
        attempts: run.submissions.map((a) => ({
          stepId: a.stepId,
          attempt: a.attempt,
          first: a.first,
          correct: a.correct,
          assisted: a.assisted,
          at: a.createdAt.toISOString(),
        })),
      };
    });
    const recommendation = selectLearning({
      bank: source.bank,
      report: source.report,
      sourceRunId,
      histories,
      now: new Date().toISOString(),
    });
    // Calendar day + exact persisted evidence + versions pin a repeatable, immutable decision.
    const evidenceDigest = digest(
      JSON.stringify({
        reportDigest: source.reportDigest,
        bankDigest: digest(JSON.stringify(source.bank)),
        histories,
        recommendation,
      }),
    );
    const mappingVersion = `${LEARNING_SELECTOR_VERSION}:${evidenceDigest}`;
    const key = { sourceRunId_mappingVersion: { sourceRunId, mappingVersion } };
    const recommendationSnapshot = JSON.stringify(recommendation);
    const stored = save
      ? await tx.diagnosticLearningPlan.upsert({
          where: key,
          update: {},
          create: {
            sourceRunId,
            sessionId,
            roleId: 'python-developer',
            kind: 'adaptive-learning',
            mappingVersion,
            reportDigest: source.reportDigest,
            recommendationSnapshot,
            recommendationDigest: digest(recommendationSnapshot),
          },
        })
      : await tx.diagnosticLearningPlan.findUnique({ where: key });
    if (
      stored &&
      (stored.sessionId !== sessionId ||
        stored.recommendationSnapshot !== recommendationSnapshot ||
        stored.recommendationDigest !== digest(recommendationSnapshot))
    )
      throw new AppError(
        'This learning recommendation needs recovery. Records are preserved.',
        409,
      );
    return { recommendation, saved: !!stored, ...(stored ? { decisionId: stored.id } : {}) };
  });
}

async function pathwayTarget(
  tx: Prisma.TransactionClient,
  sessionId: string,
  sourceRunId: string,
  pathway: Awaited<ReturnType<typeof pathwayFor>>,
  competencyId: string,
  moduleId: string,
) {
  const recommendationSnapshot = JSON.stringify(pathway.snapshot);
  const plan =
    pathway.plan ??
    (await tx.diagnosticLearningPlan.create({
      data: {
        sessionId,
        sourceRunId,
        roleId: 'python-developer',
        kind: 'diagnostic-pathway',
        mappingVersion: pathway.snapshot.version,
        reportDigest: pathway.reportDigest,
        recommendationSnapshot,
        recommendationDigest: digest(recommendationSnapshot),
      },
    }));
  const position = pathway.snapshot.items.findIndex((i) => i.competencyId === competencyId);
  const recommendation = pathway.snapshot.items[position];
  return tx.diagnosticLearningTarget.upsert({
    where: { planId_position: { planId: plan.id, position } },
    update: {},
    create: {
      planId: plan.id,
      position,
      moduleVersionId: moduleId,
      objective: recommendation.subskill ?? recommendation.name,
      coverage: recommendation.coverage,
    },
  });
}

export async function getLearningPathway(
  sessionId: string,
  sourceRunId: string,
): Promise<PathwayView> {
  return db.$transaction(async (tx) => {
    const { plan, snapshot } = await pathwayFor(tx, sessionId, sourceRunId);
    return {
      ...snapshot,
      saved: !!plan,
      items: await Promise.all(
        snapshot.items.map(async (item) => {
          if (!item.moduleVersionId) return item;
          const run = await tx.diagnosticLearningRun.findFirst({
            where: { target: { moduleVersionId: item.moduleVersionId, plan: { sessionId } } },
            orderBy: [{ ordinal: 'desc' }, { createdAt: 'desc' }],
            include,
          });
          if (!run) return item;
          const state = view(run);
          return {
            ...item,
            progress: {
              runId: state.id,
              completed: state.completed,
              total: state.lesson.steps.length,
              status: state.status,
            },
          };
        }),
      ),
    };
  });
}

export async function startLearning(
  sessionId: string,
  restart = false,
  lessonId = batchLesson.id,
  source?: { sourceRunId: string; competencyId: string },
) {
  const selectedLesson = Object.hasOwn(lessonCatalog, lessonId)
    ? lessonCatalog[lessonId]
    : undefined;
  if (!selectedLesson) throw new AppError('Lesson not found.', 404);
  const kind = selectedLesson.masteryPolicy ? 'standalone-lesson' : 'demonstration';
  validateLesson(selectedLesson);
  const id = await db.$transaction(async (tx) => {
    const session = await tx.diagnosticSession.findUnique({ where: { id: sessionId } });
    if (!session || session.expiresAt <= new Date())
      throw new AppError('Enter the diagnostic session first.', 401);
    await tx.$queryRaw`SELECT id FROM "DiagnosticSession" WHERE id = ${sessionId} FOR UPDATE`;
    const moduleId = `${selectedLesson.id}@${selectedLesson.version}`;
    let pathway = source ? await pathwayFor(tx, sessionId, source.sourceRunId) : undefined;
    if (
      source &&
      pathway &&
      source.competencyId === `course:${lessonId}` &&
      Object.hasOwn(lessonNavigation, lessonId)
    ) {
      const version = `instructional-course-1/${moduleId}`;
      const oldPlan = await tx.diagnosticLearningPlan.findUnique({
        where: {
          sourceRunId_mappingVersion: { sourceRunId: source.sourceRunId, mappingVersion: version },
        },
      });
      if (
        oldPlan &&
        (oldPlan.sessionId !== sessionId ||
          oldPlan.reportDigest !== pathway.reportDigest ||
          digest(oldPlan.recommendationSnapshot) !== oldPlan.recommendationDigest)
      )
        throw new AppError('This course plan needs recovery. Records are preserved.', 409);
      const snapshot: PathwaySnapshot = oldPlan
        ? JSON.parse(oldPlan.recommendationSnapshot)
        : {
            version,
            sourceRunId: source.sourceRunId,
            noAssessmentCredit: true,
            items: [
              {
                competencyId: source.competencyId,
                name: selectedLesson.title,
                status: 'Instructional activity',
                priority: false,
                reason:
                  'An explicit learning activity chosen from the owned completed report. It does not relabel diagnostic findings.',
                moduleSkillId: lessonId,
                prerequisites: selectedLesson.prerequisites,
                moduleVersionId: moduleId,
                lessonTitle: selectedLesson.title,
                coverage: 'Versioned instruction and practice; no assessment proficiency credit.',
              },
            ],
          };
      pathway = { ...pathway, plan: oldPlan, snapshot };
    }
    const recommendation = pathway?.snapshot.items.find(
      (i) => i.competencyId === source?.competencyId,
    );
    if (source && (!recommendation || recommendation.moduleVersionId !== moduleId))
      throw new AppError('No approved interactive mapping for this finding.', 409);
    const contentSnapshot = JSON.stringify(selectedLesson);
    const storedModule = await tx.learningModuleVersion.upsert({
      where: { id: moduleId },
      update: {},
      create: {
        id: moduleId,
        sourceId: selectedLesson.id,
        version: selectedLesson.version,
        roleId: selectedLesson.roleId,
        schemaVersion: 1,
        contentSnapshot,
        digest: digest(contentSnapshot),
        evaluatorVersion: selectedLesson.evaluatorVersion,
        reviewState: 'development-demonstration',
      },
    });
    if (
      storedModule.digest !== digest(contentSnapshot) ||
      storedModule.contentSnapshot !== contentSnapshot
    )
      throw new AppError('Publish changed lesson content under a new version.', 409);
    let target =
      source && pathway && recommendation
        ? await pathwayTarget(
            tx,
            sessionId,
            source.sourceRunId,
            pathway,
            recommendation.competencyId,
            moduleId,
          )
        : await tx.diagnosticLearningTarget.findFirst({
            where: { moduleVersionId: moduleId, plan: { sessionId, kind } },
          });
    if (!target) {
      const recommendationSnapshot = JSON.stringify({
        kind,
        lessonId: selectedLesson.id,
        noAssessmentCredit: true,
      });
      const plan = await tx.diagnosticLearningPlan.create({
        data: {
          sessionId,
          kind,
          roleId: 'python-developer',
          mappingVersion: 'studio-demo-1',
          recommendationSnapshot,
          recommendationDigest: digest(recommendationSnapshot),
        },
      });
      target = await tx.diagnosticLearningTarget.create({
        data: {
          planId: plan.id,
          position: 0,
          moduleVersionId: storedModule.id,
          objective: selectedLesson.objectives[0],
          coverage: selectedLesson.masteryPolicy ? 'lesson-only' : 'demonstration-only',
        },
      });
    }
    const old = await tx.diagnosticLearningRun.findFirst({
      // One owned lesson history across standalone and report-derived entry points.
      // This prevents a new report from resetting fresh-form/mastery ordinals.
      where: { target: { moduleVersionId: moduleId, plan: { sessionId } } },
      orderBy: [{ ordinal: 'desc' }, { createdAt: 'desc' }],
    });
    const finalAttempt =
      old && selectedLesson.masteryPolicy
        ? await tx.diagnosticLearningSubmission.findFirst({
            where: { runId: old.id, stepId: selectedLesson.masteryPolicy.finalStepId, first: true },
          })
        : null;
    if (old && (!restart || (old.status !== 'completed' && !finalAttempt))) return old.id;
    return (
      await tx.diagnosticLearningRun.create({
        data: {
          targetId: target.id,
          ordinal: (old?.ordinal ?? 0) + 1,
          currentStepId: selectedLesson.steps[0].id,
          policyVersion: selectedLesson.masteryPolicy?.version ?? 'studio-completion-1',
        },
      })
    ).id;
  });
  return (await getLearning(sessionId, id))!;
}

export type LearningAction = {
  runId: string;
  stepId: string;
  action: 'draft' | 'visit' | 'hint' | 'evaluate' | 'submit';
  answer?: LearningAnswer;
  revision?: number;
  requestId: string;
};
export async function learningAction(sessionId: string, input: LearningAction) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT r.id FROM "DiagnosticLearningRun" r JOIN "DiagnosticLearningTarget" t ON t.id=r."targetId" JOIN "DiagnosticLearningPlan" p ON p.id=t."planId" WHERE r.id=${input.runId} AND p."sessionId"=${sessionId} FOR UPDATE OF r`;
    const run = await tx.diagnosticLearningRun.findFirst({
      where: { id: input.runId, target: { plan: { sessionId } } },
      include,
    });
    if (!run) throw new AppError('Learning run not found.', 404);
    const session = await tx.diagnosticSession.findUnique({ where: { id: sessionId } });
    if (!session || session.expiresAt <= new Date())
      throw new AppError('Your learning session expired.', 401);
    const lesson = lessonFor(run),
      index = lesson.steps.findIndex((s) => s.id === input.stepId),
      step = lesson.steps[index];
    if (!step) throw new AppError('Lesson step not found.', 404);
    const requestHash = digest(
      JSON.stringify({
        action: input.action,
        stepId: input.stepId,
        answer: input.answer ?? null,
        revision: input.revision ?? null,
      }),
    );
    const replay = run.events.find((e) => e.idempotencyKey === input.requestId);
    if (replay) {
      const saved = JSON.parse(replay.metadata);
      if (saved.requestHash !== requestHash)
        throw new AppError('This request ID was used for a different action.', 409);
      return { run: view(run), evaluation: saved.evaluation };
    }
    if (index > view(run).unlocked) throw new AppError('Complete the preceding steps first.', 409);
    if (run.status === 'completed' && input.action !== 'visit')
      throw new AppError('This practice run is complete. Start a new practice run to retry.', 409);
    if (input.action !== 'visit' && input.stepId !== run.currentStepId)
      throw new AppError('This step is no longer active. Resume before saving.', 409);
    let evaluation:
      | {
          correct: boolean;
          feedback: string;
          passed?: number;
          total?: number;
          score?: number;
          response?: string;
        }
      | undefined;
    let hint: string | undefined;
    if (input.action === 'draft') {
      if (input.revision !== run.draftRevision)
        throw new AppError('A newer draft exists. Reload to resume it.', 409);
      const drafts = JSON.parse(run.draft);
      drafts[step.id] = learningAnswerSchema.parse(input.answer);
      if (JSON.stringify(drafts).length > 48000)
        throw new AppError('Lesson drafts are too large.', 413);
      await tx.diagnosticLearningRun.update({
        where: { id: run.id },
        data: { draft: JSON.stringify(drafts), draftRevision: { increment: 1 } },
      });
    } else if (input.action === 'visit') {
      await tx.diagnosticLearningRun.update({
        where: { id: run.id },
        data: { currentStepId: step.id, draftRevision: { increment: 1 } },
      });
    } else if (input.action === 'hint') {
      if (step.kind === 'mastery')
        throw new AppError(
          'The independent final check has no hints. Review earlier steps before attempting it.',
          409,
        );
      const usedHints = run.events.filter((e) => e.stepId === step.id && e.kind === 'hint').length;
      hint = step.hints?.[Math.min(usedHints, step.hints.length - 1)] ?? step.hint;
    } else {
      if (input.action === 'evaluate' && step.kind !== 'execution')
        throw new AppError('Only the guided coding step supports execution evaluation.', 422);
      const result = evaluateStep(step, input.answer ?? {});
      evaluation = { correct: result.correct, feedback: result.feedback };
      if (step.kind === 'execution') {
        const { gradeTask } = await import('../authentic/grading');
        const execution = gradeTask(step.privateTask!, result.answer.execution!);
        evaluation = { ...execution, correct: result.correct, feedback: result.feedback };
      }
      if (input.action === 'submit') {
        const previous = run.submissions.filter((a) => a.stepId === step.id);
        await tx.diagnosticLearningSubmission.create({
          data: {
            runId: run.id,
            stepId: step.id,
            attempt: previous.length + 1,
            idempotencyKey: input.requestId,
            payloadHash: digest(JSON.stringify(result.answer)),
            payload: JSON.stringify(result.answer),
            correct: result.correct,
            // This is guided learning: prior example/retry/execution exposure is never independent mastery.
            assisted:
              previous.length > 0 ||
              (lesson.masteryPolicy ? !step.independent : index > 0) ||
              run.events.some((e) => e.stepId === step.id && ['hint', 'evaluate'].includes(e.kind)),
            first: previous.length === 0,
            feedback: result.feedback,
          },
        });
        const complete = lesson.steps.every((s) =>
          s.id === step.id
            ? result.correct || run.submissions.some((a) => a.stepId === s.id && a.correct)
            : run.submissions.some((a) => a.stepId === s.id && a.correct),
        );
        const drafts = JSON.parse(run.draft);
        drafts[step.id] = result.answer;
        await tx.diagnosticLearningRun.update({
          where: { id: run.id },
          data: {
            draft: JSON.stringify(drafts),
            draftRevision: { increment: 1 },
            ...(complete ? { status: 'completed', completedAt: new Date() } : {}),
          },
        });
      }
    }
    await tx.diagnosticLearningEvent.create({
      data: {
        runId: run.id,
        stepId: step.id,
        sequence: run.events.length,
        kind: input.action,
        idempotencyKey: input.requestId,
        metadata: JSON.stringify({
          requestHash,
          ...(hint ? { hint } : {}),
          ...(evaluation ? { evaluation } : {}),
        }),
      },
    });
    return {
      run: view(
        await tx.diagnosticLearningRun.findUniqueOrThrow({ where: { id: run.id }, include }),
      ),
      evaluation,
    };
  });
}
