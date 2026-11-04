import { describe, it, expect } from 'vitest';
import { starterDiagnostic as bank } from '../src/lib/diagnostic/starter-v3/bank';
import { grade, makeReport, selectNext } from '../src/lib/diagnostic/engine';
import {
  competencyEvidence,
  hybridNextFindings,
  HYBRID_VERSION,
  responseOutcome,
} from '../src/lib/diagnostic/hybrid-vnext';
import { profileNames, simulateProfile } from './helpers/hybrid-profiles';
import type { Evidence, Question } from '../src/lib/diagnostic/types';

const context = { version: HYBRID_VERSION, seed: 'unit-seed' };
function evidence(q: Question, right: boolean, assisted = false): Evidence {
  const payload = q.numeric
    ? {
        text: right
          ? q.numeric.expected
          : '-99999' + (q.numeric.places ? '.' + '0'.repeat(q.numeric.places) : ''),
      }
    : { selected: right ? q.correct : (q.correct! + 1) % 4 };
  return {
    questionId: q.id,
    correct: grade(q, payload).correct,
    assisted,
    payload: JSON.stringify(payload),
  };
}
const distinct = (competency: string, difficulty: number) =>
  bank.questions
    .filter((q) => q.competencyId === competency && q.difficulty === difficulty)
    .filter((q, i, qs) => qs.findIndex((other) => other.exposureFamily === q.exposureFamily) === i);
