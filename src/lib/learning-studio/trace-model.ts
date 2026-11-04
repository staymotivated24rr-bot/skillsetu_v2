import { z } from 'zod';
import { AppError } from '../errors';
import { pythonTraces, type AuthoredPythonTrace } from './trace-content';
import type { PublicPythonTrace, TraceReply } from './trace-types';
const text = z.string().min(1).max(500);
const name = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z_0-9]*$/)
  .max(50);
const variable = z.object({ name, value: text });
const frameSchema = z.object({
  id: text,
  line: z.number().int().min(0).max(64),
  explanation: text,
  variables: z.array(variable.extend({ scope: name })).max(24),
  references: z.array(z.object({ name, objectId: name })).max(24),
  objects: z.array(z.object({ id: name, value: text, mutable: z.boolean() })).max(24),
  output: z.array(text).max(24),
  stack: z
    .array(z.object({ name, locals: z.array(variable).max(24), returning: text.optional() }))
    .max(12),
  iteration: z
    .object({
      number: z.number().int().min(1).max(100),
      phase: z.enum(['body', 'finished']),
      value: text.optional(),
    })
    .optional(),
});
const predictionSchema = z
  .object({
    prompt: text,
    options: z.array(text).min(2).max(6),
    correct: z.number().int().min(0),
    explanation: text,
  })
  .strict();
const authoredSchema = z
  .object({
    id: text,
    version: text,
    title: text,
    introduction: text,
    kind: z.enum(['variables', 'references', 'loop', 'function']),
    code: z.array(z.string().max(200)).min(1).max(64),
    frames: z
      .array(frameSchema.extend({ prediction: predictionSchema.optional() }).strict())
      .min(2)
      .max(64),
  })
  .strict();

export function validatePythonTrace(trace: AuthoredPythonTrace) {
  authoredSchema.parse(trace);
  if (
    trace.frames[0].line !== 0 ||
    trace.frames[0].prediction ||
    new Set(trace.frames.map((f) => f.id)).size !== trace.frames.length
  )
    throw new Error('Invalid trace start or frame IDs.');
  trace.frames.forEach((frame, index) => {
    if (
      frame.line > trace.code.length ||
      (index > 0 && (!frame.line || !trace.code[frame.line - 1].trim()))
    )
      throw new Error('Invalid modeled code line.');
    if (
      new Set(frame.objects.map((o) => o.id)).size !== frame.objects.length ||
      new Set(frame.references.map((r) => r.name)).size !== frame.references.length ||
      new Set(frame.variables.map((v) => `${v.scope}/${v.name}`)).size !== frame.variables.length
    )
      throw new Error('Duplicate modeled state.');
    if (
      frame.references.some(
        (r) =>
          !frame.objects.some(
            (o) =>
              o.id === r.objectId &&
              frame.variables.some((v) => v.name === r.name && v.value === o.value),
          ),
      )
    )
      throw new Error('Dangling or inconsistent reference.');
    if (
      frame.prediction &&
      (frame.prediction.correct >= frame.prediction.options.length ||
        new Set(frame.prediction.options).size !== frame.prediction.options.length)
    )
      throw new Error('Invalid prediction contract.');
    if (index > 0 && trace.frames[index - 1].output.some((line, i) => line !== frame.output[i]))
      throw new Error('Output must retain the prior trace.');
  });
}

function authored(id: string) {
  const trace = pythonTraces.find((t) => t.id === id);
  if (!trace) throw new AppError('Authored trace not found.', 404);
  validatePythonTrace(trace);
  return trace;
}
function project(trace: AuthoredPythonTrace, index: number): PublicPythonTrace {
  const next = trace.frames[index + 1]?.prediction;
  return {
    id: trace.id,
    version: trace.version,
    kind: trace.kind,
    title: trace.title,
    introduction: trace.introduction,
    code: [...trace.code],
    frameCount: trace.frames.length,
    index,
    frame: frameSchema.parse(trace.frames[index]),
    ...(next ? { nextPrediction: { prompt: next.prompt, options: [...next.options] } } : {}),
  };
}
export function openPythonTrace(id: string): TraceReply {
  return { trace: project(authored(id), 0) };
}
export function revealPythonTrace(
  id: string,
  version: string,
  index: number,
  selected?: number,
): TraceReply {
  const trace = authored(id);
  if (version !== trace.version)
    throw new AppError(
      'This trace version changed. Refresh or reopen this visualization to load the current model.',
      409,
    );
  if (!Number.isInteger(index) || index < 1 || index >= trace.frames.length)
    throw new AppError('Choose a valid next trace step.', 422);
  const prediction = trace.frames[index].prediction;
  if (
    prediction
      ? !Number.isInteger(selected) || selected! < 0 || selected! >= prediction.options.length
      : selected !== undefined
  )
    throw new AppError('Select a valid prediction before revealing this step.', 422);
  return {
    trace: project(trace, index),
    ...(prediction
      ? {
          feedback: {
            correct: selected === prediction.correct,
            selected: selected!,
            explanation: prediction.explanation,
          },
        }
      : {}),
  };
}
