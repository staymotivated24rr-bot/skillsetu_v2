import { afterAll, beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { enter, sessionFor, startRun, respond } from '../src/lib/diagnostic/service';
import { blockDiagnostic } from '../src/lib/diagnostic/block-bank';
import { variablesLesson } from '../src/lib/learning-studio/variables-lesson';
import { batchLesson } from '../src/lib/learning-studio/content';
import { getLearning, startLearning, learningAction } from '../src/lib/learning-studio/service';
import { lessonForOrdinal } from '../src/lib/learning-studio/catalog';
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
it('preserves historical assessments and phase-2 lessons while owning new lesson mastery, resume and restart', async () => {
  const session = await sessionFor(await enter('Variables integration synthetic'));
  const foreign = await sessionFor(await enter('Other variables identity'));
  const demo = await startLearning(session.id);
  const demoStored = await db.diagnosticLearningRun.findUniqueOrThrow({
    where: { id: demo.id },
    include: { target: { include: { module: true } } },
  });
  let diagnostic = await startRun(session.id);
  while (diagnostic.current) {
    const q = blockDiagnostic.questions.find((q) => q.id === diagnostic.current!.id)!;
    diagnostic = await respond(
      session.id,
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
  const sealed = await db.diagnosticRun.findUniqueOrThrow({
    where: { id: diagnostic.id },
    include: { responses: true },
  });
  let run = await startLearning(session.id, false, variablesLesson.id);
  expect(run.id).not.toBe(demo.id);
  expect((await getLearning(session.id, undefined, batchLesson.id))!.id).toBe(demo.id);
  await expect(getLearning(foreign.id, run.id)).rejects.toThrow('not found');
  await expect(startLearning(session.id, false, 'unknown-lesson')).rejects.toThrow('not found');
  await expect(startLearning(session.id, false, '__proto__')).rejects.toThrow('not found');
  for (const step of variablesLesson.steps) {
    run = (
      await learningAction(session.id, {
        action: 'visit',
        runId: run.id,
        stepId: step.id,
        requestId: randomUUID(),
      })
    ).run;
    if (step.id === 'vr-copy-output') {
      run = (
        await learningAction(session.id, {
          action: 'draft',
          runId: run.id,
          stepId: step.id,
          answer: { text: '[2, 5]' },
          revision: run.draftRevision,
          requestId: randomUUID(),
        })
      ).run;
      expect((await getLearning(session.id, run.id))!.drafts[step.id]).toEqual({ text: '[2, 5]' });
    }
    if (step.kind === 'mastery') {
      await expect(
        learningAction(session.id, {
          action: 'hint',
          runId: run.id,
          stepId: step.id,
          requestId: randomUUID(),
        }),
      ).rejects.toThrow('no hints');
      await learningAction(session.id, {
        action: 'submit',
        runId: run.id,
        stepId: step.id,
        answer: { state: { a: '[0]', b: '[0]', same: 'True' } },
        requestId: randomUUID(),
      });
      expect((await getLearning(session.id, run.id))!.mastery!.status).toBe('needs-practice');
    }
    run = (
      await learningAction(session.id, {
        action: 'submit',
        runId: run.id,
        stepId: step.id,
        answer: step.key,
        requestId: randomUUID(),
      })
    ).run;
  }
  expect(run.status).toBe('completed');
  expect(run.results.filter((r) => r.first).map((r) => r.stepId)).toEqual(
    variablesLesson.steps.map((s) => s.id),
  );
  expect(run.mastery!.status).toBe('needs-practice');
  expect(run.mastery!.independentCorrect).toBe(5);
  const archived = await getLearning(session.id, run.id);
  const second = await startLearning(session.id, true, variablesLesson.id);
  expect(second.ordinal).toBe(2);
  expect(second.lesson.steps.at(-1)!.code).not.toBe(run.lesson.steps.at(-1)!.code);
  for (const step of lessonForOrdinal(variablesLesson, 2).steps) {
    await learningAction(session.id, {
      action: 'visit',
      runId: second.id,
      stepId: step.id,
      requestId: randomUUID(),
    });
    await learningAction(session.id, {
      action: 'submit',
      runId: second.id,
      stepId: step.id,
      answer: step.key,
      requestId: randomUUID(),
    });
  }
  expect((await getLearning(session.id, second.id))!.mastery!.status).toBe('mastered');
  expect(await getLearning(session.id, run.id)).toEqual(archived);
  expect(
    await db.diagnosticRun.findUniqueOrThrow({
      where: { id: diagnostic.id },
      include: { responses: true },
    }),
  ).toEqual(sealed);
  expect(
    await db.diagnosticLearningRun.findUniqueOrThrow({
      where: { id: demo.id },
      include: { target: { include: { module: true } } },
    }),
  ).toEqual(demoStored);
  expect(await db.skillScore.count({ where: { attempt: { userId: session.userId } } })).toBe(0);
});
