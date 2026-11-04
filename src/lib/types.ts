import type {
  PublicBank,
  EvidenceView,
  EvidenceSummary,
  PublicRepair,
  RepairView,
} from './authentic/types';
export type RoleSummary = {
  id: string;
  name: string;
  description: string;
  work: string;
  duration: string;
  categories: string[];
  assessmentIds: { diagnostic: string; reassessment: string };
  employerId: string;
  cohortId: string;
};
export type Skill = {
  id: string;
  name: string;
  category: string;
  description: string;
  target: number;
  importance: number;
  prerequisites: string[];
};
export type Option = { text: string; response: string };
export type Item = {
  id: string;
  phase: string;
  prompt: string;
  context: string;
  options: Option[];
  correct: number;
  explanation: string;
  skills: { skillId: string; weight: number }[];
};
export type Simulation = {
  id: string;
  title: string;
  stakeholder: string;
  stakeholderRole: string;
  company: string;
  brief: string;
  data: string;
  items: Item[];
};
export type PracticeItem = {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
  hint: string;
  explanation: string;
};
export type LessonContent = {
  objective: string;
  introduction: string;
  intuition: string;
  example: string;
  summary: string;
  items: PracticeItem[];
};
export type LessonSeed = {
  id: string;
  skillId: string;
  title: string;
  minutes: number;
  content: LessonContent;
};
export type Score = { skillId: string; score: number; evidence: number; quality?: EvidenceSummary };
export type Gap = Skill & {
  current: number;
  gap: number;
  priority: number;
  blockedBy: string[];
  reason: string;
};
export type PublicItem = Omit<Item, 'correct' | 'explanation'>;
export type PublicLesson = Omit<LessonSeed, 'content'> & {
  content: Omit<LessonContent, 'items'> & {
    items: Omit<PracticeItem, 'correct' | 'hint' | 'explanation'>[];
  };
};
export type AttemptView = {
  id: string;
  bankId?: string | null;
  assessmentVersion?: string;
  contentVersion?: string;
  skillSnapshot?: Skill[];
  bank?: PublicBank;
  evidence?: EvidenceView[];
  kind: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  answers: { questionId: string; selected: number; response: string }[];
  scores: Score[];
};
export type ProgressView = {
  lessonId: string;
  mode: string;
  run: number;
  status: string;
  answered: {
    itemId: string;
    selected: number;
    correct: boolean;
    first: boolean;
    explanation: string;
  }[];
};
export type DemoState = {
  repairs?: PublicRepair[];
  repairProgress?: RepairView[];
  role: RoleSummary;
  roles: RoleSummary[];
  user: { id: string; name: string };
  skills: Skill[];
  scenarios: {
    diagnostic: (Omit<Simulation, 'items'> & { items: PublicItem[] })[];
    reassessment: (Omit<Simulation, 'items'> & { items: PublicItem[] })[];
  };
  attempts: AttemptView[];
  lessons: PublicLesson[];
  progress: ProgressView[];
  employer: {
    name: string;
    description: string;
    requirements: { skillId: string; target: number }[];
  };
};
export type CohortView = {
  role: RoleSummary;
  roles: RoleSummary[];
  college: string;
  cohort: string;
  members: {
    alias: string;
    diagnosed: boolean;
    initialScores: Score[];
    currentScores: Score[];
    modulesCompleted: number;
    modulesAssigned: number;
  }[];
  skills: Skill[];
};
