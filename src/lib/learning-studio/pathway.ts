// Versioned instructional crosswalk. No assessment questions or keys are imported.
import type { Bank, Report } from '../diagnostic/types';
import { pythonTopics } from '../tracks/python-topics';

export const PATHWAY_VERSION = 'diagnostic-learning-1-draft.1';
export const VARIABLES_MODULE = 'python-variables-references@1.0.0-draft.1';
// Explicit identities, never inferred from names or substring similarity.
export const competencyLinks = [
  ['values', 'py-fundamentals', 'fundamentals'],
  ['collections', 'py-structures', 'structures'],
  ['functions', 'py-functions', 'functions'],
  ['errors', 'py-exceptions', 'exceptions'],
  ['validation', 'py-validation', 'validation'],
  ['testing', 'py-testing', 'testing'],
  ['fundamentals', 'starter-fundamentals', 'fundamentals'],
  ['collections8', 'starter-collections8', 'structures'],
  ['functions8', 'starter-functions8', 'functions'],
  ['objects', 'starter-objects', 'oop'],
  ['dsa', 'starter-dsa', ''],
  ['debugging', 'starter-debugging', 'debugging'],
  ['testing8', 'starter-testing8', 'testing'],
  ['practical', 'starter-practical', 'files'],
] as const;

export const interactiveLinks = [
  {
    competency: 'collections',
    subskill: 'aliasing',
    coverage: 'Aliasing, rebinding and flat-list mutation.',
  },
  {
    competency: 'collections8',
    subskill: 'Aliasing and mutation',
    coverage: 'Aliasing, rebinding and flat-list mutation.',
  },
  {
    competency: 'collections8',
    subskill: 'List append',
    coverage:
      'Mutation through shared list references; other list operations need separate practice.',
  },
  {
    competency: 'collections8',
    subskill: 'Shallow copies',
    coverage: 'Flat-list shallow copying only; nested copying needs further instruction.',
  },
  {
    competency: 'fundamentals',
    subskill: 'Variables and true division',
    coverage: 'Assignment and rebinding only. Division is not taught in this lesson.',
  },
] as const;

export type PathwayItem = {
  competencyId: string;
  name: string;
  status: string;
  subskill?: string;
  priority: boolean;
  reason: string;
  moduleSkillId: string;
  existingSkillId?: string;
  existingSkillName?: string;
  prerequisites: string[];
  introduction?: string;
  moduleVersionId?: string;
  lessonTitle?: string;
  coverage: string;
  legacyHref?: string;
};
export type PathwaySnapshot = {
  version: string;
  sourceRunId: string;
  noAssessmentCredit: true;
  items: PathwayItem[];
};
export type PathwayView = Omit<PathwaySnapshot, 'items'> & {
  saved: boolean;
  items: (PathwayItem & {
    progress?: { runId: string; completed: number; total: number; status: string };
  })[];
};

export function buildPathway(bank: Bank, report: Report, sourceRunId: string): PathwaySnapshot {
  if (bank.roleId !== 'python-developer' || report.bankId !== bank.id)
    throw new Error('Unsupported report crosswalk.');
  const order = [
    ...new Set([...report.learningOrder, ...report.findings.map((f) => f.competencyId)]),
  ];
  return {
    version: PATHWAY_VERSION,
    sourceRunId,
    noAssessmentCredit: true,
    items: order.flatMap((id) => {
      const finding = report.findings.find((f) => f.competencyId === id);
      if (!finding) return [];
      const competency = bank.competencies.find((c) => c.id === id);
      const link = competencyLinks.find(
        ([c, skill]) =>
          c === id && skill === competency?.moduleSkillId && skill === finding.moduleSkillId,
      );
      const topic = link ? pythonTopics.find((t) => t.key === link[2]) : undefined;
      const interactive = link
        ? interactiveLinks.find((l) => l.competency === id && l.subskill === finding.nextSubskill)
        : undefined;
      const priority = report.learningOrder.includes(id);
      return [
        {
          competencyId: id,
          name: finding.name,
          status: finding.status,
          subskill: finding.nextSubskill,
          priority,
          reason: `${priority ? 'Your report places this area in the learning order.' : 'Optional consolidation outside the report learning order.'} ${finding.status}: ${finding.reason}${finding.nextStep ? ` Next: ${finding.nextStep}` : ''}`,
          moduleSkillId: finding.moduleSkillId,
          existingSkillId: topic ? `py-${topic.key}` : undefined,
          existingSkillName: topic?.name,
          prerequisites: topic?.prerequisites.map((p) => `py-${p}`) ?? [],
          introduction: topic?.concept,
          ...(interactive
            ? {
                moduleVersionId: VARIABLES_MODULE,
                lessonTitle: 'Python Variables, References, and Mutation',
              }
            : {}),
          coverage: interactive
            ? `Partial competency coverage. ${interactive.coverage}`
            : link
              ? 'Existing guided overview only. A full interactive lesson for this subskill is not yet available.'
              : 'Unmapped competency or skill identity. No lesson has been substituted.',
          legacyHref: link
            ? `/diagnostic-v2/learn?skill=${encodeURIComponent(finding.moduleSkillId)}&subskill=${encodeURIComponent(finding.nextSubskill ?? '')}`
            : undefined,
        },
      ];
    }),
  };
}
