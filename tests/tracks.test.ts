import { describe, expect, it } from 'vitest';
import { tracks } from '../src/lib/tracks';
import {
  compareScores,
  mastery,
  meetsRequirements,
  planGaps,
  readiness,
  scoreAssessment,
} from '../src/lib/engine';
for (const track of tracks)
  describe(`${track.role.name} shared engine and original content`, () => {
    it('covers every role skill with coherent distinct banks and valid prerequisite graphs', () => {
      expect(track.skills.length).toBeGreaterThanOrEqual(15);
      expect(track.skills.length).toBeLessThanOrEqual(18);
      const ids = new Set(track.skills.map((s) => s.id));
      const questionIds: string[] = [];
      for (const bank of [track.diagnostic, track.reassessment]) {
        expect(bank).toHaveLength(3);
        for (const scenario of bank) {
          expect(scenario.items).toHaveLength(8);
          expect(scenario.data.length).toBeGreaterThan(100);
          expect(scenario.items[0].phase).toBe('Clarify');
          expect(scenario.items.at(-1)?.phase).toBe('Brief');
          for (const q of scenario.items) {
            questionIds.push(q.id);
            expect(q.options[q.correct]).toBeDefined();
            expect(q.options.every((o) => o.response.length > 20)).toBe(true);
            expect(q.skills.length).toBeGreaterThan(0);
            for (const mapping of q.skills) {
              expect(ids.has(mapping.skillId)).toBe(true);
              expect(mapping.weight).toBeGreaterThan(0);
            }
          }
        }
        for (const skill of track.skills)
          expect(
            bank.flatMap((s) => s.items).some((q) => q.skills.some((m) => m.skillId === skill.id)),
          ).toBe(true);
      }
      expect(new Set(questionIds).size).toBe(48);
      for (const skill of track.skills)
        for (const prerequisite of skill.prerequisites) expect(ids.has(prerequisite)).toBe(true);
      const plan = planGaps([], track.skills);
      expect(plan).toHaveLength(track.skills.length);
      for (const gap of plan)
        for (const p of gap.blockedBy)
          expect(plan.findIndex((g) => g.id === p)).toBeLessThan(
            plan.findIndex((g) => g.id === gap.id),
          );
    });
    it('grades complete mixed evidence, before/after and every employer requirement honestly', () => {
      const items = track.diagnostic.flatMap((s) => s.items);
      const answers = (good: boolean) =>
        items.map((q) => ({
          questionId: q.id,
          selected: good ? q.correct : (q.correct + 1) % q.options.length,
        }));
      const high = scoreAssessment(items, answers(true), track.skills),
        low = scoreAssessment(items, answers(false), track.skills);
      expect(readiness(high, track.skills)).toBe(100);
      expect(readiness(low, track.skills)).toBe(0);
      expect(compareScores(high, low, track.skills).every((s) => s.change === -100)).toBe(true);
      const requirements = Object.entries(track.employerTargets).map(([skillId, target]) => ({
        skillId,
        target,
      }));
      expect(meetsRequirements(high, requirements)).toBe(true);
      expect(meetsRequirements(low, requirements)).toBe(false);
      const mixed = scoreAssessment(
        items,
        items.map((q, i) => ({
          questionId: q.id,
          selected: i % 2 ? q.correct : (q.correct + 1) % q.options.length,
        })),
        track.skills,
      );
      expect(readiness(mixed, track.skills)).toBeGreaterThan(0);
      expect(readiness(mixed, track.skills)).toBeLessThan(100);
      expect(planGaps(high, track.skills)).toHaveLength(0);
    });
    it('has one complete lesson per skill and honest four-check mastery with harder application', () => {
      expect(track.lessons).toHaveLength(track.skills.length);
      for (const lesson of track.lessons) {
        expect(track.skills.some((s) => s.id === lesson.skillId)).toBe(true);
        expect(lesson.content.example.length).toBeGreaterThan(80);
        const items = lesson.content.items;
        expect(items).toHaveLength(4);
        for (const q of items) {
          expect(q.options[q.correct]).toBeDefined();
          expect(q.hint.length).toBeGreaterThan(20);
          expect(q.explanation.length).toBeGreaterThan(0);
        }
        expect(
          mastery(
            items,
            items.map((q) => ({ itemId: q.id, correct: true, first: true })),
          ).mastered,
        ).toBe(true);
        const wrong = items.map((q) => ({ itemId: q.id, correct: false, first: true }));
        expect(
          mastery(items, [
            ...wrong,
            ...items.map((q) => ({ itemId: q.id, correct: true, first: false })),
          ]).mastered,
        ).toBe(false);
        expect(
          mastery(
            items,
            items.map((q, i) => ({ itemId: q.id, correct: i !== 3, first: true })),
          ).mastered,
        ).toBe(false);
      }
    });
  });
it('keeps roles, question banks and lessons uniquely identified', () => {
  const ids = tracks.flatMap((t) => [
    ...t.skills.map((s) => s.id),
    ...t.lessons.map((l) => l.id),
    ...t.diagnostic.flatMap((s) => s.items.map((q) => q.id)),
    ...t.reassessment.flatMap((s) => s.items.map((q) => q.id)),
  ]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(tracks.map((t) => t.role.id)).toEqual([
    'data-analyst',
    'python-developer',
    'java-developer',
  ]);
});