describe('hybrid v4.1 profile simulation', () => {
  for (const profile of profileNames)
    it(`${profile}: balanced, bounded, private and reproducible`, () => {
      const run = simulateProfile(profile);
      expect(run.trace.length).toBeGreaterThanOrEqual(24);
      expect(run.trace.length).toBeLessThanOrEqual(30);
      expect(new Set(run.trace.map((t) => t.family)).size).toBe(run.trace.length);
      expect(new Set(run.trace.map((t) => t.itemId)).size).toBe(run.trace.length);
      for (const c of bank.competencies) {
        const trace = run.trace.filter((t) => t.competency === c.id);
        expect(trace[0].difficulty).toBe(2);
        expect(trace.length).toBeGreaterThanOrEqual(3);
        expect(run.trace.slice(0, 24).filter((t) => t.competency === c.id)).toHaveLength(3);
      }
      expect(simulateProfile(profile)).toEqual(run);
      expect(run.report.engineVersion).toBe(HYBRID_VERSION);
      for (const finding of run.report.findings) {
        expect(finding.independent + finding.unsure! + finding.assistedCount!).toBe(finding.count);
        expect(finding.correct + finding.incorrect!).toBe(finding.independent);
        expect(
          finding.difficultyEvidence!.reduce(
            (n, l) => n + l.correct + l.incorrect + l.unsure + l.assisted,
            0,
          ),
        ).toBe(finding.count);
      }
      if (profile === 'advanced') {
        expect(run.trace).toHaveLength(24);
        expect(run.report.findings.every((f) => f.status === 'Demonstrated strength')).toBe(true);
      }
      if (profile === 'beginner')
        expect(run.report.findings.every((f) => f.status === 'Likely gap')).toBe(true);
      if (profile === 'fundamentals-strong-dsa-weak') {
        expect(run.report.findings.find((f) => f.competencyId === 'fundamentals')!.status).toBe(
          'Demonstrated strength',
        );
        expect(run.report.findings.find((f) => f.competencyId === 'dsa')!.status).toBe(
          'Likely gap',
        );
        expect(run.report.learningOrder).toContain('dsa');
      }
      if (profile === 'unsure') {
        expect(run.trace).toHaveLength(30);
        expect(run.trace.some((t) => t.difficulty === 1)).toBe(true);
        expect(
          run.report.findings.every(
            (f) =>
              f.status === 'Insufficient evidence' &&
              f.independent === 0 &&
              f.incorrect === 0 &&
              !f.hypotheses?.length,
          ),
        ).toBe(true);
        expect(
          run.report.evidence.every((e) => e.outcome === 'unsure' && e.misconception === null),
        ).toBe(true);
      }
      if (profile === 'assisted')
        expect(
          run.report.findings.every(
            (f) => f.independent === 0 && f.status === 'Insufficient evidence',
          ),
        ).toBe(true);
      if (profile === 'misconception') {
        const collections = run.trace.filter((t) => t.competency === 'collections8');
        expect(collections[0].family).toBe('SS-PY-FAM-021');
        expect(collections[1].family).toBe('SS-PY-FAM-022');
        expect(collections[1].rationale).toContain('Different-family misconception probe');
        expect(
          run.report.findings
            .find((f) => f.competencyId === 'collections8')!
            .hypotheses?.some((h) => h.confirmed && h.observations >= 2),
        ).toBe(true);
      }
    });
});
describe('independent difficulty and uncertainty', () => {
  const medium = distinct('fundamentals', 2),
    advanced = distinct('fundamentals', 3);
  it('holds after one answer, adjusts after two, clamps levels and isolates other competencies', () => {
    const one = [evidence(medium[0], true)];
    expect(competencyEvidence(bank, one, 'fundamentals').difficulty).toBe(2);
    const two = [...one, evidence(medium[1], true)];
    expect(competencyEvidence(bank, two, 'fundamentals').difficulty).toBe(3);
    expect(competencyEvidence(bank, two, 'dsa').difficulty).toBe(2);
    const four = [...two, evidence(advanced[0], false), evidence(advanced[1], false)];
    expect(competencyEvidence(bank, four, 'fundamentals').difficulty).toBe(2);
    expect(
      competencyEvidence(
        bank,
        [evidence(medium[0], false), evidence(medium[1], false)],
        'fundamentals',
      ).difficulty,
    ).toBe(1);
  });
  it('assistance resets a streak, while unsure is separate and can request simpler evidence', () => {
    const rows = [
      evidence(medium[0], true),
      evidence(medium[1], true, true),
      evidence(medium[2], true),
    ];
    expect(competencyEvidence(bank, rows, 'fundamentals').difficulty).toBe(2);
    const unsure = {
      questionId: medium[0].id,
      correct: false,
      assisted: false,
      payload: '{"text":"unsure"}',
    };
    expect(responseOutcome(unsure)).toBe('unsure');
    expect(competencyEvidence(bank, [unsure], 'fundamentals').difficulty).toBe(1);
    const finding = hybridNextFindings(bank, [unsure])[0];
    expect(finding).toMatchObject({
      unsure: 1,
      incorrect: 0,
      independent: 0,
      status: 'Insufficient evidence',
    });
  });
  it('does not promote proficiency after two easier fallback successes', () => {
    const easy = distinct('fundamentals', 1);
    expect(
      competencyEvidence(bank, [evidence(easy[0], true), evidence(easy[1], true)], 'fundamentals')
        .difficulty,
    ).toBe(2);
  });
  it('can resolve one mixed observation with five independent observations', () => {
    const rows = [
      evidence(medium[0], false),
      evidence(medium[1], true),
      evidence(medium[2], true),
      evidence(advanced[0], true),
      evidence(advanced[1], true),
    ];
    expect(hybridNextFindings(bank, rows)[0].status).toBe('Demonstrated strength');
  });
});
describe('misconception confirmation and deterministic selection', () => {
  it('uses additional questions for an eligible unconfirmed probe even when coarse competency gaps are resolved', () => {
    const alias = bank.questions.find((q) => q.id === 'SS-PY-0061')!,
      probe = bank.questions.find((q) => q.id === 'SS-PY-0064')!;
    const synthetic = {
      ...bank,
      questions: bank.questions.map((q) => ({
        ...q,
        optionHypotheses: [alias.id, probe.id].includes(q.id)
          ? q.options!.map((_, i) =>
              i === (q.correct! + 1) % 4 ? 'test-authored shared probe' : null,
            )
          : undefined,
      })),
    };
    const rows: Evidence[] = [];
    for (const c of bank.competencies) {
      const medium = distinct(c.id, 2).filter((q) => q.exposureFamily !== 'SS-PY-FAM-022');
      rows.push(
        evidence(medium[0], false),
        evidence(medium[1], false),
        evidence(distinct(c.id, 1)[0], false),
      );
    }
    expect(hybridNextFindings(synthetic, rows).every((f) => f.status === 'Likely gap')).toBe(true);
    const next = selectNext(synthetic, rows, context);
    expect(synthetic.questions.find((q) => q.id === next.questionId)!.exposureFamily).toBe(
      'SS-PY-FAM-022',
    );
    expect(next.rationale).toContain('Different-family misconception probe');
  });
  it('can finish at 26 after two extra independent tasks resolve one uncertain competency', () => {
    const rows: Evidence[] = [];
    let missed = false;
    let next = selectNext(bank, rows, context);
    while (next.questionId) {
      const q = bank.questions.find((q) => q.id === next.questionId)!;
      const wrong = q.competencyId === 'fundamentals' && !missed;
      if (wrong) missed = true;
      rows.push(evidence(q, !wrong));
      next = selectNext(bank, rows, context);
      expect(rows.length).toBeLessThanOrEqual(30);
    }
    expect(rows).toHaveLength(26);
    expect(hybridNextFindings(bank, rows).every((f) => f.status === 'Demonstrated strength')).toBe(
      true,
    );
  });
  it('does not infer a misconception without tags, and retains contrasting probe evidence', () => {
    const alias = bank.questions.find((q) => q.id === 'SS-PY-0061')!,
      copy = bank.questions.find((q) => q.id === 'SS-PY-0064')!;
    const wrong = {
      questionId: alias.id,
      correct: false,
      assisted: false,
      payload: JSON.stringify({
        selected: alias.optionHypotheses!.findIndex((h) => h?.includes('independent copy')),
      }),
    };
    const first = hybridNextFindings(bank, [wrong]).find((f) => f.competencyId === 'collections8')!;
    expect(first.hypotheses![0]).toMatchObject({
      observations: 1,
      confirmed: false,
      state: 'suspected',
    });
    const contrast = hybridNextFindings(bank, [wrong, evidence(copy, true)]).find(
      (f) => f.competencyId === 'collections8',
    )!;
    expect(contrast.hypotheses![0]).toMatchObject({
      counterExamples: 1,
      confirmed: false,
      state: 'mixed',
    });
    const noTags = {
      ...bank,
      questions: bank.questions.map((q) => ({ ...q, optionHypotheses: undefined })),
    };
    expect(
      grade({ ...alias, optionHypotheses: undefined }, { text: 'unsure' }, { allowUnsure: true })
        .correct,
    ).toBe(false);
    expect(
      hybridNextFindings(noTags, [wrong]).find((f) => f.competencyId === 'collections8')!
        .hypotheses,
    ).toEqual([]);
    expect(
      hybridNextFindings(bank, [{ ...wrong, assisted: true }]).find(
        (f) => f.competencyId === 'collections8',
      )!.hypotheses,
    ).toEqual([]);
  });
  it('uses a stable seed across refresh and varies only equally ranked candidates', () => {
    const first = selectNext(bank, [], context);
    expect(selectNext(bank, [], { ...context })).toEqual(first);
    const rows = [
      evidence(
        bank.questions.find((q) => q.id === first.questionId)!,
        true,
      ),
    ];
    expect(selectNext(bank, JSON.parse(JSON.stringify(rows)), context)).toEqual(
      selectNext(bank, rows, context),
    );
    const starts = new Set(
      Array.from(
        { length: 30 },
        (_, i) => selectNext(bank, [], { version: HYBRID_VERSION, seed: 'seed-' + i }).questionId,
      ),
    );
    expect(starts.size).toBeGreaterThan(1);
  });
  it('rejects duplicates, repeated families, unknown items and missing seeds; stops on exhaustion', () => {
    const q = bank.questions[0],
      variant = bank.questions[1],
      row = evidence(q, true);
    expect(() => selectNext(bank, [row, row], context)).toThrow();
    expect(() => selectNext(bank, [row, evidence(variant, true)], context)).toThrow(
      'Repeated family',
    );
    expect(() => selectNext(bank, [{ ...row, questionId: 'unknown' }], context)).toThrow();
    expect(() => selectNext(bank, [], { version: HYBRID_VERSION, seed: '' })).toThrow();
    expect(
      selectNext({ ...bank, questions: bank.questions.slice(0, 3) }, [row], context).rationale,
    ).toContain('exhausted');
  });
  it('keeps the historical selector and report dispatch unchanged', () => {
    const old = selectNext(bank, []);
    expect(selectNext(bank, [], { version: 'hybrid-4.0.0-draft.1', seed: 'historical' })).toEqual(
      old,
    );
    expect(makeReport(bank, [], 'fixture').engineVersion).toBe('hybrid-4.0.0-draft.1');
    expect(makeReport(bank, [], 'fixture', HYBRID_VERSION).engineVersion).toBe(HYBRID_VERSION);
  });
});
