import { expect, it } from 'vitest';
import { blockDiagnostic as bank } from '../src/lib/diagnostic/block-bank';
import { reviewedDiagnostic as previous } from '../src/lib/diagnostic/reviewed-bank';
import {
  grade,
  validateBank,
  publicQuestion,
  selectNext,
  makeReport,
} from '../src/lib/diagnostic/engine';
import type { Answer, Evidence } from '../src/lib/diagnostic/types';
const blocks = bank.questions.filter((q) => q.codeSlots);
it('publishes additive content with immutable prior items and the same length policy', () => {
  validateBank(bank);
  expect(bank.questions).toHaveLength(60);
  expect(blocks).toHaveLength(12);
  expect(bank.policy).toEqual(previous.policy);
  for (const q of previous.questions) expect(bank.questions.find((n) => n.id === q.id)).toEqual(q);
  expect(
    blocks.every(
      (q) => q.version.startsWith('3.0.') && !previous.questions.some((old) => old.id === q.id),
    ),
  ).toBe(true);
});
it.each(blocks.map((q) => [q.id, q] as const))(
  'grades every choice in %s without code execution or public answer keys',
  (_, q) => {
    expect(grade(q, { blocks: q.blockKey }).correct).toBe(true);
    for (const slot of q.codeSlots!)
      for (const choice of slot.choices) {
        const answer = { blocks: { ...q.blockKey, [slot.id]: choice.id } };
        expect(grade(q, answer).correct).toBe(choice.id === q.blockKey![slot.id]);
      }
    expect(grade(q, { text: 'unsure' }).correct).toBe(false);
    expect(() => grade(q, { blocks: {} })).toThrow('every blank');
    expect(() => grade(q, { blocks: { ...q.blockKey, unknown: 'forged' } })).toThrow();
    expect(() => grade(q, { blocks: { ...q.blockKey, [q.codeSlots![0].id]: 'forged' } })).toThrow();
    expect(() => grade(q, { blocks: q.blockKey, text: 'unsure' })).toThrow();
    const visible = publicQuestion(q);
    expect(visible).not.toHaveProperty('blockKey');
    expect(visible).not.toHaveProperty('expected');
    expect(visible).not.toHaveProperty('contract');
    expect(visible.codeSlots).toHaveLength(q.codeSlots!.length);
    expect(JSON.stringify(visible)).not.toMatch(/blockKey|correct|explanation|misconception/);
  },
);
it('rejects malformed authored blanks rather than publishing unusable items', () => {
  const bad = structuredClone(bank);
  bad.questions.find((q) => q.codeSlots)!.code += '\n{{unknown}}';
  expect(() => validateBank(bad)).toThrow('code-block');
  const key = structuredClone(bank);
  key.questions.find((q) => q.codeSlots)!.blockKey = {};
  expect(() => validateBank(key)).toThrow('code-block');
});
it.each(['strong', 'struggling', 'mixed', 'assisted'] as const)(
  'keeps %s selection bounded and covers every competency with original formats',
  (profile) => {
    const evidence: Evidence[] = [];
    while (true) {
      const next = selectNext(bank, evidence);
      if (!next.questionId) break;
      const q = bank.questions.find((q) => q.id === next.questionId)!;
      const match = profile === 'strong' || (profile === 'mixed' && evidence.length % 3 !== 0);
      const answer: Answer = q.codeSlots
        ? match
          ? { blocks: q.blockKey }
          : { text: 'unsure' }
        : q.options
          ? { selected: match ? q.correct! : (q.correct! + 1) % q.options.length }
          : q.steps
            ? { order: match ? q.order : [...q.order!].reverse() }
            : { text: match ? q.expected![0] : 'unsure' };
      evidence.push({
        questionId: q.id,
        correct: grade(q, answer).correct,
        assisted: profile === 'assisted' && evidence.length === 0,
      });
      expect(evidence.length).toBeLessThanOrEqual(30);
    }
    expect(evidence.length).toBeGreaterThanOrEqual(18);
    for (const c of bank.competencies)
      expect(
        evidence.filter(
          (e) => bank.questions.find((q) => q.id === e.questionId)!.competencyId === c.id,
        ).length,
      ).toBeGreaterThanOrEqual(3);
    expect(evidence.some((e) => e.questionId.startsWith('blocks3-'))).toBe(true);
    expect(makeReport(bank, evidence, 'fixture').engineVersion).toBe('rules-3.0.0');
  },
);
