import { expect, it } from 'vitest';
import { grade, selectNext, makeReport, publicQuestion } from '../src/lib/diagnostic/engine';
import { pythonDiagnostic as old } from '../src/lib/diagnostic/python-bank';
import { reviewedDiagnostic as bank } from '../src/lib/diagnostic/reviewed-bank';
import { matchesContract } from '../src/lib/diagnostic/contracts';
import type { Evidence } from '../src/lib/diagnostic/types';
it.each([
  ['row . get ( \'note\' , "" )', "row.get('note', '')", true],
  ['row.get("note", \'\')', "row.get('note', '')", true],
  ["row.get('note', None)", "row.get('note', '')", false],
  ['reading == None', 'reading is None', false],
  ['reading is None', 'reading is None', true],
  ['sorted ( items )', 'sorted(items)', true],
  ['items.sort()', 'sorted(items)', false],
  ['range(4)', 'range(4)', true],
  ['range(3)', 'range(4)', false],
  ['type ( qty ) is int', 'type(qty) is int', true],
  ['isinstance(qty,int)', 'type(qty) is int', false],
  ['__import__("os")', 'sorted(items)', false],
  ['4; print(4)', '4', false],
  ['04', '4', false],
  ['none', 'None', false],
])('bounded fragment %s', (actual, expected, match) =>
  expect(matchesContract(actual as string, [expected as string])).toBe(match),
);
it('preserves the published bank and does not expose contracts', () => {
  expect(old.questions).toHaveLength(36);
  expect(bank.questions).toHaveLength(48);
  expect(bank.id).not.toBe(old.id);
  for (const q of bank.questions) {
    expect(publicQuestion(q)).not.toHaveProperty('contract');
    expect(q.hint).toContain(q.title);
    if (q.expected) expect(grade(q, { text: q.expected[0] }).correct).toBe(true);
  }
});
it.each(['strong', 'struggling', 'mixed', 'assisted'] as const)(
  'bounds and covers %s',
  (profile) => {
    const evidence: Evidence[] = [];
    while (true) {
      const next = selectNext(bank, evidence);
      if (!next.questionId) break;
      expect(evidence.some((e) => e.questionId === next.questionId)).toBe(false);
      evidence.push({
        questionId: next.questionId,
        correct:
          profile === 'strong' ||
          profile === 'assisted' ||
          (profile === 'mixed' && evidence.length % 2 === 0),
        assisted: profile === 'assisted',
      });
      expect(evidence.length).toBeLessThanOrEqual(30);
    }
    expect(evidence.length).toBeGreaterThanOrEqual(18);
    const report = makeReport(bank, evidence, 'test');
    expect(report.findings.every((f) => f.count >= 3)).toBe(true);
    if (profile === 'assisted')
      expect(report.findings.every((f) => f.status === 'Insufficient evidence')).toBe(true);
  },
);
it('explicit unsure does not match a contract', () =>
  expect(
    grade(
      bank.questions.find((q) => q.contract)!,
      { text: 'unsure' },
    ).correct,
  ).toBe(false));
it('states unresolved per-competency exhaustion without mastery', () => {
  const remaining = bank.questions.filter((q) => q.competencyId === 'values');
  const rest = bank.competencies
    .slice(1)
    .flatMap((c) => bank.questions.filter((q) => q.competencyId === c.id).slice(0, 3));
  const evidence = [...remaining, ...rest].map((q, i) => ({
    questionId: q.id,
    correct: i % 2 === 0,
    assisted: false,
  }));
  expect(selectNext(bank, evidence).rationale).toContain('exhausted');
});
