import { beforeAll, afterAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { enter, sessionFor, startRun, respond } from '../src/lib/diagnostic/service';
import { blockDiagnostic } from '../src/lib/diagnostic/block-bank';
import { batchLesson } from '../src/lib/learning-studio/content';
import { getLearning, startLearning, learningAction } from '../src/lib/learning-studio/service';
import { createStudent } from '../src/lib/service';
import type { LearningAnswer } from '../src/lib/learning-studio/types';
let sid: string, other: string;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test'))
    throw new Error('Disposable local test database required');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
  sid = (await sessionFor(await enter('Studio integration synthetic'))).id;
  other = (await sessionFor(await enter('Foreign studio synthetic'))).id;
});
afterAll(() => db.$disconnect());
it('owns starts, drafts and visits; serializes retries; does not borrow a demo identity', async () => {
  const demo = await createStudent('Same synthetic display name', 'python-developer');
  const [a, b] = await Promise.all([startLearning(sid), startLearning(sid)]);
  expect(a.id).toBe(b.id);
  expect(await getLearning(other)).toBeNull();
  await expect(getLearning(other, a.id)).rejects.toThrow('not found');
  await expect(
    learningAction(other, {
      action: 'hint',
      runId: a.id,
      stepId: a.currentStepId,
      requestId: randomUUID(),
    }),
  ).rejects.toThrow('not found');
  await expect(startLearning(demo.id)).rejects.toThrow('session');
  await expect(
    learningAction(sid, {
      action: 'visit',
      runId: a.id,
      stepId: batchLesson.steps[1].id,
      requestId: randomUUID(),
    }),
  ).rejects.toThrow('preceding');
  const draft = {
    action: 'draft' as const,
    runId: a.id,
    stepId: a.currentStepId,
    answer: { acknowledged: true },
    revision: 0,
    requestId: randomUUID(),
  };
  await learningAction(sid, draft);
  await expect(
    learningAction(sid, { ...draft, revision: 0, requestId: randomUUID() }),
  ).rejects.toThrow('newer draft');
  expect((await getLearning(sid, a.id))!.drafts[a.currentStepId]).toEqual({ acknowledged: true });
  const submit = {
    action: 'submit' as const,
    runId: a.id,
    stepId: a.currentStepId,
    answer: { acknowledged: true },
    requestId: randomUUID(),
  };
  await Promise.all([learningAction(sid, submit), learningAction(sid, submit)]);
  expect(
    await db.diagnosticLearningSubmission.count({
      where: { runId: a.id, stepId: a.currentStepId },
    }),
  ).toBe(1);
  await expect(learningAction(sid, { ...submit, answer: { acknowledged: false } })).rejects.toThrow(
    'different action',
  );
  await Promise.all([
    learningAction(sid, { ...submit, requestId: randomUUID() }),
    learningAction(sid, { ...submit, requestId: randomUUID() }),
  ]);
  expect(
    await db.diagnosticLearningSubmission.count({
      where: { runId: a.id, stepId: a.currentStepId, first: true },
    }),
  ).toBe(1);
  expect(await db.lessonProgress.count({ where: { userId: demo.id } })).toBe(0);
  expect(await db.repairRun.count({ where: { userId: demo.id } })).toBe(0);
});
it('completes all modalities, preserves first misses and archived diagnostic evidence, and restarts additively', async () => {
  const owner = await sessionFor(await enter('Sealed report preservation synthetic'));
  let diagnostic = await startRun(owner.id);
  while (diagnostic.current) {
    const q = blockDiagnostic.questions.find((q) => q.id === diagnostic.current!.id)!;
    diagnostic = await respond(
      owner.id,
      diagnostic.id,
      q.id,
      q.codeSlots
        ? { blocks: q.blockKey }
        : q.options
          ? { selected: q.correct }
          : q.steps
            ? { order: q.order }
            : { text: q.expected![0] },
    );
  }
  const original = await db.diagnosticRun.findUniqueOrThrow({
    where: { id: diagnostic.id },
    include: { responses: true },
  });
  let run = await startLearning(owner.id);
  for (const step of batchLesson.steps) {
    run = (
      await learningAction(owner.id, {
        action: 'visit',
        runId: run.id,
        stepId: step.id,
        requestId: randomUUID(),
      })
    ).run;
    if (step.kind === 'reasoning') {
      await learningAction(owner.id, {
        action: 'hint',
        runId: run.id,
        stepId: step.id,
        requestId: randomUUID(),
      });
      const wrong = await learningAction(owner.id, {
        action: 'submit',
        runId: run.id,
        stepId: step.id,
        answer: { selected: 0 },
        requestId: randomUUID(),
      });
      expect(wrong.evaluation!.correct).toBe(false);
    }
    if (step.kind === 'numeric') {
      const before = await db.diagnosticLearningSubmission.count({ where: { runId: run.id } });
      await expect(
        learningAction(owner.id, {
          action: 'submit',
          runId: run.id,
          stepId: step.id,
          answer: { text: '5' },
          requestId: randomUUID(),
        }),
      ).rejects.toThrow('exactly');
      expect(await db.diagnosticLearningSubmission.count({ where: { runId: run.id } })).toBe(
        before,
      );
    }
    const answer: LearningAnswer = step.key ?? {
      execution: { code: 'synthetic transcript fixture; not executed', outputs: [5, 0, 4] },
    };
    if (step.kind === 'execution')
      await learningAction(owner.id, {
        action: 'evaluate',
        runId: run.id,
        stepId: step.id,
        answer,
        requestId: randomUUID(),
      });
    run = (
      await learningAction(owner.id, {
        action: 'submit',
        runId: run.id,
        stepId: step.id,
        answer,
        requestId: randomUUID(),
      })
    ).run;
  }
  expect(run.status).toBe('completed');
  expect(run.completed).toBe(8);
  expect(run.results.find((r) => r.stepId === 'batch-reason' && r.first)!.correct).toBe(false);
  expect(run.results.find((r) => r.stepId === 'batch-reason' && r.first)!.assisted).toBe(true);
  expect(
    await db.diagnosticRun.findUniqueOrThrow({
      where: { id: diagnostic.id },
      include: { responses: true },
    }),
  ).toEqual(original);
  expect(await db.skillScore.count({ where: { attempt: { userId: owner.userId } } })).toBe(0);
  const fresh = await startLearning(owner.id, true);
  expect(fresh.id).not.toBe(run.id);
  expect(fresh.ordinal).toBe(2);
  expect((await getLearning(owner.id, run.id))!.status).toBe('completed');
});
