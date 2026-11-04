import { answerSchema, publicQuestion } from './engine';
import type { Bank, CorrectReviewAnswer, Question, QuestionReview, Report } from './types';

/** Solutions are projected only by the owned, completed-report view, never active questions. */
function correctReviewAnswer(q: Question): CorrectReviewAnswer | null {
  if (q.codeSlots) {
    const blocks = q.codeSlots.map((slot) => {
      const choice = slot.choices.find((c) => c.id === q.blockKey?.[slot.id]);
      return choice
        ? { slotId: slot.id, label: slot.label, choiceId: choice.id, code: choice.code }
        : null;
    });
    if (!q.code || blocks.some((b) => b === null)) return null;
    const resolved = blocks.filter((b): b is NonNullable<typeof b> => b !== null);
    return {
      kind: 'blocks',
      blocks: resolved,
      code: q.code.replace(
        /\{\{([A-Za-z0-9-]+)\}\}/g,
        (_, id: string) => resolved.find((b) => b.slotId === id)?.code ?? '[unavailable]',
      ),
    };
  }
  if (q.options) {
    const text = q.options[q.correct!];
    return text !== undefined ? { kind: 'option', index: q.correct!, text } : null;
  }
  if (q.steps) {
    const steps = q.order?.map((id) => q.steps!.find((s) => s.id === id)?.text);
    return steps?.length && steps.every((s) => s !== undefined)
      ? { kind: 'ordering', steps: steps as string[] }
      : null;
  }
  const accepted = [...new Set(q.contract?.examples ?? q.expected ?? [])];
  return accepted.length ? { kind: 'text', accepted } : null;
}

/** Read-only enrichment of a sealed report. Never regrade or rewrite historical evidence. */
export function buildQuestionReview(
  bank: Bank,
  report: Report,
  responses: { questionId: string; payload: string }[],
): QuestionReview[] {
  const submitted = new Map(responses.map((r) => [r.questionId, r.payload]));
  return report.evidence.map((entry) => {
    const authored = bank.questions.find((q) => q.id === entry.questionId);
    let answer: QuestionReview['answer'] = null;
    try {
      const parsed = answerSchema.safeParse(JSON.parse(submitted.get(entry.questionId) ?? 'null'));
      if (parsed.success) answer = parsed.data;
    } catch {
      /* Keep the sealed result readable even if a legacy payload is unavailable. */
    }
    return {
      ...entry,
      question: authored ? publicQuestion(authored) : null,
      answer,
      correctAnswer: authored ? correctReviewAnswer(authored) : null,
    };
  });
}
