export type PracticeMastery =
  | 'not-started'
  | 'guided'
  | 'developing'
  | 'inconsistent'
  | 'demonstrated'
  | 'version-mismatch'
  | 'unsupported';
export type PracticeHistory = {
  title?: string;
  currentStepTitle?: string;
  runId: string;
  moduleVersionId: string;
  lessonId: string;
  ordinal: number;
  completed: number;
  total: number;
  currentStepId: string;
  status: string;
  hints: number;
  createdAt: string;
  attempts: {
    stepId: string;
    attempt: number;
    first: boolean;
    correct: boolean;
    assisted: boolean;
    at: string;
  }[];
};
export type PracticeSummary = {
  status: PracticeMastery;
  completedSteps: number;
  totalSteps: number;
  firstUnaidedMatches: number;
  firstUnaidedMisses: number;
  firstAssisted: number;
  hintUses: number;
  repeatedMatches: number;
  repeatedEasyMatches: number;
  assistedFinals: number;
  freshFinalPasses: number;
  freshFinalMisses: number;
  availableFreshForms: number;
  nextOrdinal: number;
  finalAttempted: boolean;
  activeRunId?: string;
  lastPracticeAt?: string;
  lastMeaningfulAt?: string;
  moduleVersionId?: string;
  reason: string;
};
export type LearningRecommendation = {
  category?: 'remediation' | 'verification' | 'advanced' | 'enrichment' | 'continue';
  continueLearning?: {
    runId: string;
    title: string;
    completed: number;
    total: number;
    href: string;
    currentStep?: string;
  }[];
  learningMap?: {
    id: string;
    title: string;
    prerequisites: string[];
    recommended: boolean;
    completed: boolean;
    progress?: string;
    href: string;
  }[];
  selectorVersion: string;
  mappingVersion: string;
  sourceRunId: string;
  asOfDay: string;
  schedulingTimezone: string;
  noAssessmentCredit: true;
  concept: { id: string; name: string; subskill?: string; competencyId?: string; skillId?: string };
  reasonCode: string;
  reason: string;
  prerequisiteFor?: string;
  diagnosticEvidence: 'likely-gap' | 'uncertain' | 'strength' | 'not-assessed';
  suggestedDifficulty: 1 | 2 | 3;
  difficultyReason: string;
  review: {
    status: 'not-started' | 'not-due' | 'due' | 'verification-needed' | 'content-update';
    dueDay?: string;
    intervalDays?: number;
    reason: string;
  };
  practice: PracticeSummary;
  variant: { fresh: boolean; available: boolean; ordinal?: number; reason: string };
  action: {
    kind: 'resume' | 'guided-practice' | 'fresh-verification' | 'review' | 'content-needed';
    href?: string;
    label: string;
    coverage: string;
  };
  evidence: { diagnosticReason: string; prerequisiteSupport: string[]; learningRunIds: string[] };
};
export type SavedLearningRecommendation = {
  recommendation: LearningRecommendation;
  decisionId?: string;
  saved: boolean;
};
