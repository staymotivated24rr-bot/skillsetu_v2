import { describe, expect, it } from 'vitest';
import { variablesLesson } from '../src/lib/learning-studio/variables-lesson';
import { lessonForOrdinal } from '../src/lib/learning-studio/catalog';
import { publicLesson } from '../src/lib/learning-studio/content';
import { evaluateStep, validateLesson } from '../src/lib/learning-studio/evaluation';
import { outputMatches } from '../src/lib/learning-studio/output-contract';
import { lessonMastery } from '../src/lib/learning-studio/mastery';
const rows = () =>
  variablesLesson.masteryPolicy!.checkpoints.map((stepId) => ({
    stepId,
    correct: true,
    first: true,
    assisted: false,
  }));
const final = { stepId: 'vr-final', correct: true, first: true, assisted: false };
describe('original variables, references and mutation lesson', () => {
  it('has twelve versioned original steps and valid reference graphs', () => {
    expect(variablesLesson.steps).toHaveLength(12);
    expect(() => validateLesson(variablesLesson)).not.toThrow();
    expect(new Set(variablesLesson.steps.map((s) => s.id)).size).toBe(12);
    for (const s of variablesLesson.steps) expect(evaluateStep(s, s.key!).correct).toBe(true);
  });
  it('projects no private keys, final variants, feedback or hints', () => {
    const value = JSON.stringify(publicLesson(variablesLesson));
    for (const key of ['key', 'masteryVariants', 'feedback', 'hint', 'privateTask', 'expected'])
      expect(value).not.toContain(`"${key}":`);
  });
  it('accepts constrained literal quote/spacing equivalents and rejects different semantics or code', () => {
    expect(outputMatches('[2,5]', '[2, 5]', 'literal')).toBe(true);
    expect(outputMatches("['oak', 'elm']", '["oak","elm"]', 'literal')).toBe(true);
    expect(outputMatches('[2,5,]', '[2, 5]', 'literal')).toBe(true);
    expect(outputMatches('[2,6]', '[2,5]', 'literal')).toBe(false);
    expect(outputMatches('True', '1', 'literal')).toBe(false);
    expect(outputMatches("['[']", "['(']", 'literal')).toBe(false);
    expect(outputMatches(' oak ', 'oak', 'plain')).toBe(false);
    for (const input of ['__import__("os")', '[2,5]; print(1)', '[2] + [5]', '[2,', '[2 5]'])
      expect(outputMatches(input, '[2,5]', 'literal')).toBe(false);
  });
  it('keeps first unaided checkpoints and requires a fresh perfect first final response', () => {
    expect(lessonMastery(variablesLesson, rows(), 1)!.status).toBe('awaiting-check');
    expect(lessonMastery(variablesLesson, [...rows(), final], 1)!.status).toBe('mastered');
    const wrong = rows();
    wrong[0].correct = false;
    expect(lessonMastery(variablesLesson, [...wrong, final], 1)!.status).toBe('mastered');
    wrong[1].assisted = true;
    expect(lessonMastery(variablesLesson, [...wrong, final], 1)!.status).toBe('needs-practice');
    expect(
      lessonMastery(
        variablesLesson,
        [...rows(), { ...final, correct: false }, { ...final, first: false }],
        1,
      )!.status,
    ).toBe('needs-practice');
    expect(lessonMastery(variablesLesson, [...rows(), final], 4)!.freshForm).toBe(false);
    expect(lessonMastery(variablesLesson, [...rows(), final], 4)!.status).toBe('needs-practice');
  });
  it('selects and validates three different pinned final forms without exposing future forms', () => {
    const forms = [1, 2, 3].map((n) => lessonForOrdinal(variablesLesson, n));
    expect(new Set(forms.map((l) => l.steps.at(-1)!.code)).size).toBe(3);
    for (const l of forms) {
      const s = l.steps.at(-1)!;
      expect(evaluateStep(s, s.key!).correct).toBe(true);
      expect(publicLesson(l).steps.at(-1)).not.toHaveProperty('masteryVariants');
    }
    expect(lessonForOrdinal(variablesLesson, 4).steps.at(-1)!.code).toBe(
      forms[0].steps.at(-1)!.code,
    );
  });
});
