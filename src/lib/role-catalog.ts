import type { RoleSummary } from './types';
export const roleCatalog: RoleSummary[] = [
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Turn messy information into decision-ready evidence.',
    work: 'Investigate business metrics, experiments, and service performance.',
    duration: '20–30 minutes',
    categories: ['SQL', 'Spreadsheets', 'Python', 'Statistics', 'Communication'],
    assessmentIds: { diagnostic: 'diagnostic', reassessment: 'reassessment' },
    employerId: 'sample-employer',
    cohortId: 'demo-cohort',
  },
  {
    id: 'python-developer',
    name: 'Python Developer',
    description: 'Build dependable junior Python services and automation.',
    work: 'Implement contracts, repair code, explain tradeoffs and verify transfer in four work contexts.',
    duration: '90–120 minutes; pause and resume anytime',
    categories: [
      'Python fundamentals',
      'Data structures',
      'APIs & SQL',
      'Testing',
      'Communication',
    ],
    assessmentIds: {
      diagnostic: 'python-developer-diagnostic',
      reassessment: 'python-developer-reassessment',
    },
    employerId: 'python-employer',
    cohortId: 'python-cohort',
  },
  {
    id: 'java-developer',
    name: 'Java Developer',
    description: 'Build maintainable junior Java backend features.',
    work: 'Repair order services, choose collections, and separate backend responsibilities.',
    duration: '25–35 minutes',
    categories: ['Java fundamentals', 'OOP', 'Collections', 'Backend & testing', 'Communication'],
    assessmentIds: {
      diagnostic: 'java-developer-diagnostic',
      reassessment: 'java-developer-reassessment',
    },
    employerId: 'java-employer',
    cohortId: 'java-cohort',
  },
];
export function roleConfig(id: string) {
  const role = roleCatalog.find((r) => r.id === id);
  if (!role) throw new Error('Unknown role');
  return role;
}
