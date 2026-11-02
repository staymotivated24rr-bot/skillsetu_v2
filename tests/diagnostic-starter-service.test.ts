import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { db } from '../src/lib/db';
import {
  enter,
  sessionFor,
  startRun,
  getRun,
  respond,
  saveInteraction,
} from '../src/lib/diagnostic/service';
import { starterDiagnostic as bank } from '../src/lib/diagnostic/starter-v3/bank';
import { importStarterDraft } from '../src/lib/diagnostic/starter-v3/import';
import type { Answer } from '../src/lib/diagnostic/types';
let sid: string, other: string;
beforeAll(async () => {
  vi.stubEnv('DIAGNOSTIC_STARTER_V3_PREVIEW', 'true');
  vi.stubEnv('DIAGNOSTIC_DRAFT_ENV', 'local');
  vi.stubEnv('VERCEL', '');
  sid = (await sessionFor(await enter('360 draft integration'))).id;
  other = (await sessionFor(await enter('Draft isolation'))).id;
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await db.$disconnect();
});
it('imports idempotently, transactionally and without changing existing immutable source', async () => {
  const one = await importStarterDraft(),
    two = await importStarterDraft();
  expect(one).toEqual(two);
  expect(one.count).toBe(360);
  expect(one.enabledForLearners).toBe(false);
  const row = await db.assessmentBank.findUniqueOrThrow({ where: { id: one.id } });
  expect(JSON.parse(row.content).source.questions[0].distractor_review_status).toBeTruthy();
});
it('isolates normal runs, preserves format retries, duplicate submission and completed history', async () => {
  const normal = await startRun(sid);
  let run = await startRun(sid, false, 'independent', undefined, true);
  expect(run.bankId).toBe(bank.id);
  expect((await getRun(sid))!.id).toBe(normal.id);
  expect((await getRun(sid, undefined, true))!.id).toBe(run.id);
  const original = (await db.diagnosticRun.findUniqueOrThrow({ where: { id: normal.id } }))
    .bankSnapshot;
  await expect(respond(other, run.id, run.current!.id, { text: 'unsure' })).rejects.toThrow(
    'not found',
  );
  let testedFormat = false;
  while (run.current) {
    const q = bank.questions.find((q) => q.id === run.current!.id)!;
    const answer: Answer = q.numeric ? { text: q.numeric.expected } : { selected: q.correct };
    if (q.numeric && !testedFormat) {
      testedFormat = true;
      await saveInteraction(sid, run.id, q.id, 'draft', { text: '3e2' });
      expect((await getRun(sid, run.id))!.draft).toEqual({ text: '3e2' });
      const before = await db.diagnosticRun.findUniqueOrThrow({ where: { id: run.id } });
      await expect(respond(sid, run.id, q.id, { text: '3e2' })).rejects.toMatchObject({
        status: 422,
      });
      expect(await db.diagnosticRun.findUniqueOrThrow({ where: { id: run.id } })).toEqual(before);
      expect((await getRun(sid, run.id))!.answered).toBe(run.answered);
    }
    const both = await Promise.all([
      respond(sid, run.id, q.id, answer),
      respond(sid, run.id, q.id, answer),
    ]);
    expect(both[0].answered).toBe(run.answered + 1);
    expect(both[1].answered).toBe(both[0].answered);
    run = both[0];
  }
  expect(testedFormat).toBe(true);
  expect(run.answered).toBeGreaterThanOrEqual(24);
  expect(run.review!.every((e) => e.correctAnswer)).toBe(true);
  expect(run.report!.findings).toHaveLength(8);
  const sealed = (await db.diagnosticRun.findUniqueOrThrow({ where: { id: run.id } })).report;
  expect((await getRun(sid, run.id))!.report).toEqual(run.report);
  expect((await db.diagnosticRun.findUniqueOrThrow({ where: { id: run.id } })).report).toBe(sealed);
  expect(
    (await db.diagnosticRun.findUniqueOrThrow({ where: { id: normal.id } })).bankSnapshot,
  ).toBe(original);
  vi.stubEnv('DIAGNOSTIC_STARTER_V3_PREVIEW', 'false');
  await expect(startRun(other, false, 'independent', undefined, true)).rejects.toThrow('disabled');
  await expect(getRun(sid, run.id)).rejects.toThrow('disabled');
  expect((await getRun(sid))!.id).toBe(normal.id);
});
