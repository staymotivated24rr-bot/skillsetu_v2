import type { PublicPythonTrace, TraceFeedback, TraceReply } from './trace-types';
export type TraceState = {
  revealed: PublicPythonTrace[];
  cursor: number;
  selected?: number;
  feedback?: TraceFeedback;
};
export function initialTraceState(trace: PublicPythonTrace): TraceState {
  if (trace.index !== 0) throw new Error('Start a trace at its initial state.');
  return { revealed: [trace], cursor: 0 };
}
export function selectTracePrediction(state: TraceState, selected: number): TraceState {
  const options = state.revealed[state.cursor].nextPrediction?.options;
  if (!options || !Number.isInteger(selected) || selected < 0 || selected >= options.length)
    return state;
  return { ...state, selected, feedback: undefined };
}
export function moveTrace(state: TraceState, direction: -1 | 1): TraceState {
  const cursor = state.cursor + direction;
  return cursor < 0 || cursor >= state.revealed.length
    ? state
    : { ...state, cursor, selected: undefined, feedback: undefined };
}
export function acceptTraceReveal(state: TraceState, reply: TraceReply): TraceState {
  const current = state.revealed[state.cursor];
  if (
    state.cursor !== state.revealed.length - 1 ||
    reply.trace.id !== current.id ||
    reply.trace.version !== current.version ||
    reply.trace.index !== state.cursor + 1 ||
    reply.trace.frameCount !== current.frameCount ||
    (current.nextPrediction && state.selected === undefined)
  )
    throw new Error('Reset before accepting an out-of-sequence trace response.');
  return {
    revealed: [...state.revealed, reply.trace],
    cursor: state.cursor + 1,
    feedback: reply.feedback,
  };
}
export function resetTrace(state: TraceState): TraceState {
  return initialTraceState(state.revealed[0]);
}
