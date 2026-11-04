import { starterDiagnostic as bank } from '../../src/lib/diagnostic/starter-v3/bank';
import { grade, makeReport, selectNext } from '../../src/lib/diagnostic/engine';
import { HYBRID_VERSION } from '../../src/lib/diagnostic/hybrid-vnext';
import type { Answer, Evidence, Question } from '../../src/lib/diagnostic/types';

export type Profile =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'fundamentals-strong-dsa-weak'
  | 'misconception'
  | 'unsure'
  | 'assisted';
export const profileNames: Profile[] = [
  'beginner',
  'intermediate',
  'advanced',
  'fundamentals-strong-dsa-weak',
  'misconception',
  'unsure',
  'assisted',
];
export function profileAnswer(q: Question, profile: Profile): Answer {
  if (profile === 'unsure') return { text: 'unsure' };
  const right =
    profile === 'advanced' ||
    profile === 'assisted' ||
    (profile === 'intermediate' && q.difficulty <= 2) ||
    (profile === 'fundamentals-strong-dsa-weak' && q.competencyId !== 'dsa') ||
    (profile === 'misconception' &&
      !['SS-PY-FAM-021', 'SS-PY-FAM-022', 'SS-PY-FAM-026'].includes(q.exposureFamily!));
  if (right) return q.numeric ? { text: q.numeric.expected } : { selected: q.correct };
  if (q.numeric)
    return { text: '-99999' + (q.numeric.places ? '.' + '0'.repeat(q.numeric.places) : '') };
  const misconceptionIndex =
    q.optionHypotheses?.findIndex((h) => !!h && h.includes('independent copy')) ?? -1;
  return {
    selected: misconceptionIndex >= 0 ? misconceptionIndex : (q.correct! + 1) % q.options!.length,
  };
}
export function profileSeed(profile: Profile): string {
  if (profile !== 'misconception') return 'profile-' + profile;
  for (let i = 0; i < 1000; i++) {
    const seed = 'alias-profile-' + i;
    const first = selectNext(bank, [], {
      version: HYBRID_VERSION,
      seed,
      initialCompetency: 'collections8',
    });
    if (bank.questions.find((q) => q.id === first.questionId)!.exposureFamily === 'SS-PY-FAM-021')
      return seed;
  }
  throw new Error('No fixture seed found.');
}
export function simulateProfile(profile: Profile) {
  const seed = profileSeed(profile),
    context = { version: HYBRID_VERSION, seed };
  const evidence: Evidence[] = [],
    trace = [];
  let selection = selectNext(
    bank,
    evidence,
    profile === 'misconception' ? { ...context, initialCompetency: 'collections8' } : context,
  );
  while (selection.questionId) {
    if (evidence.length >= 30) throw new Error('Run exceeded maximum.');
    const q = bank.questions.find((q) => q.id === selection.questionId)!;
    const payload = profileAnswer(q, profile),
      result = grade(q, payload);
    trace.push({
      position: evidence.length + 1,
      itemId: q.id,
      itemVersion: q.version,
      competency: q.competencyId,
      family: q.exposureFamily,
      difficulty: q.difficulty,
      type: q.type,
      answer: payload,
      correct: result.correct,
      assisted: profile === 'assisted',
      rationale: selection.rationale,
    });
    evidence.push({
      questionId: q.id,
      correct: result.correct,
      assisted: profile === 'assisted',
      payload: JSON.stringify(payload),
    });
    selection = selectNext(bank, evidence, context);
  }
  return {
    profile,
    seed,
    trace,
    evidence,
    stopReason: selection.rationale,
    report: makeReport(bank, evidence, selection.rationale, HYBRID_VERSION),
  };
}
