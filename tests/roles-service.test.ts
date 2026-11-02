import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { db } from '../src/lib/db';
import { tracks } from '../src/lib/tracks';
import {
  answerAssessment,
  cohortState,
  completeAssessment,
  createStudent,
  getState,
  lessonAction,
  practiceAction,
  reviewAttempt,
  selectRole,
  startAssessment as startCurrentAssessment,
} from '../src/lib/service';
import { compareScores, meetsRequirements } from '../src/lib/engine';
// Explicit legacy fixtures keep the original Python histories under regression coverage.
async function startAssessment(
  userId: string,
  kind: 'diagnostic' | 'reassessment',
  roleId?: string,
) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.selectedRoleId !== 'python-developer')
    return startCurrentAssessment(userId, kind, roleId);
  if (roleId && roleId !== user.selectedRoleId) return startCurrentAssessment(userId, kind, roleId);
  const baseline = await db.assessmentAttempt.findFirst({
    where: { userId, assessmentId: tracks[1].role.assessmentIds.diagnostic, status: 'complete' },
  });
  if ((kind === 'reassessment' && !baseline) || (kind === 'diagnostic' && baseline))
    return startCurrentAssessment(userId, kind, roleId);
  const assessmentId = tracks[1].role.assessmentIds[kind];
  const existing = await db.assessmentAttempt.findFirst({
    where: { userId, assessmentId, status: 'in_progress' },
  });
  if (existing) return existing.id;
  return (await db.assessmentAttempt.create({ data: { userId, assessmentId } })).id;
}
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
  uid = (await createStudent('Multi-role learner')).id;
});
afterAll(() => db.$disconnect());
for (const track of tracks)
  describe(`${track.role.name} persisted role journey`, () => {
    it('loads only role content and requires that role’s own baseline', async () => {
      await selectRole(uid, track.role.id);
      const state = await getState(uid);
      expect(state.role.id).toBe(track.role.id);
      expect(state.roles).toHaveLength(3);
      expect(state.attempts).toHaveLength(0);
      expect(state.progress).toHaveLength(0);
      expect(state.lessons).toHaveLength(track.skills.length);
      expect(new Set(state.skills.map((s) => s.id))).toEqual(
        new Set(track.skills.map((s) => s.id)),
      );
      expect(state.scenarios.diagnostic.map((s) => s.id)).toEqual(
        track.diagnostic.map((s) => s.id),
      );
      expect(state.employer.name).toBe(track.employerName);
      await expect(startAssessment(uid, 'reassessment')).rejects.toThrow('diagnostic');
      await expect(lessonAction(uid, track.lessons[0].id, 'interactive')).rejects.toThrow(
        'diagnostic',
      );
      for (const q of state.scenarios.diagnostic.flatMap((s) => s.items)) {
        expect(q).not.toHaveProperty('correct');
        expect(q.options.every((o) => o.response === '')).toBe(true);
      }
      for (const l of state.lessons)
        for (const q of l.content.items) {
          expect(q).not.toHaveProperty('correct');
          expect(q).not.toHaveProperty('hint');
        }
    });
    it('persists mapped scores, prerequisite path, progress, alternate assessment and honest decline', async () => {
      const id = await startAssessment(uid, 'diagnostic', track.role.id);
      for (const q of track.diagnostic.flatMap((s) => s.items)) {
        const reply = await answerAssessment(uid, id, q.id, q.correct);
        expect(reply.response).toBe(q.options[q.correct].response);
      }
      await completeAssessment(uid, id);
      expect((await getState(uid)).attempts[0].score).toBe(100);
      expect((await reviewAttempt(uid, id)).every((q) => q.correct)).toBe(true);
      expect(
        JSON.parse(
          (await db.learningPath.findUniqueOrThrow({ where: { attemptId: id } })).skillIds,
        ),
      ).toEqual([]);
      expect(
        (await db.readinessReport.findUniqueOrThrow({ where: { attemptId: id } })).indicator,
      ).toContain('Meets');
      const lesson = track.lessons[0];
      await lessonAction(uid, lesson.id, 'interactive');
      expect(await practiceAction(uid, lesson.id, lesson.content.items[0].id)).toEqual({
        hint: lesson.content.items[0].hint,
      });
      await lessonAction(uid, lesson.id, 'structured');
      for (const q of lesson.content.items) await practiceAction(uid, lesson.id, q.id, q.correct);
      expect((await getState(uid)).progress[0]).toMatchObject({
        status: 'mastered',
        mode: 'structured',
      });
      const re = await startAssessment(uid, 'reassessment');
      for (const q of track.reassessment.flatMap((s) => s.items))
        await answerAssessment(uid, re, q.id, (q.correct + 1) % q.options.length);
      await completeAssessment(uid, re);
      const state = await getState(uid);
      expect(state.attempts).toHaveLength(2);
      expect(state.attempts[1].score).toBe(0);
      expect(
        compareScores(state.attempts[0].scores, state.attempts[1].scores, state.skills).every(
          (s) => s.change === -100,
        ),
      ).toBe(true);
      expect(meetsRequirements(state.attempts[1].scores, state.employer.requirements)).toBe(false);
      const path = JSON.parse(
        (await db.learningPath.findUniqueOrThrow({ where: { attemptId: re } })).skillIds,
      ) as string[];
      expect(path).toHaveLength(track.skills.length);
      for (const skill of track.skills)
        for (const p of skill.prerequisites)
          expect(path.indexOf(p)).toBeLessThan(path.indexOf(skill.id));
    });
    it('provides an independent fictional role cohort', async () => {
      const c = await cohortState(track.role.id);
      expect(c.role.id).toBe(track.role.id);
      expect(c.members).toHaveLength(30);
      expect(c.skills).toHaveLength(track.skills.length);
      expect(c.members.filter((m) => m.diagnosed)).toHaveLength(26);
      for (const m of c.members)
        expect(new Set(m.currentScores.map((s) => s.skillId))).toEqual(
          new Set(track.skills.map((s) => s.id)),
        );
    });
  });
it('retains all role histories and rejects cross-role lessons, review and stale submissions', async () => {
  for (const track of tracks) {
    await selectRole(uid, track.role.id);
    const state = await getState(uid);
    expect(state.attempts).toHaveLength(2);
    expect(state.progress[0].status).toBe('mastered');
  }
  await selectRole(uid, 'python-developer');
  await expect(selectRole(uid, 'designer')).rejects.toThrow('Unknown');
  await expect(lessonAction(uid, tracks[2].lessons[0].id, 'interactive')).rejects.toThrow(
    'target role',
  );
  await expect(
    practiceAction(uid, tracks[2].lessons[0].id, tracks[2].lessons[0].content.items[0].id),
  ).rejects.toThrow('target role');
  const attempt = await startAssessment(uid, 'reassessment');
  await selectRole(uid, 'java-developer');
  await expect(startAssessment(uid, 'reassessment', 'python-developer')).rejects.toThrow('changed');
  const q = tracks[1].reassessment[0].items[0];
  await expect(answerAssessment(uid, attempt, q.id, q.correct)).rejects.toThrow(
    'another target role',
  );
  await expect(completeAssessment(uid, attempt)).rejects.toThrow('another target role');
  await expect(
    reviewAttempt(
      uid,
      (
        await db.assessmentAttempt.findFirstOrThrow({
          where: { userId: uid, assessmentId: 'diagnostic' },
        })
      ).id,
    ),
  ).rejects.toThrow('Submit');
  await selectRole(uid, 'python-developer');
  expect(await startAssessment(uid, 'reassessment')).toBe(attempt);
});
