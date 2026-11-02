import { beforeAll, afterAll, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { db } from '../src/lib/db';
import {
  createStudent,
  getState,
  startAssessment,
  completeAssessment,
  selectRole,
} from '../src/lib/service';
import { submitAuthentic, repairAction, repairTask } from '../src/lib/authentic/service';
import { pythonBanks } from '../src/lib/authentic/python-banks';
import { correctPayload, wrongPayload } from './authentic-fixtures';
let uid = '',
  attemptId = '';
beforeAll(async () => {
  execFileSync(process.execPath, ['scripts/audit-test-setup.mjs'], { stdio: 'pipe', env: process.env });
  uid = (await createStudent('Authentic integration', 'python-developer')).id;
});
afterAll(() => db.$disconnect());
it('self-heals missing published banks, persists version/snapshot, resumes and checks ownership/order', async () => {
  await db.assessmentBank.deleteMany({ where: { roleId: 'python-developer' } });
  expect(await db.assessmentBank.count({ where: { roleId: 'python-developer' } })).toBe(0);
  attemptId = await startAssessment(uid, 'diagnostic');
  expect(await db.assessmentBank.count({ where: { roleId: 'python-developer' } })).toBe(5);
  expect(await startAssessment(uid, 'diagnostic')).toBe(attemptId);
  const attempt = (await getState(uid)).attempts[0];
  expect(attempt.bankId).toBeTruthy();
  expect(attempt.assessmentVersion).toBe('python-authentic-v2');
  expect(attempt.skillSnapshot).toHaveLength(17);
  const bank = pythonBanks.find((b) => b.id === attempt.bankId)!;
  await expect(
    submitAuthentic('another-user', attemptId, bank.tasks[0].id, correctPayload(bank.tasks[0])),
  ).rejects.toThrow('not found');
  await expect(
    submitAuthentic(uid, attemptId, bank.tasks[1].id, correctPayload(bank.tasks[1])),
  ).rejects.toThrow('order');
  await selectRole(uid, 'java-developer');
  await expect(
    submitAuthentic(uid, attemptId, bank.tasks[0].id, correctPayload(bank.tasks[0])),
  ).rejects.toThrow('Switch back');
  await selectRole(uid, 'python-developer');
  const unused = pythonBanks.find((b) => b.id !== attempt.bankId)!;
  await db.assessmentBank.update({
    where: { id: unused.id },
    data: { content: '{"partial":true}', digest: 'corrupt' },
  });
  await startAssessment(uid, 'diagnostic');
  const repaired = await db.assessmentBank.findUniqueOrThrow({ where: { id: unused.id } });
  expect(repaired.content).toBe(JSON.stringify(unused));
  expect(repaired.digest).not.toBe('corrupt');
});
it('grades complete mixed evidence, seals attempts and exposes no private keys', async () => {
  const state = await getState(uid);
  const selected = pythonBanks.find((b) => b.id === state.attempts[0].bankId)!;
  for (const [i, t] of selected.tasks.entries())
    await submitAuthentic(uid, attemptId, t.id, i % 7 < 4 ? correctPayload(t) : wrongPayload(t));
  await completeAssessment(uid, attemptId);
  expect(await completeAssessment(uid, attemptId)).toBe(attemptId);
  const completed = (await getState(uid)).attempts[0];
  expect(completed.score).toBeGreaterThan(40);
  expect(completed.evidence).toHaveLength(68);
  expect(completed.scores.every((s) => s.quality)).toBe(true);
  const serialized = JSON.stringify(completed.bank);
  expect(serialized).not.toMatch(/"correct"|"rubric"|"expected"|"cases"/);
  await expect(
    submitAuthentic(uid, attemptId, selected.tasks[0].id, correctPayload(selected.tasks[0])),
  ).rejects.toThrow('already');
});
it('avoids immediate reassessment bank reuse and keeps role histories separate', async () => {
  const ids: string[] = [];
  for (let n = 0; n < 3; n++) {
    const id = await startAssessment(uid, 'reassessment');
    const state = await getState(uid);
    const bank = pythonBanks.find((b) => b.id === state.attempts.find((a) => a.id === id)!.bankId)!;
    ids.push(bank.id);
    for (const task of bank.tasks)
      await submitAuthentic(uid, id, task.id, n === 2 ? wrongPayload(task) : correctPayload(task));
    await completeAssessment(uid, id);
  }
  expect(new Set(ids).size).toBe(3);
  const history = (await getState(uid)).attempts;
  expect(history[1].score).toBe(100);
  expect(history[2].score).toBe(100);
  expect(history[3].score).toBe(0);
  expect(history[1].scores.every((s) => s.quality?.strength === 'Stronger evidence')).toBe(true);
  await selectRole(uid, 'data-analyst');
  expect((await getState(uid)).attempts).toHaveLength(0);
  await selectRole(uid, 'python-developer');
  expect((await getState(uid)).attempts).toHaveLength(4);
});
it('keeps first-response mastery honest, resumes modes and never changes assessment readiness', async () => {
  const before = (await getState(uid)).attempts.at(-1)!.score;
  await repairAction(uid, 'py-fundamentals', 'structured');
  let state = await getState(uid);
  const repairModule = state.repairProgress![0];
  const stored = JSON.parse(
    (await db.repairRun.findUniqueOrThrow({ where: { id: repairModule.id } })).contentSnapshot,
  ) as import('../src/lib/authentic/types').RepairModule;
  const first = stored.tasks[0];
  await repairTask(uid, stored.skillId, first.id, wrongPayload(first));
  await repairTask(uid, stored.skillId, first.id, correctPayload(first));
  for (const task of stored.tasks.slice(1))
    await repairTask(uid, stored.skillId, task.id, correctPayload(task));
  await repairAction(uid, stored.skillId, 'interactive');
  state = await getState(uid);
  expect(state.repairProgress![0].status).toBe('mastered');
  expect(state.repairProgress![0].mode).toBe('interactive');
  expect(state.attempts.at(-1)!.score).toBe(before);
  expect(state.repairProgress![0].answers.filter((a) => a.first && a.score === 0)).toHaveLength(1);
});

it('serializes simultaneous starts and preserves sealed evidence through repeated setup', async () => {
  const learner = await createStudent('Concurrent fixture', 'python-developer');
  const ids = await Promise.all([
    startAssessment(learner.id, 'diagnostic'),
    startAssessment(learner.id, 'diagnostic'),
  ]);
  expect(ids[0]).toBe(ids[1]);
  const before = await db.assessmentAttempt.findMany({
    where: { userId: uid },
    include: { evidence: { orderBy: { id: 'asc' } }, scores: { orderBy: { skillId: 'asc' } } },
    orderBy: { id: 'asc' },
  });
  const repairs = await db.repairRun.findMany({
    where: { userId: uid },
    include: { answers: { orderBy: { id: 'asc' } } },
    orderBy: { id: 'asc' },
  });
  execFileSync(process.execPath, ['scripts/audit-test-setup.mjs'], { stdio: 'pipe', env: process.env });
  expect(
    await db.assessmentAttempt.findMany({
      where: { userId: uid },
      include: { evidence: { orderBy: { id: 'asc' } }, scores: { orderBy: { skillId: 'asc' } } },
      orderBy: { id: 'asc' },
    }),
  ).toEqual(before);
  expect(
    await db.repairRun.findMany({
      where: { userId: uid },
      include: { answers: { orderBy: { id: 'asc' } } },
      orderBy: { id: 'asc' },
    }),
  ).toEqual(repairs);
});
