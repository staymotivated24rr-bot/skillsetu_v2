import { describe, expect, it } from 'vitest';
import {
  optionPresentation,
  optionPresentationIssues,
} from '../src/lib/diagnostic/option-presentation';
import { starterDiagnostic, starterSource } from '../src/lib/diagnostic/starter-v3/bank';
import { countLabel, diagnosticSentence } from '../src/lib/diagnostic/presentation';
import { numericFormatError, numericResult } from '../src/lib/diagnostic/numeric';
import { starterLessonFor } from '../src/lib/diagnostic/starter-v3/lessons';
import { validateBank, grade } from '../src/lib/diagnostic/engine';

describe('student audit presentation regressions', () => {
  it('distinguishes Q10 spaces visually and for assistive technology without changing strings', () => {
    expect(optionPresentation('  python 5  ').visible).toBe('␠␠python␠5␠␠');
    expect(optionPresentation('python 5').visible).toBe('python 5');
    expect(optionPresentation('  python 5  ').accessible).toContain('[space]');
    expect(optionPresentationIssues(['  python 5  ', 'python 5'])).toEqual([]);
  });
  it('preserves Q6/Q18 line order and exposes newlines, tabs and hidden Unicode', () => {
    expect(optionPresentation('cleanup\n4').visible).toBe('cleanup↵\n4');
    expect(optionPresentation('open\n5\nclose').accessible).toBe(
      'open [line break] 5 [line break] close',
    );
    expect(optionPresentation('\tx\u200b').visible).toBe('⇥x\\u{200b}');
  });
  it('audits all 360 source option sets and all 216 presented MCQs', () => {
    expect(starterSource.questions).toHaveLength(360);
    for (const q of starterSource.questions)
      expect(optionPresentationIssues(Object.values(q.options)), q.id).toEqual([]);
    const mcqs = starterDiagnostic.questions.filter((q) => q.options);
    expect(mcqs).toHaveLength(216);
    for (const q of mcqs) expect(optionPresentationIssues(q.options!), q.id).toEqual([]);
  });
  it('blocks new runs with genuinely ambiguous rendering rather than grading hidden differences', () => {
    const q = starterDiagnostic.questions.find((q) => q.options)!;
    const bank = {
      ...starterDiagnostic,
      questions: starterDiagnostic.questions.map((item) =>
        item.id === q.id ? { ...item, options: ['same', 'same', 'other', 'last'] } : item,
      ),
    };
    expect(() => validateBank(bank)).toThrow('Quarantined ambiguous option presentation');
    expect(() =>
      grade({ ...q, options: ['same', 'same', 'other', 'last'] }, { selected: 0 }),
    ).toThrow('cannot be scored');
    expect(optionPresentationIssues(['é', 'e\u0301'])).not.toEqual([]);
  });
  it.each([
    [{ kind: 'integer', places: 0 }, '6.0', false],
    [{ kind: 'integer', places: 0 }, '+0006', true],
    [{ kind: 'float', places: 2 }, '4.7', false],
    [{ kind: 'float', places: 2 }, '+004.75', true],
  ] as const)(
    'validates the numeric format without access to a key: %s %s',
    (format, text, valid) => {
      expect(numericFormatError(format, text) === null).toBe(valid);
    },
  );
  it('keeps semantic numeric comparison and singular decimal instructions', () => {
    expect(numericResult({ kind: 'float', places: 2, expected: '4.75' }, '+004.75').correct).toBe(
      true,
    );
    expect(numericFormatError({ kind: 'float', places: 1 }, '4')).toContain('1 digit after');
  });
  it('routes complexity repair to halving and logarithmic comparison, not graphs', () => {
    for (const subskill of ['Algorithmic complexity', 'Time complexity', 'Binary search']) {
      const lesson = starterLessonFor('starter-dsa', subskill);
      expect(lesson.title).toContain('O(log n)');
      expect(lesson.concept).toContain('O(n)');
      expect(lesson.example).toContain('128 → 64');
      expect(lesson.scenario?.explain).toContain('halves');
      expect(JSON.stringify(lesson)).not.toMatch(/graph|priority queue|negative edges/i);
    }
    expect(starterLessonFor('starter-dsa', 'Graph algorithms').title).not.toContain('binary');
  });
  it('handles singular, zero and irregular plurals consistently', () => {
    expect(
      diagnosticSentence('1 prior responses; 1 families, 11 responses and 1 unassisted answers'),
    ).toBe('1 prior response; 1 family, 11 responses and 1 unassisted answer');
    expect(countLabel(1, 'response')).toBe('1 response');
    expect(countLabel(0, 'answer')).toBe('0 answers');
    expect(countLabel(2, 'task type')).toBe('2 task types');
    expect(countLabel(1, 'unaided match', 'unaided matches')).toBe('1 unaided match');
    expect(countLabel(2, 'independent family', 'independent families')).toBe(
      '2 independent families',
    );
  });
});
