import { z } from 'zod';
import { AppError } from '../errors';
import { numericResult } from '../diagnostic/numeric';
import { gradeTask } from '../authentic/grading';
import type { LessonContent, LessonStep } from './content';
import type { LearningAnswer } from './types';
import { outputMatches } from './output-contract';

function bounded(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.length <= 2000;
  if (Array.isArray(value)) return value.length <= 100 && value.every((v) => bounded(v, depth + 1));
  if (value && typeof value === 'object')
    return (
      Object.entries(value).length <= 100 &&
      Object.entries(value).every(([k, v]) => k.length <= 200 && bounded(v, depth + 1))
    );
  return false;
}
const short = z.string().max(100);
export const learningAnswerSchema = z
  .object({
    frame: z.number().int().min(0).max(20).optional(),
    acknowledged: z.boolean().optional(),
    text: z.string().max(1000).optional(),
    selected: z.number().int().min(0).max(20).optional(),
    blocks: z
      .record(short, short)
      .refine((v) => Object.keys(v).length <= 4)
      .optional(),
    order: z.array(short).max(20).optional(),
    state: z
      .record(short, short)
      .refine((v) => Object.keys(v).length <= 20)
      .optional(),
    execution: z
      .object({
        code: z.string().max(12000),
        outputs: z
          .array(z.unknown().refine((v) => bounded(v)))
          .max(20)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export function evaluateStep(step: LessonStep, raw: LearningAnswer) {
  const answer = learningAnswerSchema.parse(raw);
  if (
    answer.frame !== undefined &&
    (!step.referenceFrames || answer.frame >= step.referenceFrames.length)
  )
    throw new AppError('Choose an available reference frame.', 422);
  const field = {
    explanation: 'acknowledged',
    prediction: 'text',
    reasoning: 'selected',
    numeric: 'text',
    blocks: 'blocks',
    ordering: 'order',
    trace: 'state',
    mastery: 'state',
    execution: 'execution',
  }[step.kind];
  if (Object.keys(answer).filter((k) => k !== 'frame').length !== 1 || !(field in answer))
    throw new AppError('Use the response control for this step.', 422);
  let correct = false;
  if (step.kind === 'explanation') {
    if (!answer.acknowledged) throw new AppError('Confirm that you have read the concept.', 422);
    correct = true;
  } else if (step.kind === 'prediction' || step.kind === 'numeric') {
    if (step.responseFormat === 'literal' || step.responseFormat === 'plain') {
      if (!answer.text?.length) throw new AppError('Enter your predicted output.', 422);
      correct = outputMatches(answer.text, step.key!.text!, step.responseFormat);
      return { answer, correct, feedback: step.feedback[correct ? 'correct' : 'incorrect'] };
    }
    const result = numericResult(
      { ...(step.numeric ?? { kind: 'integer', places: 0 }), expected: step.key!.text! },
      answer.text!,
    );
    if (!result.format) throw new AppError(result.message, 422);
    correct = result.correct;
  } else if (step.kind === 'reasoning') {
    if (answer.selected! >= step.options!.length)
      throw new AppError('Choose an available option.', 422);
    correct = answer.selected === step.key!.selected;
  } else if (step.kind === 'blocks') {
    const blocks = answer.blocks!;
    if (
      Object.keys(blocks).length !== step.slots!.length ||
      step.slots!.some((s) => !s.choices.some((c) => c.id === blocks[s.id]))
    )
      throw new AppError('Fill every blank with an available block.', 422);
    correct = step.slots!.every((s) => blocks[s.id] === step.key!.blocks![s.id]);
  } else if (step.kind === 'ordering') {
    const order = answer.order!;
    if (
      order.length !== step.items!.length ||
      new Set(order).size !== order.length ||
      order.some((id) => !step.items!.some((s) => s.id === id))
    )
      throw new AppError('Order every operation exactly once.', 422);
    correct = order.every((id, i) => id === step.key!.order![i]);
  } else if (step.kind === 'trace' || step.kind === 'mastery') {
    const state = answer.state!;
    if (
      Object.keys(state).length !== step.cells!.length ||
      step.cells!.some((c) => !Object.hasOwn(state, c.id))
    )
      throw new AppError('Complete every variable-state cell.', 422);
    correct = true;
    for (const c of step.cells!) {
      if (c.format === 'literal' || c.format === 'plain') {
        if (!state[c.id].length) throw new AppError(`${c.label}: enter a prediction.`, 422);
        correct = outputMatches(state[c.id], step.key!.state![c.id], c.format) && correct;
        continue;
      }
      const result = numericResult(
        {
          kind: c.format === 'float' ? 'float' : 'integer',
          places: c.places ?? 0,
          expected: step.key!.state![c.id],
        },
        state[c.id],
      );
      if (!result.format) throw new AppError(`${c.label}: ${result.message}`, 422);
      correct = correct && result.correct;
    }
  } else {
    try {
      correct = gradeTask(step.privateTask!, answer.execution!).score === 1;
    } catch {
      throw new AppError('Run the code against all evaluation inputs before sending.', 422);
    }
  }
  return { answer, correct, feedback: step.feedback[correct ? 'correct' : 'incorrect'] };
}

export function validateLesson(lesson: LessonContent) {
  if (
    lesson.schemaVersion !== 1 ||
    !lesson.id ||
    !lesson.version ||
    !lesson.objectives.length ||
    !lesson.steps.length ||
    new Set(lesson.steps.map((s) => s.id)).size !== lesson.steps.length
  )
    throw new Error('Invalid lesson contract.');
  for (const s of lesson.steps) {
    if (
      !s.id ||
      !s.objective ||
      !s.instruction ||
      !s.accessibility.label ||
      !s.hint ||
      !s.feedback.correct ||
      !s.feedback.incorrect
    )
      throw new Error('Missing authored lesson metadata.');
    if (s.kind !== 'execution' && !evaluateStep(s, s.key!).correct)
      throw new Error('Invalid authored lesson key.');
    if (s.kind === 'execution' && (!s.privateTask?.cases?.length || !s.privateTask.starter))
      throw new Error('Missing guided execution contract.');
    for (const variant of s.masteryVariants ?? [])
      if (!evaluateStep({ ...s, ...variant }, variant.key).correct)
        throw new Error('Invalid mastery form key.');
    for (const frame of s.referenceFrames ?? [])
      if (frame.names.some((n) => !frame.objects.some((o) => o.id === n.objectId)))
        throw new Error('Invalid reference diagram.');
  }
  const policy = lesson.masteryPolicy;
  if (
    policy &&
    (!Number.isInteger(policy.required) ||
      policy.required < 1 ||
      policy.required > policy.checkpoints.length ||
      new Set(policy.checkpoints).size !== policy.checkpoints.length ||
      policy.checkpoints.some((id) => !lesson.steps.some((s) => s.id === id && s.independent)) ||
      !lesson.steps.some(
        (s) => s.id === policy.finalStepId && s.kind === 'mastery' && s.masteryVariants?.length,
      ))
  )
    throw new Error('Invalid lesson mastery policy.');
}
