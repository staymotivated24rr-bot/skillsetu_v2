import { afterAll, beforeAll, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
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
import { HYBRID_VERSION, competencyEvidence } from '../src/lib/diagnostic/hybrid-vnext';
import { selectNext } from '../src/lib/diagnostic/engine';
import type { RunView } from '../src/lib/diagnostic/types';
beforeAll(() => {
  vi.stubEnv('DIAGNOSTIC_STARTER_V3_PREVIEW', 'true');
  vi.stubEnv('DIAGNOSTIC_DRAFT_ENV', 'local');
  vi.stubEnv('VERCEL', '');
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await db.$disconnect();
});
async function identity(name: string) {
  return (await sessionFor(await enter(name))).id;
}
function correct(run: RunView) {
  const q = bank.questions.find((q) => q.id === run.current!.id)!;
  return q.numeric ? { text: q.numeric.expected } : { selected: q.correct };
}
it('persists the engine/seed, resumes exact selections, serializes retries and seals new-version reports', async () => {
  const sid = await identity('v4.1 seed resume'),
    foreign = await identity('v4.1 ownership');
  let run = await startRun(sid, false, 'independent', undefined, true);
  const stored = await db.diagnosticRun.findUniqueOrThrow({ where: { id: run.id } });
  expect(stored.engineVersion).toBe(HYBRID_VERSION);
  expect(stored.currentQuestionId).toBe(
    selectNext(bank, [], { version: HYBRID_VERSION, seed: stored.id }).questionId,
  );
  const first = run.current!.id,
    answer = correct(run);
  await saveInteraction(sid, run.id, first, 'draft', answer);
  expect((await getRun(sid, run.id))!.draft).toEqual(answer);
  expect((await startRun(sid, false, 'independent', undefined, true)).id).toBe(run.id);
  await expect(getRun(foreign, run.id)).rejects.toThrow('not found');
  await expect(respond(foreign, run.id, first, answer)).rejects.toThrow('not found');
  const [one, two] = await Promise.all([
    respond(sid, run.id, first, answer),
    respond(sid, run.id, first, answer),
  ]);
  expect(one).toEqual(two);
  expect(one.answered).toBe(1);
  run = one;
  const responses = await db.diagnosticResponse.findMany({
    where: { runId: run.id },
    orderBy: { position: 'asc' },
  });
  expect(responses).toHaveLength(1);
  expect(responses[0].answeredAt).toBeInstanceOf(Date);
  expect(responses[0].rationale).toContain(HYBRID_VERSION);
  expect(run.current!.id).toBe(
    selectNext(bank, responses, { version: HYBRID_VERSION, seed: run.id }).questionId,
  );
  expect((await getRun(sid, run.id))!.current).toEqual(run.current);
  expect(run.report).toBeNull();
  expect(run.review).toBeNull();
  expect(run.current).not.toHaveProperty('optionHypotheses');
  while (run.current) run = await respond(sid, run.id, run.current.id, correct(run));
  expect(run.answered).toBe(24);
  expect(run.report!.engineVersion).toBe(HYBRID_VERSION);
  expect(run.report!.evidence.every((e) => e.outcome === 'correct')).toBe(true);
  const sealed = (await db.diagnosticRun.findUniqueOrThrow({ where: { id: run.id } })).report;
  expect((await getRun(sid, run.id))!.report).toEqual(run.report);
  expect((await db.diagnosticRun.findUniqueOrThrow({ where: { id: run.id } })).report).toBe(sealed);
  expect(run.review!.every((e) => e.correctAnswer)).toBe(true);
});
it('keeps v4.0 attempts on their original algorithm and never rewrites their sealed report', async () => {
  const sid = await identity('Historical hybrid fixture');
  const bankSnapshot = JSON.stringify(bank),
    selection = selectNext(bank, []);
  const old = await db.diagnosticRun.create({
    data: {
      sessionId: sid,
      roleId: bank.roleId,
      bankId: bank.id,
      engineVersion: 'hybrid-4.0.0-draft.1',
      bankSnapshot,
      bankDigest: createHash('sha256').update(bankSnapshot).digest('hex'),
      currentQuestionId: selection.questionId,
      currentRationale: selection.rationale,
    },
  });
  let run = (await getRun(sid, old.id))!;
  run = await respond(sid, run.id, run.current!.id, correct(run));
  const responses = await db.diagnosticResponse.findMany({
    where: { runId: old.id },
    orderBy: { position: 'asc' },
  });
  expect(run.current!.id).toBe(selectNext(bank, responses).questionId);
  while (run.current) run = await respond(sid, run.id, run.current.id, correct(run));
  expect(run.report!.engineVersion).toBe('hybrid-4.0.0-draft.1');
  expect(run.report!.evidence[0]).not.toHaveProperty('outcome');
  const sealed = (await db.diagnosticRun.findUniqueOrThrow({ where: { id: old.id } })).report;
  const fresh = await startRun(sid, true, 'independent', old.id, true);
  expect(
    (await db.diagnosticRun.findUniqueOrThrow({ where: { id: fresh.id } })).engineVersion,
  ).toBe(HYBRID_VERSION);
  expect((await db.diagnosticRun.findUniqueOrThrow({ where: { id: old.id } })).report).toBe(sealed);
  expect((await db.diagnosticRun.findUniqueOrThrow({ where: { id: old.id } })).bankSnapshot).toBe(
    bankSnapshot,
  );
});
it('stores unsure separately from misconceptions and reports uncertainty without false gaps', async () => {
  const sid = await identity('Unsure adaptive fixture');
  let run = await startRun(sid, false, 'independent', undefined, true);
  const first = run.current!;
  run = await respond(sid, run.id, first.id, { text: 'unsure' });
  const rows = await db.diagnosticResponse.findMany({
    where: { runId: run.id },
    orderBy: { position: 'asc' },
  });
  expect(rows[0].misconception).toBeNull();
  expect(rows[0].correct).toBe(false);
  expect(competencyEvidence(bank, rows, first.competencyId).difficulty).toBe(1);
  while (run.current) run = await respond(sid, run.id, run.current.id, { text: 'unsure' });
  expect(run.answered).toBe(30);
  expect(
    run.report!.findings.every(
      (f) => f.incorrect === 0 && f.independent === 0 && f.status === 'Insufficient evidence',
    ),
  ).toBe(true);
  expect(
    run.review!.every((e) => e.outcome === 'unsure' && e.misconception === null && e.correctAnswer),
  ).toBe(true);
});
