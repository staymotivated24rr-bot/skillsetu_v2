import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import {
  findings,
  grade,
  makeReport,
  publicQuestion,
  selectNext,
  validateBank,
} from '../src/lib/diagnostic/engine';
import { pythonDiagnostic as bank } from '../src/lib/diagnostic/python-bank';
import type { Answer, Bank, Evidence, Question } from '../src/lib/diagnostic/types';
const answer = (q: Question): Answer =>
  q.options ? { selected: q.correct } : q.steps ? { order: q.order } : { text: q.expected![0] };
function simulate(
  pattern: (index: number, question: Question) => { correct: boolean; assisted: boolean },
) {
  const history: Evidence[] = [];
  for (let n = 0; n <= bank.policy.maximum; n++) {
    const selected = selectNext(bank, history);
    if (!selected.questionId) return { history, stop: selected.rationale };
    const q = bank.questions.find((q) => q.id === selected.questionId)!;
    history.push({ questionId: q.id, ...pattern(n, q) });
  }
  throw new Error('Did not stop at the maximum');
}
describe('explainable adaptive diagnostic', () => {
  it('rejects cyclic prerequisites, undersized banks and broken answer keys before publication', () => {
    expect(() => validateBank(bank)).not.toThrow();
    const cyclic = structuredClone(bank);
    cyclic.competencies[0].prerequisites = ['testing'];
    expect(() => validateBank(cyclic)).toThrow('cyclic');
    expect(() => validateBank({ ...bank, policy: { ...bank.policy, maximum: 100 } })).toThrow(
      'policy',
    );
    const broken = structuredClone(bank);
    broken.questions[0].expected = [];
    expect(() => validateBank(broken)).toThrow('accepted answers');
  });
  it('supports an eight-competency role with 24/30/36 bounds using the same engine', () => {
    const expanded: Bank = {
      ...bank,
      id: 'test-future-role',
      roleId: 'test-future-role',
      policy: { minimum: 24, target: 30, maximum: 36, coverage: 3 },
      competencies: Array.from({ length: 8 }, (_, i) => ({
        ...bank.competencies[0],
        id: 'c' + i,
        prerequisites: i ? ['c' + (i - 1)] : [],
      })),
      questions: Array.from({ length: 8 }, (_, i) =>
        bank.questions
          .filter((q) => q.competencyId === 'values')
          .map((q) => ({ ...q, id: 'c' + i + '-' + q.id, competencyId: 'c' + i })),
      ).flat(),
    };
    validateBank(expanded);
    const evidence: Evidence[] = [];
    while (true) {
      const next = selectNext(expanded, evidence);
      if (!next.questionId) break;
      evidence.push({ questionId: next.questionId, correct: true, assisted: false });
      if (evidence.length > 36) throw new Error('length exceeded');
    }
    expect(evidence).toHaveLength(24);
    expect(findings(expanded, evidence).every((f) => f.count >= 3)).toBe(true);
  });
  it('pins the published bank fingerprint; author changes require a new version', () => {
    expect(createHash('sha256').update(JSON.stringify(bank)).digest('hex')).toBe(
      '4b6731f95c9e53570c9097644c13a12beaf7951e39c74fab89d19f8657499907',
    );
  });
  it('publishes distinct versioned items and enough diverse opportunities per mandatory competency', () => {
    expect(new Set(bank.questions.map((q) => q.id)).size).toBe(36);
    for (const c of bank.competencies) {
      const questions = bank.questions.filter((q) => q.competencyId === c.id);
      expect(questions).toHaveLength(6);
      expect(new Set(questions.map((q) => q.type)).size).toBe(4);
      expect(new Set(questions.map((q) => q.difficulty)).size).toBe(3);
      expect(c.prerequisites.every((id) => bank.competencies.some((p) => p.id === id))).toBe(true);
      expect(questions.every((q) => q.explanation && q.version && q.accessibility.inputLabel)).toBe(
        true,
      );
    }
  });
  it('changes difficulty and question identity after correct versus incorrect answers', () => {
    const first = selectNext(bank, []).questionId!;
    const yes = selectNext(bank, [{ questionId: first, correct: true, assisted: false }]);
    const no = selectNext(bank, [{ questionId: first, correct: false, assisted: false }]);
    expect(yes.questionId).not.toBe(no.questionId);
    expect(bank.questions.find((q) => q.id === yes.questionId)!.difficulty).toBe(3);
    expect(bank.questions.find((q) => q.id === no.questionId)!.difficulty).toBe(1);
    expect(yes.rationale).toContain('Verify');
  });
  it('investigates a prerequisite after a failed dependent task', () => {
    const next = selectNext(bank, [
      { questionId: 'errors-patch-2', correct: false, assisted: false },
    ]);
    expect(bank.questions.find((q) => q.id === next.questionId)!.competencyId).toBe('functions');
    expect(next.rationale).toContain('prerequisite');
  });
  it('never declares a strength or gap from one response; mixed and assisted evidence remains uncertain', () => {
    for (const correct of [true, false])
      expect(
        findings(bank, [{ questionId: 'values-patch-2', correct, assisted: false }])[0].status,
      ).toBe('Insufficient evidence');
    const mixed = ['values-trace-1', 'values-patch-2', 'values-workflow-3'].map(
      (questionId, i) => ({ questionId, correct: i !== 1, assisted: false }),
    );
    expect(findings(bank, mixed)[0].status).toBe('Insufficient evidence');
    expect(
      findings(
        bank,
        mixed.map((e) => ({ ...e, correct: true, assisted: true })),
      )[0].independent,
    ).toBe(0);
  });
  it.each(['strong', 'weak', 'mixed', 'assisted'] as const)(
    'enforces coverage, length and no repetition for %s patterns',
    (pattern) => {
      const result = simulate((i) => ({
        correct:
          pattern === 'strong' || pattern === 'assisted' || (pattern === 'mixed' && i % 2 === 0),
        assisted: pattern === 'assisted',
      }));
      expect(result.history.length).toBeGreaterThanOrEqual(18);
      expect(result.history.length).toBeLessThanOrEqual(30);
      expect(new Set(result.history.map((e) => e.questionId)).size).toBe(result.history.length);
      expect(findings(bank, result.history).every((f) => f.count >= 3)).toBe(true);
      if (pattern === 'strong')
        expect(
          findings(bank, result.history).every((f) => f.status === 'Demonstrated strength'),
        ).toBe(true);
      if (pattern === 'weak')
        expect(findings(bank, result.history).every((f) => f.status === 'Likely gap')).toBe(true);
      if (pattern === 'assisted') {
        expect(result.history).toHaveLength(30);
        expect(
          findings(bank, result.history).every((f) => f.status === 'Insufficient evidence'),
        ).toBe(true);
      }
    },
  );
  it('preserves coverage for varied and prerequisite-first response trajectories', () => {
    let seed = 173;
    for (let trial = 0; trial < 120; trial++) {
      const result = simulate(() => {
        seed = (seed * 16807) % 2147483647;
        return { correct: seed % 3 !== 0, assisted: seed % 11 === 0 };
      });
      expect(findings(bank, result.history).every((f) => f.count >= 3)).toBe(true);
    }
  });
  it('orders learning prerequisites before dependent gaps, using only submitted evidence', () => {
    const weak = simulate(() => ({ correct: false, assisted: false }));
    const report = makeReport(bank, weak.history, weak.stop);
    expect(report.answered).toBe(weak.history.length);
    expect(report.findings.every((f) => f.correct === 0)).toBe(true);
    for (const f of report.findings)
      for (const prerequisite of f.prerequisites)
        expect(report.learningOrder.indexOf(prerequisite)).toBeLessThan(
          report.learningOrder.indexOf(f.competencyId),
        );
  });
  it('grades every published task server-side, rejects forged fields and does not evaluate code', () => {
    for (const q of bank.questions) expect(grade(q, answer(q)).correct).toBe(true);
    const q = bank.questions.find((q) => q.id === 'values-patch-2')!;
    expect(() => grade(q, { text: '4', score: 1 } as Answer)).toThrow();
    expect(() => grade(q, { selected: 0 })).toThrow();
    expect(grade(q, { text: '__import__("os").system("false")' }).correct).toBe(false);
    const order = bank.questions.find((q) => q.type === 'ordering')!;
    expect(() => grade(order, { order: ['s0', 's0', 's0', 's0'] })).toThrow();
  });
  it('projects no keys, explanations or rubrics before completion', () => {
    for (const q of bank.questions) {
      const projected = publicQuestion(q);
      for (const secret of ['correct', 'expected', 'order', 'hint', 'explanation', 'misconception'])
        expect(projected).not.toHaveProperty(secret);
    }
  });
  it('rejects repeated or unknown evidence', () => {
    const e = { questionId: bank.questions[0].id, correct: true, assisted: false };
    expect(() => selectNext(bank, [e, e])).toThrow('Invalid');
    expect(() => selectNext(bank, [{ ...e, questionId: 'unknown' }])).toThrow('Invalid');
  });
});
