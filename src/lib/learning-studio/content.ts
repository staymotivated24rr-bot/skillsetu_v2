// Private authored lesson. Client components import types, never this content module.
import { publicTask } from '../authentic/grading';
import type { AuthenticTask } from '../authentic/types';
import type { LearningAnswer, PublicLesson, PublicStep } from './types';

export type LessonStep = PublicStep & {
  hint: string;
  hints?: string[];
  feedback: { correct: string; incorrect: string };
  key?: LearningAnswer;
  privateTask?: AuthenticTask;
  masteryVariants?: { code: string; key: LearningAnswer }[];
};
export type LessonContent = Omit<PublicLesson, 'steps'> & {
  schemaVersion: 1;
  progressiveDisclosure?: boolean;
  roleId: 'python-developer';
  evaluatorVersion: string;
  steps: LessonStep[];
  masteryPolicy?: {
    version: 'lesson-mastery-1';
    checkpoints: string[];
    required: number;
    finalStepId: string;
  };
};
const execution: AuthenticTask = {
  id: 'batch-total-execute',
  type: 'code-edit',
  skillIds: [{ skillId: 'py-fundamentals', weight: 1 }],
  scenario: 'batch-total',
  title: 'Implement the positive total',
  prompt:
    'Complete positive_total(values). Return the sum of values greater than zero. Preserve the input.',
  context:
    'Guided practice in the existing browser sandbox. Empty and nonpositive batches return zero.',
  minutes: 3,
  starter:
    'def positive_total(values):\n    total = 0\n    for value in values:\n        # Add positive values to total here\n        pass\n    return total',
  functionName: 'positive_total',
  cases: [
    { args: [[0, 2, 3]], expected: 5 },
    { args: [[]], expected: 0 },
    { args: [[-2, 0, 4]], expected: 4 },
  ],
  transfer: false,
  independent: false,
  explanation:
    'Accumulate only positive values and return total after the loop, without editing values.',
  branch: {
    strong: 'The evaluated cases match the contract.',
    developing: 'Some cases differ. Check empty and nonpositive inputs.',
    risk: 'Trace total from zero and check the positive-value guard.',
  },
};
const step = (value: Omit<LessonStep, 'accessibility'>): LessonStep => ({
  ...value,
  accessibility: { label: value.title, description: value.objective },
});
export const batchLesson: LessonContent = {
  id: 'studio-positive-batch',
  version: '1.0.0-draft.1',
  schemaVersion: 1,
  roleId: 'python-developer',
  evaluatorVersion: 'studio-contracts-1',
  title: 'Trace a safe batch total',
  objectives: [
    'Trace a running total and accepted count.',
    'Distinguish missing values from zero.',
    'Implement a bounded positive-total contract.',
  ],
  prerequisites: ['py-fundamentals'],
  steps: [
    step({
      id: 'batch-concept',
      kind: 'explanation',
      title: 'One value at a time',
      instruction:
        'Start total at zero. Inspect each value. Add it only when it is positive. Reading a concept is practice exposure, not evidence of proficiency.',
      objective: 'Explain the initialize → inspect → accumulate pattern.',
      visual: {
        label: 'A positive-total pipeline',
        cards: [
          { label: 'Input', value: '[0, 2, 3]' },
          { label: 'Keep positives', value: '[2, 3]' },
          { label: 'Sum', value: '5' },
        ],
      },
      hint: 'Zero is a valid value, but contributes nothing to a positive sum.',
      feedback: {
        correct: 'Concept reviewed. Now make a prediction.',
        incorrect: 'Confirm that you have read the concept.',
      },
      key: { acknowledged: true },
    }),
    step({
      id: 'batch-predict',
      kind: 'prediction',
      title: 'Predict the printed output',
      instruction: 'Enter only the integer printed by this code.',
      objective: 'Predict a loop outcome without running code.',
      code: 'total = 0\nfor value in [0, 2, 3]:\n    if value > 0:\n        total += value\nprint(total)',
      hint: 'Write the running total after each of the three values.',
      feedback: {
        correct: 'Yes: zero contributes nothing, then 2 + 3 gives 5.',
        incorrect: 'Trace the guard and add only values greater than zero, starting from zero.',
      },
      key: { text: '5' },
    }),
    step({
      id: 'batch-reason',
      kind: 'reasoning',
      title: 'Keep zero distinct from missing',
      instruction: 'A reading can be 0 or None. Which guard detects only a missing reading?',
      objective: 'Choose an explicit absence check.',
      options: ['not reading', 'reading is None', 'reading == 0'],
      hint: 'Truthiness treats both zero and None as false.',
      feedback: {
        correct: 'Identity with None detects absence while preserving zero.',
        incorrect:
          'Zero is valid data. A truthiness check or comparison with zero cannot isolate None.',
      },
      key: { selected: 1 },
    }),
    step({
      id: 'batch-numeric',
      kind: 'numeric',
      title: 'Preserve the requested precision',
      instruction:
        'Two accepted units cost 2.50 each. Enter the total as a float with exactly 2 decimal places.',
      objective: 'Represent a decimal result with an explicit format.',
      numeric: { kind: 'float', places: 2 },
      hint: 'Multiply 2 by 2.50 and retain two digits after the decimal point.',
      feedback: {
        correct: '5.00 preserves the required two decimal places.',
        incorrect: 'Multiply the quantity by the unit price; keep exactly two decimal places.',
      },
      key: { text: '5.00' },
    }),
    step({
      id: 'batch-block',
      kind: 'blocks',
      title: 'Complete the positive-value guard',
      instruction: 'Select the block that adds positive values only.',
      objective: 'Repair a boundary using a constrained code block.',
      code: 'for value in values:\n    if {{guard}}:\n        total += value',
      slots: [
        {
          id: 'guard',
          label: 'Positive-value condition',
          choices: [
            { id: 'nonnegative', code: 'value >= 0' },
            { id: 'positive', code: 'value > 0' },
            { id: 'negative', code: 'value < 0' },
          ],
        },
      ],
      hint: 'The contract says greater than zero, not greater than or equal to zero.',
      feedback: {
        correct: 'value > 0 expresses the stated boundary.',
        incorrect: 'Include strictly positive values only; zero must not satisfy the guard.',
      },
      key: { blocks: { guard: 'positive' } },
    }),
    step({
      id: 'batch-order',
      kind: 'ordering',
      title: 'Arrange the accumulation workflow',
      instruction: 'Use the move buttons to order the operations.',
      objective: 'Place initialization, iteration and return in the right sequence.',
      items: [
        { id: 'return', text: 'Return total after all values' },
        { id: 'add', text: 'Add the current value if positive' },
        { id: 'init', text: 'Initialize total to zero' },
        { id: 'read', text: 'Read each value in the loop' },
      ],
      hint: 'Initialize before the loop and return after it.',
      feedback: {
        correct: 'Initialize, iterate, conditionally add, then return.',
        incorrect:
          'Do not reset total inside the loop or return before processing the entire batch.',
      },
      key: { order: ['init', 'read', 'add', 'return'] },
    }),
    step({
      id: 'batch-trace',
      kind: 'trace',
      title: 'Trace total and accepted count',
      instruction:
        'For [0, 2, 3], begin total=0 and count=0. Each positive value increases total by that value and count by one. Fill both variables after each input.',
      objective: 'Track two changing variables across successive iterations.',
      cells: [
        { id: 'zero-total', label: 'After 0: total' },
        { id: 'zero-count', label: 'After 0: count' },
        { id: 'two-total', label: 'After 2: total' },
        { id: 'two-count', label: 'After 2: count' },
        { id: 'three-total', label: 'After 3: total' },
        { id: 'three-count', label: 'After 3: count' },
      ],
      hint: 'The zero input leaves both variables unchanged. Positive inputs add their value and increment count once.',
      feedback: {
        correct: 'The states are (0,0), (2,1), then (5,2).',
        incorrect:
          'Keep total and count separate: one accumulates values, the other counts accepted inputs.',
      },
      key: {
        state: {
          'zero-total': '0',
          'zero-count': '0',
          'two-total': '2',
          'two-count': '1',
          'three-total': '5',
          'three-count': '2',
        },
      },
    }),
    step({
      id: 'batch-execute',
      kind: 'execution',
      title: 'Run the guided implementation',
      instruction:
        'Complete the helper, run it in the isolated browser sandbox, then send your response. Browser outputs are inspectable prototype evidence.',
      objective: 'Apply the positive-total contract to ordinary, empty and nonpositive inputs.',
      privateTask: execution,
      hint: 'Inside the loop, use a positive-value guard before updating total. Return after the loop.',
      feedback: {
        correct:
          'All authored evaluation cases match. This completes the demonstration, not an assessment or certification.',
        incorrect:
          'Some evaluated outputs differ. Check the guard, empty input and placement of return.',
      },
    }),
  ],
};

