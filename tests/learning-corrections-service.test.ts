import { beforeAll, afterAll, expect, it } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { db } from '../src/lib/db';
import { enter, sessionFor } from '../src/lib/diagnostic/service';
import {
  getLearning,
  startLearning,
  learningAction,
  learningRecommendation,
} from '../src/lib/learning-studio/service';
import {
  divisionLesson,
  loopsLesson,
  transferLesson,
} from '../src/lib/learning-studio/correction-lessons';
import { selectLearningV1 } from '../src/lib/learning-studio/selector';
import { simulationBank, simulationReport } from './fixtures/learning-profiles';
let sid: string, foreign: string;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.endsWith('_test'))
    throw Error('Isolated test database required');
  sid = (await sessionFor(await enter('Correction synthetic'))).id;
  foreign = (await sessionFor(await enter('Correction foreign'))).id;
});
afterAll(() => db.$disconnect());
it('F: resumes exact saved step, drafts and hint levels; invalid format never consumes an attempt', async () => {
  const start = await startLearning(sid, false, divisionLesson.id);
  let run = start;
  const action = async (
    action: 'visit' | 'submit' | 'draft' | 'hint',
    stepId: string,
    answer?: object,
  ) =>
    learningAction(sid, {
      action,
      runId: run.id,
      stepId,
      requestId: randomUUID(),
      answer,
      revision: run.draftRevision,
    });
  for (const step of divisionLesson.steps.slice(0, 3)) {
    await action('visit', step.id);
    await action('submit', step.id, step.key);
    run = (await getLearning(sid, run.id))!;
  }
  const step = divisionLesson.steps.find((s) => s.id === 'division-float')!;
  await action('visit', step.id);
  run = (await getLearning(sid, run.id))!;
  await action('draft', step.id, { text: '6' });
  run = (await getLearning(sid, run.id))!;
  const before = await db.diagnosticLearningSubmission.count({ where: { runId: run.id } });
  await expect(action('submit', step.id, { text: '6' })).rejects.toThrow('exactly 1');
  expect(await db.diagnosticLearningSubmission.count({ where: { runId: run.id } })).toBe(before);
  const restored = (await getLearning(sid, run.id))!;
  expect(restored.currentStepId).toBe(step.id);
  expect(restored.drafts[step.id]).toEqual({ text: '6' });
  expect(restored.completed).toBe(3);
  await expect(getLearning(foreign, run.id)).rejects.toThrow('not found');
  await action('visit', 'division-rebind');
  const h1 = await action('hint', 'division-rebind'),
    h2 = await action('hint', 'division-rebind');
  expect(h1.run.hints['division-rebind']).not.toBe(h2.run.hints['division-rebind']);
  await action('visit', step.id);
  await action('hint', step.id);
  await action('submit', step.id, step.key);
  const saved = await db.diagnosticLearningSubmission.findFirstOrThrow({
    where: { runId: run.id, stepId: step.id },
  });
  expect(saved.assisted).toBe(true);
});
it('binds new instructional activities to an owned completed source without rewriting reports or old plans', async () => {
  const snapshot = JSON.stringify(simulationBank),
    report = JSON.stringify(simulationReport(true));
  const source = await db.diagnosticRun.create({
    data: {
      sessionId: sid,
      roleId: 'python-developer',
      status: 'completed',
      completedAt: new Date(),
      bankId: simulationBank.id,
      bankSnapshot: snapshot,
      bankDigest: createHash('sha256').update(snapshot).digest('hex'),
      report,
      engineVersion: 'rules-3.0.0',
      currentRationale: 'Synthetic preserved report',
    },
  });
  const before = await db.diagnosticRun.findUniqueOrThrow({
    where: { id: source.id },
    include: { responses: true },
  });
  const oldDecision = selectLearningV1({
    bank: simulationBank,
    report: simulationReport(true),
    sourceRunId: source.id,
    histories: [],
    now: '2026-11-03T00:00:00Z',
  });
  const oldSnapshot = JSON.stringify(oldDecision),
    hash = (v: string) => createHash('sha256').update(v).digest('hex');
  const archived = await db.diagnosticLearningPlan.create({
    data: {
      sessionId: sid,
      roleId: 'python-developer',
      kind: 'adaptive-learning',
      sourceRunId: source.id,
      mappingVersion: 'learning-revision-1-draft.1:synthetic',
      reportDigest: hash(report),
      recommendationSnapshot: oldSnapshot,
      recommendationDigest: hash(oldSnapshot),
    },
  });
  const historical = await learningRecommendation(sid, source.id, false, archived.id);
  expect(historical.recommendation).toEqual(oldDecision);
  expect(historical.recommendation.category).toBeUndefined();
  await learningRecommendation(sid, source.id, true);
  expect(await db.diagnosticLearningPlan.findUniqueOrThrow({ where: { id: archived.id } })).toEqual(
    archived,
  );
  for (const lesson of [loopsLesson, divisionLesson, transferLesson]) {
    const context = { sourceRunId: source.id, competencyId: `course:${lesson.id}` };
    const run = await startLearning(sid, false, lesson.id, context);
    expect(run.lesson.id).toBe(lesson.id);
    await expect(startLearning(foreign, false, lesson.id, context)).rejects.toThrow('not found');
    const repeat = await startLearning(sid, false, lesson.id, context);
    expect(repeat.id).toBe(run.id);
  }
  expect(
    await db.diagnosticRun.findUniqueOrThrow({
      where: { id: source.id },
      include: { responses: true },
    }),
  ).toEqual(before);
});
