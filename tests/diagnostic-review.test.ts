import { expect, it } from 'vitest';
import { blockDiagnostic as bank } from '../src/lib/diagnostic/block-bank';
import { buildQuestionReview } from '../src/lib/diagnostic/report-review';
import { makeReport } from '../src/lib/diagnostic/engine';
const examples = [
  bank.questions.find((q) => q.codeSlots)!,
  bank.questions.find((q) => q.options)!,
  bank.questions.find((q) => q.steps)!,
  bank.questions.find((q) => q.expected)!,
];
function fixture() {
  const rows = examples.map((q, i) => ({
    questionId: q.id,
    correct: i % 2 === 0,
    assisted: i === 0,
    payload: JSON.stringify(
      q.codeSlots
        ? { blocks: q.blockKey }
        : q.options
          ? { selected: 0 }
          : q.steps
            ? { order: q.steps.map((s) => s.id) }
            : { text: 'unsure' },
    ),
  }));
  return { rows, report: makeReport(bank, rows, 'saved fixture') };
}
it('reconstructs complete text, choice, ordering and block questions with their saved answers', () => {
  const { rows, report } = fixture();
  const review = buildQuestionReview(bank, report, rows);
  expect(review).toHaveLength(rows.length);
  for (const [i, item] of review.entries()) {
    expect(item.question?.prompt).toBe(examples[i].prompt);
    expect(item.question?.code).toBe(examples[i].code);
    expect(item.answer).toEqual(JSON.parse(rows[i].payload));
    expect(item.correct).toBe(rows[i].correct);
    expect(item.assisted).toBe(rows[i].assisted);
  }
  expect(review[1].question?.options).toEqual(examples[1].options);
  expect(review[2].question?.steps).toEqual(examples[2].steps);
});
it('never includes private answer keys or expected outputs in the question projection', () => {
  const { rows, report } = fixture();
  for (const entry of buildQuestionReview(bank, report, rows)) {
    for (const key of [
      'blockKey',
      'correct',
      'order',
      'expected',
      'contract',
      'misconception',
      'explanation',
      'hint',
    ])
      expect(entry.question).not.toHaveProperty(key);
  }
});
it('uses the sealed outcome and original snapshot without regrading or changing records', () => {
  const { rows, report } = fixture();
  const before = JSON.stringify(report),
    saved = JSON.stringify(rows);
  report.evidence[0].correct = false;
  const snapshot = structuredClone(bank);
  snapshot.questions.find((q) => q.id === rows[0].questionId)!.prompt = 'Archived prompt';
  const review = buildQuestionReview(snapshot, report, rows);
  expect(review[0].correct).toBe(false);
  expect(review[0].question?.prompt).toBe('Archived prompt');
  expect(JSON.stringify(rows)).toBe(saved);
  report.evidence[0].correct = true;
  expect(JSON.stringify(report)).toBe(before);
});
it('keeps malformed or unavailable legacy payloads readable without inventing answers', () => {
  const { rows, report } = fixture();
  rows[0].payload = 'not-json';
  rows[1].payload = 'null';
  rows[2].payload = JSON.stringify({ unrecognized: 'old shape' });
  const review = buildQuestionReview(bank, report, rows.slice(0, 3));
  expect(review.every((r) => r.answer === null)).toBe(true);
  expect(review.map((r) => r.correct)).toEqual(report.evidence.map((e) => e.correct));
});
it('preserves stored evidence order, including a question missing from an archived snapshot', () => {
  const { rows, report } = fixture();
  const original = JSON.stringify(report);
  const snapshot = {
    ...bank,
    questions: bank.questions.filter((q) => q.id !== rows[0].questionId),
  };
  const review = buildQuestionReview(snapshot, report, [...rows].reverse());
  expect(review.map((r) => r.questionId)).toEqual(report.evidence.map((e) => e.questionId));
  expect(review[0].question).toBeNull();
  expect(review[0].answer).not.toBeNull();
  expect(JSON.stringify(report)).toBe(original);
});
import { pythonDiagnostic as legacyBank } from '../src/lib/diagnostic/python-bank';
import { reviewedDiagnostic as reviewedBank } from '../src/lib/diagnostic/reviewed-bank';
import { grade } from '../src/lib/diagnostic/engine';
it.each([legacyBank, reviewedBank, bank])(
  'resolves correct answers for every question in $id, across all formats',
  (form) => {
    const report = makeReport(
      form,
      form.questions.map((q) => ({ questionId: q.id, correct: false, assisted: false })),
      'read-only review fixture',
    );
    const before = JSON.stringify(report);
    const review = buildQuestionReview(form, report, []);
    for (const [i, item] of review.entries()) {
      const q = form.questions[i],
        solution = item.correctAnswer;
      expect(solution).not.toBeNull();
      expect(item.correct).toBe(false);
      if (solution!.kind === 'option') {
        expect(solution!.text).toBe(q.options![q.correct!]);
        expect(grade(q, { selected: solution!.index }).correct).toBe(true);
      } else if (solution!.kind === 'ordering') {
        expect(solution!.steps).toEqual(
          q.order!.map((id) => q.steps!.find((s) => s.id === id)!.text),
        );
      } else if (solution!.kind === 'blocks') {
        const answer = {
          blocks: Object.fromEntries(solution!.blocks.map((b) => [b.slotId, b.choiceId])),
        };
        expect(grade(q, answer).correct).toBe(true);
        expect(solution!.code).not.toContain('{{');
        for (const b of solution!.blocks)
          expect(
            q.codeSlots!.find((s) => s.id === b.slotId)!.choices.find((c) => c.id === b.choiceId)!
              .code,
          ).toBe(b.code);
      } else for (const text of solution!.accepted) expect(grade(q, { text }).correct).toBe(true);
    }
    expect(JSON.stringify(report)).toBe(before);
  },
);
it('uses archived authored solutions, not the live bank, without changing the sealed grade', () => {
  const { rows, report } = fixture();
  const snapshot = structuredClone(bank);
  const q = snapshot.questions.find((q) => q.id === rows[1].questionId)!;
  q.correct = (q.correct! + 1) % q.options!.length;
  const saved = JSON.stringify(report);
  const review = buildQuestionReview(snapshot, report, rows);
  expect(review[1].correctAnswer).toEqual({
    kind: 'option',
    index: q.correct,
    text: q.options![q.correct],
  });
  expect(review[1].correct).toBe(report.evidence[1].correct);
  expect(JSON.stringify(report)).toBe(saved);
});
it('shows all authored accepted forms and never invents a solution for missing content', () => {
  const q = bank.questions.find((q) => (q.expected?.length ?? 0) > 1)!;
  const report = makeReport(
    bank,
    [{ questionId: q.id, correct: false, assisted: false }],
    'fixture',
  );
  expect(buildQuestionReview(bank, report, [])[0].correctAnswer).toEqual({
    kind: 'text',
    accepted: [...new Set(q.contract?.examples ?? q.expected)],
  });
  expect(buildQuestionReview({ ...bank, questions: [] }, report, [])[0].correctAnswer).toBeNull();
});
