import type { LearningAnswer, PublicStep } from './types';
// Public controls and saved responses only; no answer keys are needed for review text.
export function learningAnswerText(step: PublicStep, answer: LearningAnswer): string {
  if (answer.acknowledged)
    return (
      'Concept reviewed' +
      (answer.frame !== undefined ? ` · worked example statement ${answer.frame + 1}` : '')
    );
  if (answer.text !== undefined) return answer.text;
  if (answer.selected !== undefined)
    return step.options?.[answer.selected] ?? 'Unavailable saved option';
  if (answer.blocks)
    return (
      step.slots
        ?.map(
          (s) =>
            `${s.label}: ${s.choices.find((c) => c.id === answer.blocks?.[s.id])?.code ?? 'Not filled'}`,
        )
        .join('\n') ?? 'Unavailable block'
    );
  if (answer.order)
    return answer.order
      .map((id) => step.items?.find((i) => i.id === id)?.text ?? 'Unavailable operation')
      .join(' → ');
  if (answer.state)
    return (
      step.cells?.map((c) => `${c.label}: ${answer.state?.[c.id] ?? 'Not entered'}`).join('\n') ??
      'Unavailable state'
    );
  if (answer.execution) return answer.execution.code ?? 'No saved implementation';
  return 'No saved response';
}
