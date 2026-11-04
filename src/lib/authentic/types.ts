export type TaskType =
  'decision' | 'code-edit' | 'bug-fix' | 'short-answer' | 'ordered-steps' | 'transfer';
export type CodeCase = { args: unknown[]; expected: unknown };
export type Rubric = { label: string; concepts: string[]; weight: number }[];
export type AuthenticTask = {
  id: string;
  type: TaskType;
  skillIds: { skillId: string; weight: number }[];
  scenario: string;
  title: string;
  context: string;
  prompt: string;
  minutes: number;
  options?: string[];
  correct?: number;
  steps?: { id: string; text: string }[];
  order?: string[];
  rubric?: Rubric;
  starter?: string;
  functionName?: string;
  cases?: CodeCase[];
  transfer: boolean;
  independent: boolean;
  explanation: string;
  branch: { strong: string; developing: string; risk: string };
  followup?: { strong: string; risk: string };
};
export type AssessmentBank = {
  id: string;
  roleId: string;
  kind: 'diagnostic' | 'reassessment';
  version: string;
  contentVersion: string;
  title: string;
  scenarios: {
    id: string;
    title: string;
    stakeholder: string;
    stakeholderRole: string;
    company: string;
    brief: string;
  }[];
  tasks: AuthenticTask[];
};
export type TaskPayload = {
  selected?: number;
  text?: string;
  order?: string[];
  code?: string;
  outputs?: unknown[];
};
export type EvidenceStrength = 'Limited evidence' | 'Moderate evidence' | 'Stronger evidence';
export type EvidenceSummary = {
  types: TaskType[];
  scenarios: string[];
  transfer: number;
  independent: number;
  strength: EvidenceStrength;
  reason: string;
  cumulativeCount?: number;
};
export type PublicTask = Omit<
  AuthenticTask,
  'correct' | 'order' | 'rubric' | 'cases' | 'explanation' | 'branch' | 'followup'
> & { inputs?: unknown[][]; rubricDimensions?: string[]; revealedConstraint?: string };
export type PublicBank = Omit<AssessmentBank, 'tasks'> & { tasks: PublicTask[] };
export type EvidenceView = {
  taskId: string;
  payload: TaskPayload;
  score: number;
  response: string;
  type: TaskType;
  scenario: string;
  transfer: boolean;
};
export type RepairModule = {
  id: string;
  skillId: string;
  version: string;
  title: string;
  minutes: number;
  concept: string;
  intuition: string;
  example: string;
  interview: string;
  workplace: string;
  tasks: AuthenticTask[];
};
export type PublicRepair = Omit<RepairModule, 'tasks'> & { tasks: PublicTask[] };
export type RepairView = {
  id: string;
  skillId: string;
  status: string;
  mode: string;
  run: number;
  module: PublicRepair;
  answers: (EvidenceView & { first: boolean })[];
};
