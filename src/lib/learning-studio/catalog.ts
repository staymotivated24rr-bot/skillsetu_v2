import { batchLesson, type LessonContent } from './content';
import { variablesLesson } from './variables-lesson';
import { loopsLesson, divisionLesson, transferLesson } from './correction-lessons';
export const lessonCatalog: Record<string, LessonContent> = {
  [batchLesson.id]: batchLesson,
  [loopsLesson.id]: loopsLesson,
  [divisionLesson.id]: divisionLesson,
  [transferLesson.id]: transferLesson,
  [variablesLesson.id]: variablesLesson,
};
export function lessonForOrdinal(content: LessonContent, ordinal: number): LessonContent {
  return {
    ...content,
    steps: content.steps.map((step) => {
      const variants = step.masteryVariants;
      return variants?.length ? { ...step, ...variants[(ordinal - 1) % variants.length] } : step;
    }),
  };
}
