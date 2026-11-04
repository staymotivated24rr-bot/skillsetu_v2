import { describe, expect, it, vi } from 'vitest';
import { studioEnabled } from '../src/lib/learning-studio/service';
import { batchLesson, publicLesson } from '../src/lib/learning-studio/content';
import { evaluateStep, validateLesson } from '../src/lib/learning-studio/evaluation';

describe('versioned interactive lesson contracts', () => {
  it('fails closed outside explicitly enabled local development', () => {
    try {
      vi.stubEnv('LEARNING_STUDIO_ENABLED', 'true');
      vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@remote.invalid/db');
      expect(studioEnabled()).toBe(false);
      vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@127.0.0.1/local');
      vi.stubEnv('VERCEL', '1');
      expect(studioEnabled()).toBe(false);
      vi.stubEnv('VERCEL', '');
      expect(studioEnabled()).toBe(true);
      vi.stubEnv('LEARNING_STUDIO_ENABLED', 'false');
      expect(studioEnabled()).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('defines all eight step types with stable IDs and review metadata', () => {
    expect(() => validateLesson(batchLesson)).not.toThrow();
    expect(new Set(batchLesson.steps.map((s) => s.kind)).size).toBe(8);
    const invalid = structuredClone(batchLesson);
    invalid.steps[1].id = invalid.steps[0].id;
    expect(() => validateLesson(invalid)).toThrow();
  });
  it('never projects private keys, feedback rules, hints or expected execution outputs', () => {
    const publicValue = JSON.stringify(publicLesson(batchLesson));
    for (const field of [
      '"key"',
      '"privateTask"',
      '"feedback"',
      '"hint"',
      '"cases"',
      '"expected"',
      '"correct"',
      '"explanation"',
    ])
      expect(publicValue).not.toContain(field + ':');
    expect(publicLesson(batchLesson).steps.at(-1)!.task!.inputs).toHaveLength(3);
  });
  it.each(batchLesson.steps.filter((s) => s.key))(
    'evaluates authored $kind keys and rejects wrong modality',
    (s) => {
      expect(evaluateStep(s, s.key!).correct).toBe(true);
      expect(() => evaluateStep(s, { execution: { code: 'irrelevant' } })).toThrow();
    },
  );
  it('accepts numeric formatting equivalents and rejects format separately from a wrong answer', () => {
    const prediction = batchLesson.steps[1],
      numeric = batchLesson.steps[3];
    expect(evaluateStep(prediction, { text: '+005' }).correct).toBe(true);
    expect(evaluateStep(numeric, { text: '05.00' }).correct).toBe(true);
    expect(evaluateStep(numeric, { text: '6.00' }).correct).toBe(false);
    expect(() => evaluateStep(numeric, { text: '5' })).toThrow('exactly 2');
  });
  it('rejects incorrect reasoning, blocks, ordering and state, and malformed controls', () => {
    expect(evaluateStep(batchLesson.steps[2], { selected: 0 }).correct).toBe(false);
    expect(evaluateStep(batchLesson.steps[4], { blocks: { guard: 'negative' } }).correct).toBe(
      false,
    );
    expect(
      evaluateStep(batchLesson.steps[5], { order: ['return', 'add', 'init', 'read'] }).correct,
    ).toBe(false);
    expect(() =>
      evaluateStep(batchLesson.steps[5], { order: ['init', 'init', 'read', 'return'] }),
    ).toThrow();
    const answer = structuredClone(batchLesson.steps[6].key!);
    answer.state!['zero-total'] = '1';
    expect(evaluateStep(batchLesson.steps[6], answer).correct).toBe(false);
    expect(() => evaluateStep(batchLesson.steps[6], { state: {} })).toThrow();
  });
  it('compares browser transcripts server-side without executing code or trusting a client score', () => {
    const step = batchLesson.steps[7];
    expect(
      evaluateStep(step, {
        execution: { code: 'synthetic transcript fixture, not executed', outputs: [5, 0, 4] },
      }).correct,
    ).toBe(true);
    expect(
      evaluateStep(step, { execution: { code: 'not executed', outputs: [5, 1, 4] } }).correct,
    ).toBe(false);
    expect(() => evaluateStep(step, { execution: { code: 'not executed' } })).toThrow();
    expect(() =>
      evaluateStep(step, JSON.parse('{"execution":{"code":"x","outputs":[5,0,4],"score":1}}')),
    ).toThrow();
  });
});
