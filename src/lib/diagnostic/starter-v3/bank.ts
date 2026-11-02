// Server-only source. Never import this module from a client component.
import source from './source.json';
import type { Bank, Question } from '../types';
import { numericResult } from '../numeric';
import { clarifications } from './clarifications';

export const STARTER_BANK_PREFIX = 'python-starter-v3-360-';
export const STARTER_BANK_ID = STARTER_BANK_PREFIX + 'draft-2';
const ids = [
  'fundamentals',
  'collections8',
  'functions8',
  'objects',
  'dsa',
  'debugging',
  'testing8',
  'practical',
];
const prerequisites = [
  [],
  ['fundamentals'],
  ['fundamentals'],
  ['functions8'],
  ['collections8', 'functions8'],
  ['functions8'],
  ['debugging'],
  ['collections8', 'debugging'],
];

/** Fail closed on source integrity; keep all original review fields in the private source. */
export function validateStarterSource(): void {
  const qs = source.questions;
  if (
    qs.length !== 360 ||
    new Set(qs.map((q) => q.id)).size !== 360 ||
    source.competencies.length !== 8 ||
    new Set(qs.map((q) => q.family_id)).size !== 120 ||
    qs.filter((q) => q.response_mode === 'multiple_choice').length !== 216 ||
    qs.filter((q) => q.answer_value_type === 'integer').length !== 135 ||
    qs.filter((q) => q.answer_value_type === 'float').length !== 9
  )
    throw new Error('Starter source distribution mismatch.');
  for (const name of source.competencies)
    for (const level of source.difficulty_levels) {
      if (qs.filter((q) => q.competency === name && q.difficulty === level).length !== 15)
        throw new Error('Starter competency/difficulty imbalance.');
    }
  for (const q of qs) {
    const choices = Object.values(q.options);
    if (
      choices.length !== 4 ||
      choices.some((v) => !v.trim()) ||
      new Set(choices).size !== 4 ||
      q.options[q.correct_option as keyof typeof q.options] !== q.correct_answer ||
      choices.filter((v) => v === q.correct_answer).length !== 1 ||
      q.version !== 3 ||
      !q.status.startsWith('Draft') ||
      !source.competencies.includes(q.competency)
    )
      throw new Error(`Invalid starter source: ${q.id}`);
    if (q.response_mode === 'numeric_input') {
      if (
        q.options_visible ||
        !q.input_hint ||
        !q.numeric_expected_answer ||
        !numericResult(
          {
            kind: q.answer_value_type as 'integer' | 'float',
            places: q.decimal_places!,
            expected: q.numeric_expected_answer,
          },
          q.numeric_expected_answer,
        ).correct
      )
        throw new Error(`Invalid numeric source: ${q.id}`);
    } else if (q.response_mode !== 'multiple_choice' || !q.options_visible)
      throw new Error(`Invalid response mode: ${q.id}`);
  }
}

export const starterDiagnostic: Bank = {
  id: STARTER_BANK_ID,
  version: '4.0.0-draft.2',
  roleId: 'python-developer',
  roleName: 'Python Developer · draft eight-area preview',
  // Eight areas × three independent observations require at least 24 questions.
  policy: { minimum: 24, target: 24, maximum: 30, coverage: 3 },
  competencies: source.competencies.map((name, i) => ({
    id: ids[i],
    name,
    prerequisites: prerequisites[i],
    skillIds: [],
    moduleSkillId: 'starter-' + ids[i],
    subskills: [
      ...new Set(source.questions.filter((q) => q.competency === name).map((q) => q.subskill)),
    ],
  })),
  questions: source.questions.map((q): Question => {
    const numeric = q.response_mode === 'numeric_input';
    return {
      id: q.id,
      version: `${source.version}/item-${q.version}${clarifications[q.id] ? '/engineering-clarification-1' : ''}`,
      competencyId: ids[source.competencies.indexOf(q.competency)],
      difficulty: (source.difficulty_levels.indexOf(q.difficulty) + 1) as 1 | 2 | 3,
      type: numeric ? 'prediction' : 'decision',
      title: q.subskill,
      prompt: q.prompt,
      code: q.code ?? undefined,
      options: numeric ? undefined : Object.values(q.options),
      correct: numeric ? undefined : ['A', 'B', 'C', 'D'].indexOf(q.correct_option),
      expected: numeric ? [q.numeric_expected_answer!] : undefined,
      numeric: numeric
        ? {
            kind: q.answer_value_type as 'integer' | 'float',
            places: q.decimal_places!,
            hint: q.input_hint!,
            expected: q.numeric_expected_answer!,
          }
        : undefined,
      optionHypotheses: numeric ? undefined : Object.values(q.misconceptions),
      sourceKind: q.question_type === 'trace' ? 'trace' : 'conceptual',
      subskill: q.subskill,
      exposureFamily: q.family_id,
      misconception: `Unconfirmed difficulty with ${q.subskill}`,
      explanation: q.explanation,
      hint: `Trace one operation at a time and check the stated ${q.subskill.toLowerCase()} contract. Using this hint marks the response as assisted.`,
      seconds: q.estimated_seconds,
      context: 'Draft preview: expert review and pilot validation pending.',
      difficultyReason: `Authored ${q.difficulty.toLowerCase()} level; not empirically calibrated.`,
      accessibility: {
        inputLabel: numeric ? q.input_hint! : 'Choose one answer, A through D',
        codeLanguage: 'python',
      },
      ...clarifications[q.id],
    };
  }),
};

export function draftPreviewEnabled(): boolean {
  // Local-only until explicit approval. A flag alone cannot open a hosted production build.
  let local = false;
  try {
    local = ['localhost', '127.0.0.1', '[::1]'].includes(
      new URL(process.env.DATABASE_URL ?? '').hostname,
    );
  } catch {
    /* closed */
  }
  return (
    local &&
    process.env.DIAGNOSTIC_STARTER_V3_PREVIEW === 'true' &&
    process.env.DIAGNOSTIC_DRAFT_ENV === 'local' &&
    !process.env.VERCEL
  );
}

export { source as starterSource };

/** Explicit local development choice; never a hosted production default. */
export function defaultDraftPreview(): boolean {
  return draftPreviewEnabled() && process.env.DIAGNOSTIC_STARTER_V3_DEFAULT === 'true';
}
