import { beforeAll, afterAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { enter, getRun, sessionFor } from '../src/lib/diagnostic/service';
import {
  learningAction,
  learningRecommendation,
  startLearning,
} from '../src/lib/learning-studio/service';
import { simulationBank, simulationReport } from './fixtures/learning-profiles';
import { variablesLesson } from '../src/lib/learning-studio/variables-lesson';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.endsWith('_test'))
    throw new Error('Isolated tests only');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
});
afterAll(() => db.$disconnect());
it('derives from owned persistent practice, pins repeatable decisions and preserves historical assessment and recommendations', async () => {
  const owner = await sessionFor(await enter('Learning selector synthetic'));
  const foreign = await sessionFor(await enter('Learning selector synthetic'));
  const report = simulationReport(true);
  report.learningOrder = ['collections'];
  Object.assign(
    report.findings.find((f) => f.competencyId === 'collections')!,
    { status: 'Likely gap', correct: 0, incorrect: 3 },
  );
  const bankSnapshot = JSON.stringify(simulationBank);
  const source = await db.diagnosticRun.create({
    data: {
      sessionId: owner.id,
      roleId: 'python-developer',
      status: 'completed',
      completedAt: new Date(),
      currentRationale: 'Synthetic selector fixture',
      bankId: simulationBank.id,
      bankSnapshot,
      bankDigest: digest(bankSnapshot),
      engineVersion: 'rules-3.0.0',
      report: JSON.stringify(report),
    },
  });
  const before = await db.diagnosticRun.findUnique({
    where: { id: source.id },
    include: { responses: true },
  });
  const reportView = await getRun(owner.id, source.id);
  const initial = await learningRecommendation(owner.id, source.id);
  expect(initial.saved).toBe(false);
  expect(initial.recommendation.concept.competencyId).toBe('collections');
  expect(await db.diagnosticLearningPlan.count({ where: { sourceRunId: source.id } })).toBe(0);
  const [saved, repeated] = await Promise.all([
    learningRecommendation(owner.id, source.id, true),
    learningRecommendation(owner.id, source.id, true),
  ]);
  expect(saved.decisionId).toBe(repeated.decisionId);
  expect(await learningRecommendation(owner.id, source.id)).toEqual(saved);
  const immutable = await db.diagnosticLearningPlan.findUniqueOrThrow({
    where: { id: saved.decisionId },
  });
  const practice = await startLearning(owner.id, false, variablesLesson.id);
  for (let count = 0; count < 3; count++)
    await learningAction(owner.id, {
      action: 'hint',
      runId: practice.id,
      stepId: 'vr-names',
      requestId: randomUUID(),
    });
  await learningAction(owner.id, {
    action: 'submit',
    runId: practice.id,
    stepId: 'vr-names',
    requestId: randomUUID(),
    answer: { acknowledged: true },
  });
  const changed = await learningRecommendation(owner.id, source.id, true);
  expect(changed.decisionId).not.toBe(saved.decisionId);
  expect(changed.recommendation.practice.hintUses).toBe(3);
  expect(changed.recommendation.practice.completedSteps).toBe(1);
  expect(changed.recommendation.practice.status).toBe('guided');
  expect(changed.recommendation.practice.firstUnaidedMatches).toBe(0);
  expect(await learningRecommendation(owner.id, source.id, false, saved.decisionId)).toEqual(saved);
  expect(
    await db.diagnosticLearningPlan.findUniqueOrThrow({ where: { id: saved.decisionId } }),
  ).toEqual(immutable);
  await expect(learningRecommendation(foreign.id, source.id)).rejects.toThrow('not found');
  await expect(learningRecommendation(foreign.id, source.id, true)).rejects.toThrow('not found');
  await expect(
    learningRecommendation(owner.id, source.id, false, 'foreign-decision'),
  ).rejects.toThrow('not found');
  expect(
    await db.diagnosticRun.findUnique({ where: { id: source.id }, include: { responses: true } }),
  ).toEqual(before);
  expect(await getRun(owner.id, source.id)).toEqual(reportView);
  expect(await db.skillScore.count({ where: { attempt: { userId: owner.userId } } })).toBe(0);
  await db.diagnosticSession.update({ where: { id: owner.id }, data: { expiresAt: new Date(0) } });
  await expect(
    learningRecommendation(owner.id, source.id, false, saved.decisionId),
  ).rejects.toThrow('expired');
});
