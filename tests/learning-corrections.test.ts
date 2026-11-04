import { expect, it } from 'vitest';
import { starterDiagnostic as bank } from '../src/lib/diagnostic/starter-v3/bank';
import { selectLearning } from '../src/lib/learning-studio/selector';
import { simulationReport, practiceHistory } from './fixtures/learning-profiles';
import {
  loopsLesson,
  divisionLesson,
  transferLesson,
} from '../src/lib/learning-studio/correction-lessons';
import { publicLesson } from '../src/lib/learning-studio/content';
import { evaluateStep, validateLesson } from '../src/lib/learning-studio/evaluation';
import { lessonForOrdinal } from '../src/lib/learning-studio/catalog';
import { instructionalLesson } from '../src/lib/learning-studio/lesson-navigation';
function profile() {
  const report = simulationReport(true);
  report.answered = 24;
  report.bankId = bank.id;
  report.findings = bank.competencies.map((c) => ({
    ...simulationReport(true).findings[0],
    competencyId: c.id,
    name: c.name,
    moduleSkillId: c.moduleSkillId,
    prerequisites: c.prerequisites,
    nextSubskill: c.subskills[0],
    incorrect: 0,
    unsure: 0,
    assistedCount: 0,
  }));
  return {
    bank,
    report,
    sourceRunId: 'synthetic-source',
    histories: [] as ReturnType<typeof practiceHistory>[],
    now: '2026-11-04T00:00:00Z',
  };
}
it('A: all eight independent strengths recommend a new transfer challenge without inventing mastery', () => {
  const input = profile(),
    before = JSON.stringify(input);
  const r = selectLearning(input);
  expect(r.category).toBe('advanced');
  expect(r.action.href).toContain('python-transfer-manifest');
  expect(r.suggestedDifficulty).toBe(3);
  expect(r.practice.status).toBe('not-started');
  expect(r.reason).not.toContain('complete Python mastery');
  expect(JSON.stringify(input)).toBe(before);
});
it('B: unfinished 2/12 foundation lesson and hints remain separate continuation, never a weakness', () => {
  const input = profile();
  const h = practiceHistory({ assisted: true, hints: 3 });
  h.completed = 2;
  h.status = 'started';
  h.attempts = h.attempts.slice(0, 2);
  input.histories = [h];
  const r = selectLearning(input);
  expect(r.category).toBe('advanced');
  expect(r.practice.hintUses).toBe(0);
  expect(r.continueLearning).toMatchObject([{ completed: 2, total: 12, runId: h.runId }]);
  expect(r.continueLearning![0].href).toContain('run=');
});
it('C: repeated loop misses select the loop lesson and do not invent prerequisite failures', () => {
  const input = profile();
  Object.assign(input.report.findings[0], {
    status: 'Likely gap',
    correct: 0,
    incorrect: 3,
    nextSubskill: 'For loops and range',
  });
  const r = selectLearning(input);
  expect(r.category).toBe('remediation');
  expect(r.action.href).toContain('python-loop-boundaries');
  expect(r.prerequisiteFor).toBeUndefined();
});
it('D: uncertain loop evidence requests fresh verification without calling it weakness', () => {
  const input = profile();
  Object.assign(input.report.findings[0], {
    status: 'Insufficient evidence',
    correct: 1,
    incorrect: 1,
    unsure: 1,
    nextSubskill: 'For loops and range',
  });
  const r = selectLearning(input);
  expect(r.category).toBe('verification');
  expect(r.diagnosticEvidence).toBe('uncertain');
  expect(r.reason).toContain('incomplete or conflicting');
  expect(r.action.href).toContain('python-loop-boundaries');
});
it('E: actual independent practice misses explain the contrast without regrading strength', () => {
  const input = profile();
  input.histories = [practiceHistory({ correct: [false, false, true, true, true] })];
  const before = JSON.stringify(input.report);
  const r = selectLearning(input);
  expect(r.category).toBe('verification');
  expect(r.reasonCode).toBe('verify-practice-contrast');
  expect(r.diagnosticEvidence).toBe('strength');
  expect(r.reason).toContain('stays as recorded');
  expect(JSON.stringify(input.report)).toBe(before);
});
it.each([loopsLesson, divisionLesson, transferLesson])(
  'validates original $id keys, variants and progressive solution privacy',
  (lesson) => {
    expect(() => validateLesson(lesson)).not.toThrow();
    for (let ordinal = 1; ordinal <= 3; ordinal++)
      for (const step of lessonForOrdinal(lesson, ordinal).steps) {
        expect(evaluateStep(step, step.key!).correct).toBe(true);
        expect(step.accessibility.label).toBeTruthy();
      }
    const view = publicLesson(lesson);
    expect(view.steps.slice(1).every((s) => s.locked && !s.code && !s.cells && !s.slots)).toBe(
      true,
    );
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/"(key|masteryVariants|hints|hint|feedback)":/);
    expect(publicLesson(lesson, lesson.steps.length - 1).steps.every((s) => !s.locked)).toBe(true);
  },
);
it('enforces float precision in final state cells and rejects semantic numeric differences', () => {
  const final = divisionLesson.steps.find((s) => s.id === 'division-verify')!;
  expect(() => evaluateStep(final, { state: { groups: '7', share: '7' } })).toThrow('exactly 1');
  expect(evaluateStep(final, { state: { groups: '7', share: '7.5' } }).correct).toBe(true);
  expect(evaluateStep(final, { state: { groups: '7', share: '7.0' } }).correct).toBe(false);
});
it('does not send unrelated fundamentals subskills to a generic numeric lesson', () => {
  expect(instructionalLesson('starter-fundamentals', 'For loops and range')).toBe(loopsLesson.id);
  expect(instructionalLesson('starter-fundamentals', 'Closures')).toBeUndefined();
});

it('fresh independent verification can resolve earlier practice difficulty without rewriting it', () => {
  const input = profile();
  input.histories = [
    practiceHistory({ correct: [false, false, true, true, true], final: false }),
    practiceHistory({ ordinal: 2 }),
    practiceHistory({ ordinal: 3 }),
  ];
  const before = JSON.stringify(input.histories);
  expect(selectLearning(input).category).toBe('advanced');
  expect(JSON.stringify(input.histories)).toBe(before);
});
it('does not advertise an already exposed final form as fresh transfer evidence', () => {
  const input = profile();
  input.histories = [1, 2, 3].map((ordinal) => ({
    ...practiceHistory({ ordinal }),
    lessonId: 'python-transfer-manifest',
    moduleVersionId: 'python-transfer-manifest@1.0.0-draft.1',
    total: 4,
    completed: 4,
    attempts: [
      {
        stepId: 'manifest-verify',
        attempt: 1,
        first: true,
        correct: true,
        assisted: false,
        at: '2026-11-03T00:00:00Z',
      },
    ],
  }));
  const r = selectLearning(input);
  expect(r.variant.available).toBe(false);
  expect(r.action.label).toContain('exhausted');
  expect(r.reason).toContain('another fresh task must be authored');
});

it('clearly discloses unimplemented exact-topic verification instead of calling a static overview a fresh check', () => {
  const input = profile();
  Object.assign(input.report.findings[2], {
    status: 'Insufficient evidence',
    correct: 1,
    incorrect: 1,
    unsure: 1,
    nextSubskill: 'Closures',
  });
  const r = selectLearning(input);
  expect(r.category).toBe('verification');
  expect(r.action.kind).toBe('content-needed');
  expect(r.action.label).toContain('pending');
  expect(r.reason).toContain('does not verify proficiency');
});
