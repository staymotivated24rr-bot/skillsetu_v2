// Key-free presentation contract. These traces are teaching simulations, not execution evidence.
export type TraceKind = 'variables' | 'references' | 'loop' | 'function';
export type TraceFrame = {
  id: string;
  line: number; // 0 = before execution; otherwise the last line modeled as executed.
  explanation: string;
  variables: { scope: string; name: string; value: string }[];
  references: { name: string; objectId: string }[];
  objects: { id: string; value: string; mutable: boolean }[];
  output: string[];
  stack: { name: string; locals: { name: string; value: string }[]; returning?: string }[];
  iteration?: { number: number; phase: 'body' | 'finished'; value?: string };
};
export type TracePrediction = { prompt: string; options: string[] };
export type PublicPythonTrace = {
  id: string;
  version: string;
  kind: TraceKind;
  title: string;
  introduction: string;
  code: string[];
  frameCount: number;
  index: number;
  frame: TraceFrame;
  nextPrediction?: TracePrediction;
};
export type TraceFeedback = { correct: boolean; selected: number; explanation: string };
export type TraceReply = { trace: PublicPythonTrace; feedback?: TraceFeedback };
