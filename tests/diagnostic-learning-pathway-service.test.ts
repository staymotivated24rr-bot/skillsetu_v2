import { afterAll, beforeAll, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { db } from '../src/lib/db';
import { enter, getRun, sessionFor } from '../src/lib/diagnostic/service';
import { makeReport } from '../src/lib/diagnostic/engine';
import { blockDiagnostic } from '../src/lib/diagnostic/block-bank';
import {
  getLearning,
  getLearningPathway,
  learningAction,
  startLearning,
} from '../src/lib/learning-studio/service';
import { variablesLesson } from '../src/lib/learning-studio/variables-lesson';
import { lessonForOrdinal } from '../src/lib/learning-studio/catalog';
import { createStudent } from '../src/lib/service';
const digest = (v: string) => createHash('sha256').update(v).digest('hex');
beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.endsWith('_test'))
    throw new Error('Isolated tests only');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
  execFileSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], {
    env: process.env,
    stdio: 'pipe',
  });
});
afterAll(() => db.$disconnect());

it('pins an owned report pathway, resumes same-session practice and preserves assessment and legacy records', async () => {
  const session = await sessionFor(await enter('Pathway synthetic'));
  const other = await sessionFor(await enter('Pathway synthetic'));
  const demo = await createStudent('Pathway synthetic', 'python-developer');
  const fixtureId = 'lesson-py-fundamentals';
  await db.lessonProgress.create({
    data: {
      userId: demo.id,
      lessonId: fixtureId,
      status: 'completed',
      answers: {
        create: { run: 1, itemId: 'synthetic-old-check', selected: 0, correct: true, first: true },
      },
    },
  });
  await db.repairRun.create({
    data: {
      userId: demo.id,
      skillId: 'py-fundamentals',
      moduleVersion: 'synthetic-old-1',
      contentSnapshot: '{}',
      status: 'completed',
      answers: {
        create: {
          run: 1,
          taskId: 'synthetic-old-task',
          payload: '{}',
          score: 1,
          first: true,
          response: 'Historical synthetic result',
        },
      },
    },
  });
  const demoBefore = await db.user.findUnique({
    where: { id: demo.id },
    include: {
      attempts: true,
      paths: true,
      progress: { include: { answers: true } },
      repairs: { include: { answers: true } },
    },
  });
  const bankSnapshot = JSON.stringify(blockDiagnostic);
  const report = makeReport(blockDiagnostic, [], 'Synthetic completed report');
  report.findings.find((f) => f.competencyId === 'collections')!.nextSubskill = 'aliasing';
  const source = await db.diagnosticRun.create({
    data: {
      sessionId: session.id,
      roleId: 'python-developer',
      bankId: blockDiagnostic.id,
      engineVersion: report.engineVersion,
      bankSnapshot,
      bankDigest: digest(bankSnapshot),
      currentRationale: 'Synthetic fixture',
      status: 'completed',
      completedAt: new Date(),
      report: JSON.stringify(report),
    },
  });
  const sourceBefore = await db.diagnosticRun.findUnique({
    where: { id: source.id },
    include: { responses: true },
  });
  const originalView = await getRun(session.id, source.id);
  const preview = await getLearningPathway(session.id, source.id);
  expect(preview.saved).toBe(false);
  expect(await db.diagnosticLearningPlan.count({ where: { sourceRunId: source.id } })).toBe(0);
  await expect(getLearningPathway(other.id, source.id)).rejects.toThrow('not found');
  await expect(getLearningPathway(demo.id, source.id)).rejects.toThrow('expired');
  const route = { sourceRunId: source.id, competencyId: 'collections' };
  await expect(startLearning(other.id, false, variablesLesson.id, route)).rejects.toThrow(
    'not found',
  );
  await expect(
    startLearning(session.id, false, variablesLesson.id, { ...route, competencyId: 'functions' }),
  ).rejects.toThrow('mapping');
  const standalone = await startLearning(session.id, false, variablesLesson.id);
  await learningAction(session.id, {
    action: 'draft',
    runId: standalone.id,
    stepId: 'vr-names',
    revision: 0,
    requestId: randomUUID(),
    answer: { frame: 0, acknowledged: true },
  });
  const runs = await Promise.all([
    startLearning(session.id, false, variablesLesson.id, route),
    startLearning(session.id, false, variablesLesson.id, route),
  ]);
  expect(runs.every((r) => r.id === standalone.id)).toBe(true);
  expect(runs[0].drafts['vr-names'].acknowledged).toBe(true);
  const saved = await getLearningPathway(session.id, source.id);
  expect(saved.saved).toBe(true);
  expect(saved.items.find((i) => i.competencyId === 'collections')!.progress!.runId).toBe(
    standalone.id,
  );
  const plan = await db.diagnosticLearningPlan.findFirstOrThrow({
    where: { sourceRunId: source.id },
    include: { targets: true },
  });
  expect(plan.reportDigest).toBe(digest(source.report!));
  expect(plan.targets).toHaveLength(1);
  for (const step of variablesLesson.steps) {
    await learningAction(session.id, {
      action: 'visit',
      runId: standalone.id,
      stepId: step.id,
      requestId: randomUUID(),
    });
    await learningAction(session.id, {
      action: 'submit',
      runId: standalone.id,
      stepId: step.id,
      requestId: randomUUID(),
      answer: step.key,
    });
  }
  const completed = await getLearning(session.id, standalone.id);
  expect(completed!.mastery!.status).toBe('mastered');
  expect((await startLearning(session.id, false, variablesLesson.id, route)).id).toBe(
    standalone.id,
  );
  const next = await startLearning(session.id, true, variablesLesson.id, route);
  expect(next.ordinal).toBe(2);
  expect(next.lesson.steps.at(-1)!.code).toBe(
    lessonForOrdinal(variablesLesson, 2).steps.at(-1)!.code,
  );
  expect((await startLearning(session.id, false, variablesLesson.id)).id).toBe(next.id);
  expect(await getLearning(session.id, standalone.id)).toEqual(completed);
  await expect(getLearning(other.id, next.id)).rejects.toThrow('not found');
  await expect(
    learningAction(other.id, {
      action: 'visit',
      runId: next.id,
      stepId: 'vr-names',
      requestId: randomUUID(),
    }),
  ).rejects.toThrow('not found');
  expect(
    await db.diagnosticRun.findUnique({ where: { id: source.id }, include: { responses: true } }),
  ).toEqual(sourceBefore);
  expect(await getRun(session.id, source.id)).toEqual(originalView);
  expect(
    await db.user.findUnique({
      where: { id: demo.id },
      include: {
        attempts: true,
        paths: true,
        progress: { include: { answers: true } },
        repairs: { include: { answers: true } },
      },
    }),
  ).toEqual(demoBefore);
  expect(await db.skillScore.count({ where: { attempt: { userId: session.userId } } })).toBe(0);
  expect(
    await db.diagnosticLearningPlan.findUnique({
      where: { id: plan.id },
      include: { targets: true },
    }),
  ).toEqual(plan);
  const unfinished = await db.diagnosticRun.create({
    data: {
      sessionId: session.id,
      roleId: 'python-developer',
      bankId: blockDiagnostic.id,
      engineVersion: report.engineVersion,
      bankSnapshot,
      bankDigest: digest(bankSnapshot),
      currentRationale: 'Incomplete synthetic',
    },
  });
  await expect(getLearningPathway(session.id, unfinished.id)).rejects.toThrow('Complete');
  await db.diagnosticSession.update({
    where: { id: session.id },
    data: { expiresAt: new Date(0) },
  });
  await expect(getLearningPathway(session.id, source.id)).rejects.toThrow('expired');
});
