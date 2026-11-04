import { expect, it } from 'vitest';
import { pythonTraces } from '../src/lib/learning-studio/trace-content';
import {
  openPythonTrace,
  revealPythonTrace,
  validatePythonTrace,
} from '../src/lib/learning-studio/trace-model';
import {
  acceptTraceReveal,
  initialTraceState,
  moveTrace,
  resetTrace,
  selectTracePrediction,
} from '../src/lib/learning-studio/trace-state';

it('validates four bounded versioned trace models and projects only one state with no prediction keys', () => {
  expect(new Set(pythonTraces.map((t) => t.kind))).toEqual(
    new Set(['variables', 'references', 'loop', 'function']),
  );
  for (const trace of pythonTraces) {
    expect(() => validatePythonTrace(trace)).not.toThrow();
    for (let index = 0; index < trace.frames.length; index++) {
      const prediction = trace.frames[index].prediction;
      const reply = index
        ? revealPythonTrace(trace.id, trace.version, index, prediction?.correct)
        : openPythonTrace(trace.id);
      const publicData = JSON.stringify(reply.trace);
      expect(publicData).not.toMatch(/"(correct|prediction|frames|feedback|key|expected)":/);
      expect(reply.trace.frame.id).toBe(trace.frames[index].id);
      expect(reply.trace.nextPrediction?.options).toEqual(
        trace.frames[index + 1]?.prediction?.options,
      );
    }
  }
});

it('models rebinding without changing another name and mutation without rebinding aliases', () => {
  const variables = pythonTraces[0];
  expect(variables.frames[3].variables.map((v) => [v.name, v.value])).toEqual([
    ['score', '13'],
    ['saved', '8'],
  ]);
  expect(variables.frames.at(-1)!.output).toEqual(['8 13']);
  const lists = pythonTraces[1];
  expect(lists.frames[2].references.map((r) => r.objectId)).toEqual(['A', 'A']);
  expect(lists.frames[3].objects).toEqual([{ id: 'A', value: '[2, 7]', mutable: true }]);
  expect(lists.frames[5].objects.map((o) => o.value)).toEqual(['[2, 7]', '[2, 7, 9]']);
  expect(lists.frames[2].objects[0].value).toBe('[2]'); // Earlier frames never mutate.
});

it('models exclusive loop boundaries and local call/return state correctly', () => {
  const loop = pythonTraces[2];
  expect(loop.frames.filter((f) => f.line === 3).map((f) => f.variables[0].value)).toEqual([
    '1',
    '3',
    '6',
  ]);
  expect(loop.frames.at(-2)!.iteration).toEqual({ number: 3, phase: 'finished' });
  expect(loop.frames.at(-1)!.output).toEqual(['6']);
  const call = pythonTraces[3];
  expect(call.frames[2].variables.some((v) => v.name === 'result')).toBe(false);
  expect(call.frames[4].stack.at(-1)!.returning).toBe('6');
  expect(call.frames[5].stack).toEqual([
    { name: 'module', locals: [{ name: 'result', value: '6' }] },
  ]);
  expect(call.frames[5].variables.some((v) => ['n', 'answer'].includes(v.name))).toBe(false);
});

it('requires a valid prediction, supports a wrong attempt, and rejects invalid input without revealing another step', () => {
  const trace = pythonTraces[0];
  for (const selected of [undefined, -1, 99, 1.5, NaN])
    expect(() => revealPythonTrace(trace.id, trace.version, 1, selected)).toThrow();
  const wrong = revealPythonTrace(trace.id, trace.version, 1, 1);
  expect(wrong.feedback?.correct).toBe(false);
  expect(wrong.trace.index).toBe(1);
  expect(() => revealPythonTrace(trace.id, trace.version, 2, 0)).toThrow();
  for (const index of [0, -1, 1.5, 999, NaN])
    expect(() => revealPythonTrace(trace.id, trace.version, index)).toThrow();
  for (const id of ['__proto__', 'constructor', 'unknown'])
    expect(() => openPythonTrace(id)).toThrow('not found');
  expect(() => revealPythonTrace(trace.id, 'wrong-version', 1, 0)).toThrow('version');
  expect(openPythonTrace(trace.id).trace.index).toBe(0);
});

it('uses a bounded cursor, reuses revealed states for review, and fully clears replay predictions and feedback', () => {
  const authored = pythonTraces[0];
  let state = initialTraceState(openPythonTrace(authored.id).trace);
  expect(moveTrace(state, -1)).toBe(state);
  expect(moveTrace(state, 1)).toBe(state);
  expect(selectTracePrediction(state, 999)).toBe(state);
  expect(() =>
    acceptTraceReveal(state, revealPythonTrace(authored.id, authored.version, 1, 0)),
  ).toThrow('sequence');
  state = selectTracePrediction(state, 1);
  state = acceptTraceReveal(state, revealPythonTrace(authored.id, authored.version, 1, 1));
  expect(state.feedback?.correct).toBe(false);
  expect(moveTrace(state, -1).revealed).toHaveLength(2);
  expect(moveTrace(moveTrace(state, -1), 1).cursor).toBe(1);
  const initial = resetTrace(state);
  expect(initial.cursor).toBe(0);
  expect(initial.revealed).toHaveLength(1);
  expect(initial.selected).toBeUndefined();
  expect(initial.feedback).toBeUndefined();
  state = selectTracePrediction(initial, 0);
  expect(
    acceptTraceReveal(state, revealPythonTrace(authored.id, authored.version, 1, 0)).feedback
      ?.correct,
  ).toBe(true);
});

it('rejects malformed authored references, lines, duplicate state, prediction keys and retroactive output edits', () => {
  const badReference = structuredClone(pythonTraces[1]);
  badReference.frames[2].references[0].objectId = 'missing';
  expect(() => validatePythonTrace(badReference)).toThrow('reference');
  const badLine = structuredClone(pythonTraces[0]);
  badLine.frames[1].line = 63;
  expect(() => validatePythonTrace(badLine)).toThrow('line');
  const badChoice = structuredClone(pythonTraces[0]);
  badChoice.frames[1].prediction!.correct = 99;
  expect(() => validatePythonTrace(badChoice)).toThrow('prediction');
  const duplicate = structuredClone(pythonTraces[0]);
  duplicate.frames[2].variables.push(duplicate.frames[2].variables[0]);
  expect(() => validatePythonTrace(duplicate)).toThrow('Duplicate');
  const badOutput = structuredClone(pythonTraces[0]);
  badOutput.frames[1].output = ['not yet printed'];
  expect(() => validatePythonTrace(badOutput)).toThrow('Output');
});
