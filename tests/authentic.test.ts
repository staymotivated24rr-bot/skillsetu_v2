import { describe, expect, it } from 'vitest';
import { pythonBanks, pythonRepairs } from '../src/lib/authentic/python-banks';
import { gradeTask, publicTask, scoreEvidence, strength } from '../src/lib/authentic/grading';
import { explainChange, repairPlan } from '../src/lib/authentic/planning';
import { planGaps, readiness } from '../src/lib/engine';
import { tracks } from '../src/lib/tracks';
import { correctPayload, wrongPayload } from './authentic-fixtures';
const skills = tracks[1].skills;
for (const bank of pythonBanks)
  describe(bank.id, () => {
    it('has comparable, diverse independent opportunities for every skill', () => {
      expect(bank.tasks).toHaveLength(68);
      expect(new Set(bank.tasks.map((t) => t.type)).size).toBe(6);
      for (const skill of skills) {
        const mapped = bank.tasks.filter((t) => t.skillIds.some((m) => m.skillId === skill.id));
        expect(mapped.length).toBeGreaterThanOrEqual(4);
        expect(mapped.filter((t) => t.independent).length).toBeGreaterThanOrEqual(4);
        expect(new Set(mapped.map((t) => t.scenario)).size).toBe(4);
        if (
          [
            'debugging',
            'testing',
            'reasoning',
            'exceptions',
            'functions',
            'structures',
            'validation',
          ].some((k) => skill.id === 'py-' + k)
        )
          expect(mapped.length).toBeGreaterThanOrEqual(6);
      }
    });
    it('gives a mixed learner actionable gaps and preserves prerequisites', () => {
      const answers = bank.tasks.map((t, i) => ({
        taskId: t.id,
        score: gradeTask(t, i % 7 < 4 ? correctPayload(t) : wrongPayload(t)).score,
      }));
      const scores = scoreEvidence(bank.tasks, answers, skills);
      expect(readiness(scores, skills)).toBeGreaterThan(40);
      expect(readiness(scores, skills)).toBeLessThan(70);
      const gaps = planGaps(scores, skills);
      expect(gaps.length).toBeGreaterThan(5);
      for (const gap of gaps)
        for (const dependency of gap.blockedBy)
          expect(gaps.findIndex((g) => g.id === dependency)).toBeLessThan(gaps.indexOf(gap));
      expect(scores.some((s) => s.quality?.strength === 'Stronger evidence')).toBe(true);
    });
    it('supports full, partial, weak rubrics, step ordering and distinct branches', () => {
      const short = bank.tasks.find((t) => t.rubric)!;
      expect(gradeTask(short, correctPayload(short)).score).toBe(1);
      expect(
        gradeTask(short, {
          text: `The ${short.rubric![0].concepts[0]} needs careful attention in this workflow before we proceed.`,
        }).score,
      ).toBeGreaterThan(0);
      expect(gradeTask(short, wrongPayload(short)).score).toBe(0);
      const steps = bank.tasks.find((t) => t.steps)!;
      expect(gradeTask(steps, correctPayload(steps)).score).toBe(1);
      expect(gradeTask(steps, wrongPayload(steps)).score).toBe(0);
      expect(gradeTask(short, correctPayload(short)).response).not.toBe(
        gradeTask(short, wrongPayload(short)).response,
      );
    });
    it('omits private grading material from every public task', () => {
      for (const t of bank.tasks) {
        const p = publicTask(t);
        for (const key of [
          'correct',
          'order',
          'rubric',
          'cases',
          'explanation',
          'branch',
          'followup',
        ])
          expect(p).not.toHaveProperty(key);
      }
    });
  });
it('labels sparse evidence cautiously and improves with diverse independent transfer evidence', () => {
  expect(
    strength(1, { types: ['decision'], scenarios: ['a'], transfer: 0, independent: 0 }).strength,
  ).toBe('Limited evidence');
  expect(
    strength(4, {
      types: ['decision', 'short-answer'],
      scenarios: ['a', 'b'],
      transfer: 0,
      independent: 2,
    }).strength,
  ).toBe('Moderate evidence');
  expect(
    strength(6, {
      types: ['decision', 'bug-fix', 'transfer'],
      scenarios: ['a', 'b', 'c'],
      transfer: 1,
      independent: 4,
    }).strength,
  ).toBe('Stronger evidence');
});
it('one action cannot produce strong evidence and rubric matching respects word boundaries', () => {
  const task = pythonBanks[0].tasks[0];
  const scores = scoreEvidence([task], [{ taskId: task.id, score: 0 }], skills);
  expect(scores.every((s) => s.quality?.strength === 'Limited evidence')).toBe(true);
  const short = pythonBanks[0].tasks.find(
    (t) => t.skillIds[0].skillId === 'py-testing' && t.rubric,
  );
  if (short)
    expect(
      gradeTask(short, { text: 'untested assertionful mockery boundaryless invalidated outcomes' })
        .score,
    ).toBeLessThan(1);
});
it('computes actual improvement, decline, flat results and increased gaps in the explanation', () => {
  const before = skills.map((s) => ({ skillId: s.id, score: 75, evidence: 1 }));
  const after = skills.map((s, i) => ({ skillId: s.id, score: i === 0 ? 60 : 90, evidence: 6 }));
  const change = explainChange(before, after, skills);
  expect(change.newGaps).toHaveLength(1);
  expect(change.declined).toHaveLength(1);
  expect(change.text).toContain('rose');
  expect(change.text).toContain(skills[0].name);
  expect(explainChange(before, before, skills).unchanged).toHaveLength(skills.length);
  expect(explainChange(after, before, skills).text).toContain('fell');
});
it('plans seven days in prerequisite order, considers effort and removes mastered modules', () => {
  const scores = skills.map((s) => ({ skillId: s.id, score: 30, evidence: 4 }));
  const modules = pythonRepairs.map((m) => ({ ...m, tasks: m.tasks.map(publicTask) }));
  const plan = repairPlan(scores, skills, modules, ['py-fundamentals']);
  expect(plan).toHaveLength(7);
  expect(plan.flatMap((d) => d.skills)).not.toContain('py-fundamentals');
  expect(plan[6].action).toContain('reassessment');
  expect(plan[6].minutes).toBe(120);
});
it('requires complete unique evidence and evaluates object outputs independent of key order', () => {
  expect(() => scoreEvidence(pythonBanks[0].tasks, [], skills)).toThrow('complete');
  const t = {
    ...pythonBanks[0].tasks.find((t) => t.cases)!,
    cases: [{ args: [], expected: { a: 1, b: 2 } }],
  };
  expect(gradeTask(t, { code: 'test', outputs: [{ b: 2, a: 1 }] }).score).toBe(1);
});
