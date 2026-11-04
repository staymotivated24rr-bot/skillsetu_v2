import type { LessonContent } from './content';
import type { StudioView } from './types';
type Response = { stepId: string; correct: boolean; assisted: boolean; first: boolean };
export function lessonMastery(
  lesson: LessonContent,
  responses: Response[],
  ordinal: number,
): StudioView['mastery'] {
  const policy = lesson.masteryPolicy;
  if (!policy) return undefined;
  const first = (id: string) => responses.find((r) => r.stepId === id && r.first);
  const independentCorrect = policy.checkpoints.filter(
    (id) => first(id)?.correct && !first(id)!.assisted,
  ).length;
  const final = first(policy.finalStepId);
  const variants =
    lesson.steps.find((s) => s.id === policy.finalStepId)?.masteryVariants?.length ?? 1;
  const freshForm = ordinal <= variants;
  const finalPassed = !!final?.correct && !final.assisted;
  const mastered = !!final && finalPassed && freshForm && independentCorrect >= policy.required;
  return {
    status: !final ? 'awaiting-check' : mastered ? 'mastered' : 'needs-practice',
    independentCorrect,
    required: policy.required,
    total: policy.checkpoints.length,
    finalPassed,
    freshForm,
    reason: !final
      ? 'Complete the checkpoints and the independent final check.'
      : !freshForm
        ? 'This final form has already been used in an earlier practice run. It is review, not fresh independent evidence.'
        : !finalPassed
          ? 'The first final-check response did not pass independently. Retries support learning; a new run offers a different form.'
          : independentCorrect < policy.required
            ? 'More first-attempt, unaided checkpoint evidence is needed. Hinted or retried success does not replace the first response.'
            : `${policy.required} of ${policy.checkpoints.length} checkpoints and the fresh final check passed on first unaided attempts. This is lesson mastery, not diagnostic proficiency or certification.`,
  };
}
