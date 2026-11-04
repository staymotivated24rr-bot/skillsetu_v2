export type Interaction = 'prediction' | 'completion' | 'decision' | 'ordering';
export type Answer = {
  text?: string;
  selected?: number;
  order?: string[];
  blocks?: Record<string, string>;
};
export type CodeSlot = { id: string; label: string; choices: { id: string; code: string }[] };
export type Competency = {
  id: string;
  name: string;
  prerequisites: string[];
  skillIds: string[];
  moduleSkillId: string;
  subskills: string[];
};
export type Question = {
  id: string;
  numeric?: { kind: 'integer' | 'float'; places: number; hint: string; expected: string };
  optionHypotheses?: (string | null)[];
  sourceKind?: 'trace' | 'conceptual';
  contract?: { kind: 'python-fragment'; examples: string[] };
  codeSlots?: CodeSlot[];
  blockKey?: Record<string, string>;
  subskill?: string;
  interaction?: 'state-cards' | 'loop-boundary' | 'error-location';
  difficultyReason?: string;
  exposureFamily?: string;
  version: string;
  competencyId: string;
  difficulty: 1 | 2 | 3;
  type: Interaction;
  title: string;
  prompt: string;
  code?: string;
  options?: string[];
  steps?: { id: string; text: string }[];
  expected?: string[];
  correct?: number;
  order?: string[];
  misconception: string;
  explanation: string;
  hint: string;
  seconds: number;
  context: string;
  accessibility: { inputLabel: string; codeLanguage?: 'python' };
};
export type Bank = {
  id: string;
  version: string;
  roleId: string;
  roleName: string;
  policy: { minimum: number; target: number; maximum: number; coverage: number };
  competencies: Competency[];
  questions: Question[];
};
export type Evidence = {
  questionId: string;
  correct: boolean;
  assisted: boolean;
  payload?: string;
};
export type Selection = { questionId: string | null; rationale: string };
export type Finding = {
  competencyId: string;
  name: string;
  status: 'Demonstrated strength' | 'Likely gap' | 'Insufficient evidence';
  count: number;
  independent: number;
  correct: number;
  types: number;
  reason: string;
  prerequisites: string[];
  moduleSkillId: string;
  nextSubskill?: string;
  nextStep?: string;
  unsure?: number;
  assistedCount?: number;
  incorrect?: number;
  familyCount?: number;
  difficultyEvidence?: {
    level: 1 | 2 | 3;
    correct: number;
    incorrect: number;
    unsure: number;
    assisted: number;
  }[];
  hypotheses?: {
    label: string;
    observations: number;
    confirmed: boolean;
    counterExamples?: number;
    state?: 'suspected' | 'repeated' | 'mixed';
    sourceLabels?: string[];
  }[];
};
export type Report = {
  role: string;
  bankId: string;
  engineVersion: string;
  answered: number;
  stopReason: string;
  findings: Finding[];
  learningOrder: string[];
  evidence: {
    questionId: string;
    title: string;
    correct: boolean;
    assisted: boolean;
    explanation: string;
    submittedCode?: string;
    misconception: string | null;
    outcome?: 'correct' | 'incorrect' | 'unsure';
  }[];
};
export type PublicQuestion = Omit<
  Question,
  | 'contract'
  | 'expected'
  | 'correct'
  | 'order'
  | 'misconception'
  | 'explanation'
  | 'hint'
  | 'blockKey'
  | 'numeric'
  | 'optionHypotheses'
  | 'sourceKind'
> & { numeric?: { kind: 'integer' | 'float'; places: number; hint: string } };
export type CorrectReviewAnswer =
  | { kind: 'text'; accepted: string[] }
  | { kind: 'option'; index: number; text: string }
  | { kind: 'ordering'; steps: string[] }
  | {
      kind: 'blocks';
      blocks: { slotId: string; label: string; choiceId: string; code: string }[];
      code: string;
    };
export type QuestionReview = Report['evidence'][number] & {
  question: PublicQuestion | null;
  answer: Answer | null;
  correctAnswer?: CorrectReviewAnswer | null;
};
export type RunView = {
  id: string;
  status: string;
  bankId: string;
  role: string;
  answered: number;
  minimum: number;
  target: number;
  maximum: number;
  competencies: { id: string; name: string; count: number }[];
  current: PublicQuestion | null;
  rationale: string;
  hint: string | null;
  draft: Answer;
  lastFeedback: { questionId: string; assisted: boolean } | null;
  report: Report | null;
  review?: QuestionReview[] | null;
};
