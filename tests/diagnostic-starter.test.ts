import { describe, expect, it, vi } from 'vitest';
import {
  starterDiagnostic as bank,
  starterSource,
  validateStarterSource,
  draftPreviewEnabled,
  defaultDraftPreview,
} from '../src/lib/diagnostic/starter-v3/bank';
import {
  grade,
  publicQuestion,
  validateBank,
  selectNext,
  makeReport,
} from '../src/lib/diagnostic/engine';
import { numericResult } from '../src/lib/diagnostic/numeric';
import { misconceptionSignals } from '../src/lib/diagnostic/hybrid';
import type { Answer, Evidence } from '../src/lib/diagnostic/types';
import { clarifications } from '../src/lib/diagnostic/starter-v3/clarifications';
import { diagnosticPresentations } from '../src/lib/diagnostic/presentation';
import { blockDiagnostic } from '../src/lib/diagnostic/block-bank';

describe('draft bank import contracts', () => {
  it('matches display definitions to the distinct six- and eight-competency banks', () => {
    for (const [definition, authored] of [
      [diagnosticPresentations.starter, bank],
      [diagnosticPresentations.legacy, blockDiagnostic],
    ] as const) {
      expect(definition.competencies).toEqual(authored.competencies.map((c) => c.name));
      expect(definition.minimum).toBe(authored.policy.minimum);
      expect(definition.maximum).toBe(authored.policy.maximum);
    }
    vi.stubEnv('DIAGNOSTIC_STARTER_V3_DEFAULT', 'true');
    vi.stubEnv('DIAGNOSTIC_STARTER_V3_PREVIEW', 'false');
    expect(defaultDraftPreview()).toBe(false);
    vi.unstubAllEnvs();
  });
  it('retains all source metadata and exact distributions without changing legacy banks', () => {
    validateStarterSource();
    validateBank(bank);
    expect(bank.questions).toHaveLength(360);
    for (const q of bank.questions) {
      const src = starterSource.questions.find((s) => s.id === q.id)!;
      expect(q.exposureFamily).toBe(src.family_id);
      expect(q.code).toBe(src.code ?? undefined);
      expect(q.options).toEqual(
        src.response_mode === 'numeric_input'
          ? undefined
          : (clarifications[q.id]?.options ?? Object.values(src.options)),
      );
    }
  });
  it('grades every authored key and rejects every distractor, with no key leakage', () => {
    for (const q of bank.questions) {
      expect(
        grade(q, q.numeric ? { text: q.numeric.expected } : { selected: q.correct }).correct,
      ).toBe(true);
      expect(grade(q, { text: 'unsure' }).correct).toBe(false);
      if (q.options)
        q.options.forEach((_, i) =>
          expect(grade(q, { selected: i }).correct).toBe(i === q.correct),
        );
      const visible = publicQuestion(q);
      for (const key of ['expected', 'correct', 'explanation', 'optionHypotheses', 'sourceKind'])
        expect(visible).not.toHaveProperty(key);
      if (q.numeric) {
        expect(visible.numeric).not.toHaveProperty('expected');
        expect(visible.options).toBeUndefined();
      }
    }
  });
  it('fails closed outside explicitly enabled local preview', () => {
    vi.stubEnv('DIAGNOSTIC_STARTER_V3_PREVIEW', 'false');
    expect(draftPreviewEnabled()).toBe(false);
    vi.stubEnv('DIAGNOSTIC_STARTER_V3_PREVIEW', 'true');
    vi.stubEnv('DIAGNOSTIC_DRAFT_ENV', 'local');
    vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@remote.example/db');
    expect(draftPreviewEnabled()).toBe(false);
    vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@127.0.0.1:15432/db');
    vi.stubEnv('VERCEL', '1');
    expect(draftPreviewEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});
describe('numeric format is separate from scoring', () => {
  it('preserves decimal precision and signs with string comparison', () => {
    for (let places = 1; places <= 4; places++) {
      const expected = '2.' + '5'.padEnd(places, '0');
      const f = { kind: 'float' as const, places, expected };
      expect(numericResult(f, '+000' + expected).correct).toBe(true);
      expect(numericResult(f, '2.' + '6'.padEnd(places, '0'))).toMatchObject({
        format: true,
        correct: false,
      });
      for (const invalid of ['2', '2e0', 'NaN', 'Infinity', '2,50', '2.' + '5'.repeat(places + 1)])
        expect(numericResult(f, invalid).format).toBe(false);
    }
    expect(numericResult({ kind: 'integer', places: 0, expected: '0' }, '-000').correct).toBe(true);
    expect(
      numericResult(
        { kind: 'integer', places: 0, expected: '9007199254740993123' },
        '+09007199254740993123',
      ).correct,
    ).toBe(true);
    expect(numericResult({ kind: 'integer', places: 0, expected: '10' }, '10.0').format).toBe(
      false,
    );
    expect(() =>
      grade(
        bank.questions.find((q) => q.numeric)!,
        { text: '2' },
      ),
    ).toThrow('does not count');
  });
});
describe('balanced hybrid engine', () => {
  for (const profile of ['strong', 'struggling', 'mixed', 'assisted'])
    it(`${profile}: covers eight areas, bounds length, never repeats a family`, () => {
      const evidence: Evidence[] = [];
      let selection = selectNext(bank, evidence);
      const families = new Set<string>();
      while (selection.questionId) {
        const q = bank.questions.find((q) => q.id === selection.questionId)!;
        expect(families.has(q.exposureFamily!)).toBe(false);
        families.add(q.exposureFamily!);
        const right =
          profile === 'strong' ||
          profile === 'assisted' ||
          (profile === 'mixed' && evidence.length % 3 !== 0);
        const payload: Answer = right
          ? q.numeric
            ? { text: q.numeric.expected }
            : { selected: q.correct }
          : q.numeric
            ? { text: '-99999' + (q.numeric.places ? '.' + '0'.repeat(q.numeric.places) : '') }
            : { selected: (q.correct! + 1) % 4 };
        evidence.push({
          questionId: q.id,
          correct: grade(q, payload).correct,
          assisted: profile === 'assisted',
          payload: JSON.stringify(payload),
        });
        selection = selectNext(bank, evidence);
        expect(evidence.length).toBeLessThanOrEqual(30);
      }
      expect(evidence.length).toBeGreaterThanOrEqual(24);
      const report = makeReport(bank, evidence, selection.rationale);
      expect(report.findings).toHaveLength(8);
      expect(report.findings.every((f) => f.count >= 3)).toBe(true);
      if (profile === 'assisted')
        expect(report.findings.every((f) => f.status === 'Insufficient evidence')).toBe(true);
    });
  it('holds difficulty after a single wrong response and excludes assisted/unsure hypotheses', () => {
    const first = bank.questions.find((q) => q.id === selectNext(bank, []).questionId)!;
    expect(first.difficulty).toBe(2);
    const e = {
      questionId: first.id,
      correct: false,
      assisted: false,
      payload: JSON.stringify({ text: 'unsure' }),
    };
    expect(selectNext(bank, [e]).rationale).toContain('requested difficulty 2');
    expect(misconceptionSignals(bank, [e], first.competencyId)).toEqual([]);
  });
  it('stops honestly if all families are exhausted and rejects forged history', () => {
    const tiny = { ...bank, questions: bank.questions.slice(0, 3) };
    expect(
      selectNext(tiny, [{ questionId: tiny.questions[0].id, correct: false, assisted: false }])
        .rationale,
    ).toContain('exhausted');
    expect(() =>
      selectNext(bank, [{ questionId: 'forged', correct: true, assisted: false }]),
    ).toThrow();
  });
  it('changes difficulty only after repeated independent evidence and confirms hypotheses across different families', () => {
    for (const correct of [true, false]) {
      const history: Evidence[] = [];
      for (const c of bank.competencies) {
        const qs = bank.questions.filter((q) => q.competencyId === c.id && q.difficulty === 2);
        const selected = [qs[0], qs.find((q) => q.exposureFamily !== qs[0].exposureFamily)!];
        history.push(...selected.map((q) => ({ questionId: q.id, correct, assisted: false })));
      }
      const next = bank.questions.find((q) => q.id === selectNext(bank, history).questionId)!;
      expect(next.difficulty).toBe(correct ? 3 : 1);
    }
    const mcqs = bank.questions.filter((q) => q.options).slice(0, 2);
    const synthetic = {
      ...bank,
      questions: mcqs.map((q, i) => ({
        ...q,
        exposureFamily: 'family-' + i,
        optionHypotheses: q.options!.map((_, j) =>
          j === q.correct ? null : 'possible shared error',
        ),
      })),
    };
    const evidence = synthetic.questions.map((q) => ({
      questionId: q.id,
      correct: false,
      assisted: false,
      payload: JSON.stringify({ selected: (q.correct! + 1) % 4 }),
    }));
    expect(
      misconceptionSignals(synthetic, evidence.slice(0, 1), mcqs[0].competencyId)[0].confirmed,
    ).toBe(false);
    expect(misconceptionSignals(synthetic, evidence, mcqs[0].competencyId)[0]).toMatchObject({
      confirmed: true,
      observations: 2,
    });
    expect(
      misconceptionSignals(
        synthetic,
        evidence.map((e) => ({ ...e, assisted: true })),
        mcqs[0].competencyId,
      ),
    ).toEqual([]);
  });
});
