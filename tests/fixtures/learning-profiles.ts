import type { Bank, Report } from '../../src/lib/diagnostic/types';
import type { PracticeHistory } from '../../src/lib/learning-studio/selector-types';
import { VARIABLES_MODULE } from '../../src/lib/learning-studio/pathway';
const now = '2026-11-03T12:00:00.000Z';
export const simulationBank: Bank = {
  id: 'synthetic-learning-six',
  version: 'synthetic-1',
  roleId: 'python-developer',
  roleName: 'Python Developer',
  policy: { minimum: 18, target: 24, maximum: 30, coverage: 3 },
  questions: [],
  competencies: [
    {
      id: 'values',
      name: 'Values & control flow',
      moduleSkillId: 'py-fundamentals',
      skillIds: ['py-fundamentals'],
      prerequisites: [],
      subskills: ['loop boundaries'],
    },
    {
      id: 'collections',
      name: 'Collections & mutation',
      moduleSkillId: 'py-structures',
      skillIds: ['py-structures'],
      prerequisites: ['values'],
      subskills: ['aliasing'],
    },
    {
      id: 'functions',
      name: 'Function contracts',
      moduleSkillId: 'py-functions',
      skillIds: ['py-functions'],
      prerequisites: ['values'],
      subskills: ['return values'],
    },
  ],
};
export function simulationReport(strength = false): Report {
  return {
    role: 'Python Developer',
    bankId: simulationBank.id,
    engineVersion: 'synthetic-report',
    answered: 9,
    stopReason: 'Synthetic teaching-policy simulation',
    evidence: [],
    learningOrder: strength ? [] : ['collections', 'values', 'functions'],
    findings: simulationBank.competencies.map((c) => ({
      competencyId: c.id,
      name: c.name,
      moduleSkillId: c.moduleSkillId,
      prerequisites: c.prerequisites,
      nextSubskill: c.subskills[0],
      status: strength ? 'Demonstrated strength' : 'Insufficient evidence',
      count: 3,
      independent: strength ? 3 : 0,
      correct: strength ? 3 : 0,
      types: 3,
      reason: strength
        ? 'Three synthetic unaided matches support a preliminary strength.'
        : 'Synthetic uncertain observations do not establish a weakness.',
    })),
  };
}
const checkpoints = [
  'vr-rebind',
  'vr-alias-output',
  'vr-copy-output',
  'vr-string-output',
  'vr-identity',
];
export function practiceHistory(
  options: {
    ordinal?: number;
    at?: string;
    correct?: boolean[];
    assisted?: boolean;
    final?: boolean;
    hints?: number;
  } = {},
): PracticeHistory {
  const ordinal = options.ordinal ?? 1,
    at = options.at ?? '2026-11-02T10:00:00.000Z';
  return {
    runId: `synthetic-run-${ordinal}`,
    moduleVersionId: VARIABLES_MODULE,
    lessonId: 'python-variables-references',
    ordinal,
    completed: 12,
    total: 12,
    currentStepId: 'vr-final',
    status: 'completed',
    hints: options.hints ?? 0,
    createdAt: at,
    attempts: [
      ...checkpoints.map((stepId, index) => ({
        stepId,
        attempt: 1,
        first: true,
        correct: options.correct?.[index] ?? true,
        assisted: options.assisted ?? false,
        at,
      })),
      {
        stepId: 'vr-final',
        attempt: 1,
        first: true,
        correct: options.final ?? true,
        assisted: options.assisted ?? false,
        at,
      },
    ],
  };
}
export function learnerSimulations() {
  const base = simulationReport(true);
  base.learningOrder = ['collections', 'functions'];
  base.findings.find((f) => f.competencyId === 'collections')!.status = 'Likely gap';
  base.findings.find((f) => f.competencyId === 'collections')!.reason =
    'Synthetic repeated unaided aliasing difficulty.';
  return [
    {
      name: 'complete-beginner',
      bank: simulationBank,
      report: simulationReport(),
      sourceRunId: 'synthetic-beginner',
      histories: [],
      now,
    },
    {
      name: 'strong',
      bank: simulationBank,
      report: simulationReport(true),
      sourceRunId: 'synthetic-strong',
      histories: [practiceHistory()],
      now,
    },
    {
      name: 'struggling',
      bank: simulationBank,
      report: base,
      sourceRunId: 'synthetic-struggling',
      histories: [practiceHistory({ correct: [false, false, false, false, false], final: false })],
      now,
    },
    {
      name: 'inconsistent',
      bank: simulationBank,
      report: base,
      sourceRunId: 'synthetic-inconsistent',
      histories: [practiceHistory({ correct: [true, false, true, false, false], final: false })],
      now,
    },
    {
      name: 'repeated-hints',
      bank: simulationBank,
      report: base,
      sourceRunId: 'synthetic-hints',
      histories: [practiceHistory({ assisted: true, hints: 5 })],
      now,
    },
    {
      name: 'returning-after-inactivity',
      bank: simulationBank,
      report: simulationReport(true),
      sourceRunId: 'synthetic-returning',
      histories: [practiceHistory({ at: '2026-09-01T10:00:00.000Z' })],
      now,
    },
  ];
}
