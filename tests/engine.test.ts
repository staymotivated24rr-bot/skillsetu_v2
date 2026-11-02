import { describe, expect, it } from 'vitest';
import {
  compareScores,
  mastery,
  meetsRequirements,
  planGaps,
  readiness,
  readinessLabel,
  scoreAssessment,
} from '../src/lib/engine';
import { skills } from '../src/lib/skills';
import { diagnostic, reassessment } from '../src/lib/simulations';
import { lessons } from '../src/lib/lessons';
import { FallbackLearningProvider } from '../src/lib/provider';
const items = diagnostic.flatMap((s) => s.items);
const fresh = reassessment.flatMap((s) => s.items);
const answers = (correct: boolean) =>
  items.map((q) => ({
    questionId: q.id,
    selected: correct ? q.correct : (q.correct + 1) % q.options.length,
  }));
describe('original content coverage', () => {
  it('has three coherent workplace simulations and 24 mapped actions per bank', () => {
    for (const bank of [diagnostic, reassessment]) {
      expect(bank).toHaveLength(3);
      for (const s of bank) {
        expect(s.items).toHaveLength(8);
        expect(s.items[0].phase).toBe('Clarify');
        expect(s.items.at(-1)?.phase).toBe('Brief');
        for (const q of s.items) {
          expect(q.options[q.correct]).toBeDefined();
          expect(q.skills.length).toBeGreaterThan(0);
          expect(q.options.every((o) => o.response.length > 10)).toBe(true);
          for (const m of q.skills) expect(skills.some((s) => s.id === m.skillId)).toBe(true);
        }
      }
    }
    expect(new Set([...items, ...fresh].map((q) => q.id)).size).toBe(48);
    expect(new Set(items.map((q) => q.correct)).size).toBeGreaterThan(1);
  });
  it('maps every skill to evidence in both banks and provides four original lesson problems', () => {
    for (const s of skills) {
      for (const bank of [items, fresh])
        expect(bank.filter((q) => q.skills.some((m) => m.skillId === s.id)).length).toBeGreaterThan(
          0,
        );
      const l = lessons.find((l) => l.skillId === s.id)!;
      expect(l.content.items).toHaveLength(4);
      expect(l.content.example.length).toBeGreaterThan(40);
      for (const p of l.content.items) expect(p.options[p.correct]).toBeDefined();
    }
    expect(new Set(lessons.flatMap((l) => l.content.items.map((q) => q.id))).size).toBe(64);
  });
});
describe('assessment and readiness', () => {
  it('scores actual complete correct and incorrect responses without fabricated improvement', () => {
    const perfect = scoreAssessment(items, answers(true), skills);
    const none = scoreAssessment(items, answers(false), skills);
    expect(perfect.every((s) => s.score === 100 && s.evidence > 0)).toBe(true);
    expect(none.every((s) => s.score === 0)).toBe(true);
    expect(readiness(perfect, skills)).toBe(100);
    expect(readiness(none, skills)).toBe(0);
    expect(readinessLabel(perfect, skills)).toBe('Meets prototype readiness threshold');
    expect(readinessLabel(none, skills)).toBe('Needs significant development');
    expect(compareScores(perfect, none, skills).every((s) => s.change === -100)).toBe(true);
  });
  it('uses question-to-skill weights, rather than a whole-assessment score', () => {
    const mapped = [
      { id: 'a', correct: 1, skills: [{ skillId: skills[0].id, weight: 1 }] },
      {
        id: 'b',
        correct: 2,
        skills: [
          { skillId: skills[0].id, weight: 3 },
          { skillId: skills[1].id, weight: 1 },
        ],
      },
    ];
    const scores = scoreAssessment(
      mapped,
      [
        { questionId: 'a', selected: 1 },
        { questionId: 'b', selected: 0 },
      ],
      skills,
    );
    expect(scores[0]).toEqual({ skillId: skills[0].id, score: 25, evidence: 2 });
    expect(scores[1].score).toBe(0);
  });
  it('rejects incomplete, duplicate, and mismatched answers', () => {
    expect(() => scoreAssessment(items, answers(true).slice(1), skills)).toThrow();
    expect(() =>
      scoreAssessment(items, [...answers(true).slice(1), answers(true)[1]], skills),
    ).toThrow();
    expect(() =>
      scoreAssessment(
        items,
        answers(true).map((a, i) => (i === 0 ? { ...a, questionId: 'fake' } : a)),
        skills,
      ),
    ).toThrow();
  });
  it('requires every role or employer target and evidence, even with a high overall score', () => {
    const scores = scoreAssessment(items, answers(true), skills);
    scores[0].score = 70;
    expect(readiness(scores, skills)).toBeGreaterThan(90);
    expect(
      meetsRequirements(
        scores,
        skills.map((s) => ({ skillId: s.id, target: s.target })),
      ),
    ).toBe(false);
    expect(
      meetsRequirements([{ skillId: 'a', score: 80, evidence: 1 }], [{ skillId: 'a', target: 80 }]),
    ).toBe(true);
    expect(
      meetsRequirements(
        [{ skillId: 'a', score: 100, evidence: 0 }],
        [{ skillId: 'a', target: 80 }],
      ),
    ).toBe(false);
    expect(meetsRequirements([], [])).toBe(false);
  });
});
describe('gap plans', () => {
  it('excludes mastered skills and prioritizes weighted severity among independent gaps', () => {
    const score = skills.map((s) => ({ skillId: s.id, score: 100, evidence: 2 }));
    score.find((s) => s.skillId === 'sql-filter')!.score = 0;
    score.find((s) => s.skillId === 'descriptive')!.score = 60;
    const plan = planGaps(score, skills);
    expect(plan.map((g) => g.id)).toEqual(['sql-filter', 'descriptive']);
  });
  it('places unmet prerequisites before dependent gaps without duplicates', () => {
    const plan = planGaps(
      skills.map((s) => ({ skillId: s.id, score: 0, evidence: 1 })),
      skills,
    );
    expect(plan).toHaveLength(skills.length);
    for (const g of plan)
      for (const p of g.blockedBy)
        expect(plan.findIndex((x) => x.id === p)).toBeLessThan(
          plan.findIndex((x) => x.id === g.id),
        );
  });
  it('detects cyclic prerequisites instead of looping', () => {
    const nodes = [
      { ...skills[0], id: 'a', prerequisites: ['b'] },
      { ...skills[1], id: 'b', prerequisites: ['a'] },
    ];
    expect(() => planGaps([], nodes)).toThrow('cycle');
  });
});
describe('learning verification', () => {
  const q = lessons[0].content.items;
  it('does not master unopened or incomplete practice and ignores retries for first-response score', () => {
    expect(mastery(q, []).mastered).toBe(false);
    const wrong = q.map((i) => ({ itemId: i.id, correct: false, first: true }));
    const retries = q.map((i) => ({ itemId: i.id, correct: true, first: false }));
    expect(mastery(q, [...wrong, ...retries]).mastered).toBe(false);
  });
  it('requires three first responses and the harder final application', () => {
    expect(
      mastery(
        q,
        q.map((i, n) => ({ itemId: i.id, correct: n !== 0, first: true })),
      ).mastered,
    ).toBe(true);
    expect(
      mastery(
        q,
        q.map((i, n) => ({ itemId: i.id, correct: n !== 3, first: true })),
      ).mastered,
    ).toBe(false);
  });
  it('uses local original hints if an optional provider fails', async () => {
    const provider = new FallbackLearningProvider({
      name: 'Failing provider',
      hint: async () => {
        throw Error('offline');
      },
      explain: async () => {
        throw Error('offline');
      },
    });
    expect(await provider.hint(q[0])).toBe(q[0].hint);
    expect(await provider.explain(q[0])).toBe(q[0].explanation);
  });
});
