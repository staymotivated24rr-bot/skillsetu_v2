import type { CodeSlot } from '../diagnostic/types';
import type { PublicTask, TaskPayload } from '../authentic/types';

export type StepKind =
  | 'explanation'
  | 'prediction'
  | 'reasoning'
  | 'numeric'
  | 'blocks'
  | 'ordering'
  | 'trace'
  | 'mastery'
  | 'execution';
export type LearningAnswer = {
  frame?: number;
  acknowledged?: boolean;
  text?: string;
  selected?: number;
  blocks?: Record<string, string>;
  order?: string[];
  state?: Record<string, string>;
  execution?: TaskPayload;
};
export type PublicStep = {
  id: string;
  kind: StepKind;
  phase?: 'Explain' | 'Explore' | 'Predict' | 'Practice' | 'Apply' | 'Verify' | 'Review';
  locked?: boolean;
  title: string;
  instruction: string;
  objective: string;
  accessibility: { label: string; description: string };
  code?: string;
  visual?: { label: string; cards: { label: string; value: string }[] };
  options?: string[];
  numeric?: { kind: 'integer' | 'float'; places: number };
  slots?: CodeSlot[];
  items?: { id: string; text: string }[];
  cells?: {
    id: string;
    label: string;
    format?: 'integer' | 'literal' | 'plain' | 'float';
    places?: number;
  }[];
  task?: PublicTask;
  responseFormat?: 'integer' | 'literal' | 'plain';
  independent?: boolean;
  referenceFrames?: {
    statement: string;
    explanation: string;
    names: { name: string; objectId: string }[];
    objects: { id: string; value: string; mutable: boolean }[];
  }[];
};
export type PublicLesson = {
  id: string;
  version: string;
  title: string;
  objectives: string[];
  prerequisites: string[];
  summary?: string;
  prerequisiteLabels?: string[];
  steps: PublicStep[];
};
export type StudioView = {
  id: string;
  status: string;
  ordinal: number;
  lesson: PublicLesson;
  currentStepId: string;
  draftRevision: number;
  drafts: Record<string, LearningAnswer>;
  unlocked: number;
  completed: number;
  mastery?: {
    status: 'awaiting-check' | 'mastered' | 'needs-practice';
    independentCorrect: number;
    required: number;
    total: number;
    finalPassed: boolean;
    freshForm: boolean;
    reason: string;
  };
  results: {
    stepId: string;
    attempt: number;
    correct: boolean;
    assisted: boolean;
    first: boolean;
    feedback: string;
    answer: LearningAnswer;
  }[];
  hints: Record<string, string>;
};
