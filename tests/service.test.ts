import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { db } from '../src/lib/db';
import {
  answerAssessment,
  cohortState,
  completeAssessment,
  createStudent,
  getState,
  lessonAction,
  practiceAction,
  reviewAttempt,
  startAssessment,
} from '../src/lib/service';
import { diagnostic, reassessment } from '../src/lib/simulations';
import { lessons } from '../src/lib/lessons';
let uid = '';
beforeAll(async () => {
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js','migrate','deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
  execFileSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], {
    env: process.env,
    stdio: 'pipe',
  });
  uid = (await createStudent('Integration learner')).id;
});
afterAll(() => db.$disconnect());
describe('persisted end-to-end product logic', () => {
  it('guards reassessment and lessons before the baseline and isolates ownership', async () => {
    await expect(startAssessment(uid, 'reassessment')).rejects.toThrow('diagnostic');
    await expect(lessonAction(uid, lessons[0].id, 'interactive')).rejects.toThrow('diagnostic');
    const id = await startAssessment(uid, 'diagnostic');
    expect(await startAssessment(uid, 'diagnostic')).toBe(id);
    await expect(
      answerAssessment('another-user', id, diagnostic[0].items[0].id, 0),
    ).rejects.toThrow('not found');
    await expect(answerAssessment(uid, id, diagnostic[0].items[1].id, 0)).rejects.toThrow('order');
    await expect(completeAssessment(uid, id)).rejects.toThrow('all simulation actions');
    await expect(reviewAttempt(uid, id)).rejects.toThrow('Submit');
  });
  it('stores submitted actions, follows the stakeholder branch, and creates scores/path/report atomically', async () => {
    const id = await startAssessment(uid, 'diagnostic');
    const items = diagnostic.flatMap((s) => s.items);
    for (const [i, q] of items.entries()) {
      const selected = i % 2 ? q.correct : (q.correct + 1) % q.options.length;
      const response = await answerAssessment(uid, id, q.id, selected);
      expect(response.response).toBe(q.options[selected].response);
    }
    const q = items[0];
    const chosen = (q.correct + 1) % q.options.length;
    await answerAssessment(uid, id, q.id, chosen); // exact retry is idempotent
    await expect(answerAssessment(uid, id, q.id, q.correct)).rejects.toThrow('cannot be changed');
    await completeAssessment(uid, id);
    await completeAssessment(uid, id);
    const state = await getState(uid);
    const attempt = state.attempts[0];
    expect(attempt.answers).toHaveLength(24);
    expect(attempt.answers.map((a) => a.questionId)).toEqual(items.map((q) => q.id));
    expect(attempt.scores).toHaveLength(16);
    expect(attempt.score).toBeLessThan(100);
    expect(await db.learningPath.findUnique({ where: { attemptId: id } })).not.toBeNull();
    expect(await db.readinessReport.findUnique({ where: { attemptId: id } })).not.toBeNull();
    await expect(answerAssessment(uid, id, q.id, chosen)).rejects.toThrow('already been submitted');
    await expect(startAssessment(uid, 'diagnostic')).rejects.toThrow('baseline');
    const review = await reviewAttempt(uid, id);
    expect(review).toHaveLength(24);
    expect(review.some((r) => !r.correct)).toBe(true);
  });
  it('does not expose answer keys or future stakeholder responses in public state', async () => {
    const state = await getState(uid);
    for (const q of state.scenarios.diagnostic.flatMap((s) => s.items)) {
      expect(q).not.toHaveProperty('correct');
      expect(q).not.toHaveProperty('explanation');
      expect(q.options.every((o) => o.response === '')).toBe(true);
    }
    for (const l of state.lessons)
      for (const q of l.content.items) {
        expect(q).not.toHaveProperty('correct');
        expect(q).not.toHaveProperty('explanation');
        expect(q).not.toHaveProperty('hint');
      }
  });
  it('keeps practice mastery honest, preserves mode, supports hints/retries/new runs', async () => {
    const l = lessons[0];
    await lessonAction(uid, l.id, 'interactive');
    expect((await getState(uid)).progress[0].status).toBe('started');
    const q = l.content.items[0];
    expect(await practiceAction(uid, l.id, q.id)).toEqual({ hint: q.hint });
    await expect(practiceAction(uid, l.id, l.content.items[1].id, 0)).rejects.toThrow('order');
    await practiceAction(uid, l.id, q.id, (q.correct + 1) % q.options.length);
    await practiceAction(uid, l.id, q.id, q.correct);
    for (const q of l.content.items.slice(1)) await practiceAction(uid, l.id, q.id, q.correct);
    expect((await getState(uid)).progress[0].status).toBe('mastered');
    await lessonAction(uid, l.id, 'structured', true);
    for (const q of l.content.items)
      await practiceAction(uid, l.id, q.id, (q.correct + 1) % q.options.length);
    expect((await getState(uid)).progress[0].status).toBe('needs-practice');
    await lessonAction(uid, l.id, 'structured', true);
    for (const q of l.content.items) await practiceAction(uid, l.id, q.id, q.correct);
    const progress = (await getState(uid)).progress[0];
    expect(progress.mode).toBe('structured');
    expect(progress.run).toBe(3);
    expect(progress.status).toBe('mastered');
    // Assessment proficiency was not mutated by practice.
    expect(
      (await getState(uid)).attempts[0].scores.find((s) => s.skillId === l.skillId)?.score,
    ).toBe(100);
  });
  it('reassesses from distinct items and records a genuine decline', async () => {
    const id = await startAssessment(uid, 'reassessment');
    for (const q of reassessment.flatMap((s) => s.items))
      await answerAssessment(uid, id, q.id, (q.correct + 1) % q.options.length);
    await completeAssessment(uid, id);
    const state = await getState(uid);
    expect(state.attempts[0].score).toBeGreaterThan(0);
    expect(state.attempts[1].score).toBe(0);
    expect(state.attempts[1].scores.every((s) => s.score === 0)).toBe(true);
  });
  it('loads a separate fictional college cohort with declines and unassessed students', async () => {
    const cohort = await cohortState();
    expect(cohort.members).toHaveLength(30);
    expect(cohort.members.filter((m) => m.diagnosed)).toHaveLength(26);
    expect(cohort.members.some((m) => m.currentScores[0].score < m.initialScores[0].score)).toBe(
      true,
    );
  });
});