export function publicLesson(
  lesson: LessonContent,
  unlocked = lesson.progressiveDisclosure ? 0 : lesson.steps.length - 1,
): PublicLesson {
  return {
    id: lesson.id,
    version: lesson.version,
    title: lesson.title,
    objectives: lesson.objectives,
    prerequisites: lesson.prerequisites,
    summary: lesson.summary,
    prerequisiteLabels: lesson.prerequisiteLabels,
    steps: lesson.steps.map((s, index): PublicStep =>
      lesson.progressiveDisclosure && index > unlocked
        ? {
            id: s.id,
            kind: s.kind,
            title: s.title,
            phase: s.phase,
            locked: true,
            instruction: 'Complete the preceding step to reveal this activity.',
            objective: s.objective,
            accessibility: s.accessibility,
          }
        : {
            phase: s.phase,
            id: s.id,
            kind: s.kind,
            title: s.title,
            instruction: s.instruction,
            objective: s.objective,
            accessibility: s.accessibility,
            code: s.code,
            visual: s.visual,
            options: s.options,
            numeric: s.numeric,
            slots: s.slots,
            items: s.items,
            cells: s.cells,
            responseFormat: s.responseFormat,
            independent: s.independent,
            referenceFrames: s.referenceFrames,
            ...(s.privateTask ? { task: publicTask(s.privateTask) } : {}),
          },
    ),
  };
}
