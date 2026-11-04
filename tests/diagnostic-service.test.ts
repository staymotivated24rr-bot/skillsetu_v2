import { afterAll, beforeAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import {
  enter,
  sessionFor,
  startRun,
  getRun,
  respond,
  saveInteraction,
} from '../src/lib/diagnostic/service';
import { blockDiagnostic as bank } from '../src/lib/diagnostic/block-bank';
import type { Answer, RunView } from '../src/lib/diagnostic/types';
let sid: string, other: string;
beforeAll(async () => {
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
  sid = (await sessionFor(await enter('Adaptive integration'))).id;
  other = (await sessionFor(await enter('Another learner'))).id;
});
afterAll(() => db.$disconnect());
function correct(run: RunView): Answer {
  const q = bank.questions.find((q) => q.id === run.current!.id)!;
  return q.codeSlots
    ? { blocks: q.blockKey }
    : q.options
      ? { selected: q.correct }
      : q.steps
        ? { order: q.order }
        : { text: q.expected![0] };
}
it('uses opaque expiring sessions, never a user ID as a bearer token', async () => {
  const token = await enter('Token check'),
    session = await sessionFor(token);
  expect(token.length).toBe(43);
  expect(session.tokenHash).not.toContain(token);
  await expect(sessionFor(session.userId)).rejects.toThrow('Enter');
  await expect(sessionFor('x'.repeat(43))).rejects.toThrow('expired');
  await db.diagnosticSession.update({
    where: { id: session.id },
    data: { expiresAt: new Date(0) },
  });
  await expect(sessionFor(token)).rejects.toThrow('expired');
});
it('serializes starts and verifies ownership for reads, submissions, hints and drafts', async () => {
  const runs = await Promise.all([startRun(sid), startRun(sid)]);
  expect(runs[0].id).toBe(runs[1].id);
  const run = runs[0],
    qid = run.current!.id;
  await expect(getRun(other, run.id)).rejects.toThrow('not found');
  await expect(respond(other, run.id, qid, correct(run))).rejects.toThrow('not found');
  await expect(saveInteraction(other, run.id, qid, 'hint')).rejects.toThrow('not found');
  await expect(saveInteraction(other, run.id, qid, 'draft', {})).rejects.toThrow('not found');
  await expect(respond(sid, run.id, 'review2-values-trace-1', { text: '3' })).rejects.toThrow(
    'no longer active',
  );
  expect(run).not.toHaveProperty('bankSnapshot');
  expect(run.current).not.toHaveProperty('expected');
});
it('persists drafts and process hints, handles concurrent duplicate submissions atomically', async () => {
  const run = (await getRun(sid))!,
    answer = correct(run),
    qid = run.current!.id;
  await saveInteraction(sid, run.id, qid, 'draft', answer);
  expect((await getRun(sid))!.draft).toEqual(answer);
  await saveInteraction(sid, run.id, qid, 'hint');
  expect((await getRun(sid))!.hint).toBeTruthy();
  const result = await Promise.all([
    respond(sid, run.id, qid, answer),
    respond(sid, run.id, qid, answer),
  ]);
  expect(result.every((r) => r.answered === 1)).toBe(true);
  expect(result[0].lastFeedback?.assisted).toBe(true);
  expect(await db.diagnosticResponse.count({ where: { runId: run.id } })).toBe(1);
  await expect(respond(sid, run.id, qid, { text: 'unsure' })).rejects.toThrow('cannot be changed');
  await expect(saveInteraction(sid, run.id, qid, 'draft', answer)).rejects.toThrow(
    'no longer active',
  );
});
it('seals an evidence report and preserves history, published content and legacy records', async () => {
  const learner = await db.user.create({ data: { name: 'Legacy sentinel', id: randomUUID() } });
  const before = await db.assessmentAttempt.count();
  let run = (await getRun(sid))!;
  while (run.current) run = await respond(sid, run.id, run.current.id, correct(run));
  expect(run.status).toBe('completed');
  expect(run.answered).toBeGreaterThanOrEqual(18);
  expect(run.report!.findings.every((f) => f.count >= 3)).toBe(true);
  expect(run.report!.evidence).toHaveLength(run.answered);
  expect(run.report!.evidence[0]).not.toHaveProperty('runId');
  expect(run.report!.evidence[0]).not.toHaveProperty('payload');
  const stored = await getRun(sid, run.id);
  expect(stored!.report).toEqual(run.report);
  const last = await db.diagnosticResponse.findFirstOrThrow({
    where: { runId: run.id },
    orderBy: { position: 'desc' },
  });
  expect((await respond(sid, run.id, last.questionId, JSON.parse(last.payload))).report).toEqual(
    run.report,
  );
  const restarted = await startRun(sid, true);
  expect(restarted.id).not.toBe(run.id);
  expect(restarted.answered).toBe(0);
  expect((await getRun(sid, run.id))!.report).toEqual(run.report);
  expect(await db.assessmentAttempt.count()).toBe(before);
  expect(await db.user.findUnique({ where: { id: learner.id } })).not.toBeNull();
  const published = await db.assessmentBank.findUniqueOrThrow({ where: { id: bank.id } });
  expect(JSON.parse(published.content).id).toBe(bank.id);
  const storedRun = await db.diagnosticRun.findUniqueOrThrow({ where: { id: restarted.id } });
  await db.diagnosticRun.update({ where: { id: restarted.id }, data: { bankDigest: 'tampered' } });
  await expect(getRun(sid, restarted.id)).rejects.toThrow('version needs recovery');
  await db.diagnosticRun.update({
    where: { id: restarted.id },
    data: { bankDigest: storedRun.bankDigest },
  });
});
import { createHash } from 'node:crypto';
import { pythonDiagnostic as oldBank } from '../src/lib/diagnostic/python-bank';
it('keeps legacy snapshots resumable with their original grading and seals prior-informed routing explicitly', async () => {
  const session = (await sessionFor(await enter('Archived fixture'))).id;
  const snapshot = JSON.stringify(oldBank);
  const legacy = await db.diagnosticRun.create({
    data: {
      sessionId: session,
      roleId: oldBank.roleId,
      bankId: oldBank.id,
      engineVersion: 'rules-1.0.0',
      bankSnapshot: snapshot,
      bankDigest: createHash('sha256').update(snapshot).digest('hex'),
      currentQuestionId: 'values-patch-2',
      currentRationale: 'Archived initial routing',
    },
  });
  let run = await respond(session, legacy.id, 'values-patch-2', { text: '4' });
  while (run.current) {
    const q = oldBank.questions.find((q) => q.id === run.current!.id)!;
    run = await respond(
      session,
      run.id,
      q.id,
      q.options
        ? { selected: (q.correct! + 1) % q.options.length }
        : q.steps
          ? { order: q.steps.map((s) => s.id) }
          : { text: 'unsure' },
    );
  }
  const archived = JSON.stringify(run.report);
  let fresh = await startRun(session, true, 'independent');
  expect(fresh.rationale).toContain('Independent fresh');
  while (fresh.current) {
    const q = bank.questions.find((q) => q.id === fresh.current!.id)!;
    fresh = await respond(
      session,
      fresh.id,
      q.id,
      q.options
        ? { selected: (q.correct! + 1) % q.options.length }
        : q.steps
          ? { order: q.steps.map((s) => s.id) }
          : { text: 'unsure' },
    );
  }
  const prior = await startRun(session, true, 'prior-informed');
  expect(prior.rationale).toContain('Prior results supply routing only');
  expect(prior.answered).toBe(0);
  expect(JSON.stringify((await getRun(session, legacy.id))!.report)).toBe(archived);
});
it('withholds grading signals until completion, while retaining private saved evidence', async () => {
  const session = (await sessionFor(await enter('Deferred results'))).id;
  const run = await startRun(session);
  expect(run.current?.codeSlots?.length).toBeGreaterThan(0);
  const submitted = await respond(session, run.id, run.current!.id, correct(run));
  expect(submitted.report).toBeNull();
  expect(submitted.review).toBeNull();
  expect(submitted.lastFeedback).not.toHaveProperty('correct');
  expect(submitted.rationale).not.toMatch(
    /suspected gap|deeper understanding|after difficulty|Requested difficulty/,
  );
  const privateResponse = await db.diagnosticResponse.findFirstOrThrow({
    where: { runId: run.id },
  });
  expect(privateResponse.correct).toBe(true);
  let final = submitted;
  while (final.current) final = await respond(session, final.id, final.current.id, correct(final));
  expect(final.report!.evidence.every((e) => e.correct)).toBe(true);
  expect(final.review).toHaveLength(final.answered);
  expect(final.review!.every((e) => e.question && e.answer && e.correctAnswer)).toBe(true);
  const sealed = (await db.diagnosticRun.findUniqueOrThrow({ where: { id: final.id } })).report;
  await getRun(session, final.id);
  expect((await db.diagnosticRun.findUniqueOrThrow({ where: { id: final.id } })).report).toBe(
    sealed,
  );
});
it('starts a fresh form from an explicit active attempt once, without overwriting it', async () => {
  const session = (await sessionFor(await enter('Keep active draft'))).id;
  const old = await startRun(session);
  const partial = {
    blocks: { [old.current!.codeSlots![0].id]: old.current!.codeSlots![0].choices[0].id },
  };
  await saveInteraction(session, old.id, old.current!.id, 'draft', partial);
  const stored = JSON.stringify(await db.diagnosticRun.findUnique({ where: { id: old.id } }));
  const next = await Promise.all([
    startRun(session, true, 'independent', old.id),
    startRun(session, true, 'independent', old.id),
  ]);
  expect(next[0].id).toBe(next[1].id);
  expect(next[0].id).not.toBe(old.id);
  expect(JSON.stringify(await db.diagnosticRun.findUnique({ where: { id: old.id } }))).toBe(stored);
  expect((await getRun(session, old.id))!.draft).toEqual(partial);
  await expect(startRun(other, true, 'independent', old.id)).rejects.toThrow('not found');
});
it('continues a reviewed-v2 snapshot after the block form is published', async () => {
  const { reviewedDiagnostic: priorBank } = await import('../src/lib/diagnostic/reviewed-bank');
  const session = (await sessionFor(await enter('V2 compatibility'))).id;
  const snapshot = JSON.stringify(priorBank);
  const first = priorBank.questions[0];
  const prior = await db.diagnosticRun.create({
    data: {
      sessionId: session,
      roleId: priorBank.roleId,
      bankId: priorBank.id,
      engineVersion: 'rules-2.0.0',
      bankSnapshot: snapshot,
      bankDigest: createHash('sha256').update(snapshot).digest('hex'),
      currentQuestionId: first.id,
      currentRationale: 'Reviewed v2 fixture',
    },
  });
  const resumed = await respond(session, prior.id, first.id, { text: first.expected![0] });
  expect(resumed.bankId).toBe(priorBank.id);
  expect(resumed.current?.id.startsWith('review2-')).toBe(true);
  expect(resumed.lastFeedback).not.toHaveProperty('correct');
  expect((await db.diagnosticRun.findUniqueOrThrow({ where: { id: prior.id } })).bankSnapshot).toBe(
    snapshot,
  );
});
