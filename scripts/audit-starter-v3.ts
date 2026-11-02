import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  starterDiagnostic as bank,
  starterSource,
  validateStarterSource,
} from '../src/lib/diagnostic/starter-v3/bank';
import { selectNext, grade, makeReport, validateBank } from '../src/lib/diagnostic/engine';
import type { Answer, Evidence } from '../src/lib/diagnostic/types';
import { clarifications } from '../src/lib/diagnostic/starter-v3/clarifications';
const directory = 'docs/diagnostic-v2/starter-v3';
mkdirSync(directory, { recursive: true });
validateStarterSource();
validateBank(bank);
const profiles = ['strong', 'struggling', 'mixed'] as const;
const journeys = profiles.map((profile) => {
  const evidence: Evidence[] = [];
  const trace = [];
  let selection = selectNext(bank, evidence);
  while (selection.questionId) {
    const q = bank.questions.find((q) => q.id === selection.questionId)!;
    const correct = profile === 'strong' || (profile === 'mixed' && evidence.length % 3 !== 0);
    const answer: Answer = correct
      ? q.numeric
        ? { text: q.numeric.expected }
        : { selected: q.correct }
      : q.numeric
        ? { text: '-99999' + (q.numeric.places ? '.' + '0'.repeat(q.numeric.places) : '') }
        : { selected: (q.correct! + 1) % 4 };
    const result = grade(q, answer);
    trace.push({
      position: evidence.length + 1,
      id: q.id,
      version: q.version,
      competency: q.competencyId,
      family: q.exposureFamily,
      difficulty: q.difficulty,
      type: q.type,
      answer,
      rationale: selection.rationale,
    });
    evidence.push({
      questionId: q.id,
      correct: result.correct,
      assisted: false,
      payload: JSON.stringify(answer),
    });
    selection = selectNext(bank, evidence);
  }
  return {
    profile,
    trace,
    stopReason: selection.rationale,
    report: makeReport(bank, evidence, selection.rationale),
  };
});
writeFileSync(directory + '/SELECTION_TRACES.json', JSON.stringify(journeys, null, 2));
const special: Record<string, string> = {
  'SS-PY-0220':
    'Review O(V+E) assumptions and distinguish direct BFS from priority-queue alternatives.',
  'SS-PY-0221': 'Review nonnegative weights and min-priority-queue wording.',
  'SS-PY-0222': 'State connected graph requirement or explicitly allow a minimum spanning forest.',
  'SS-PY-0284': 'Exact True identity is narrower than truthiness or boolean type alone.',
  'SS-PY-0301': 'Integer domain avoids floating-point summation order ambiguity.',
  'SS-PY-0305':
    'Tolerance must be justified by measurement scale; no universal scientific tolerance.',
  'SS-PY-0343':
    'BLOCK: presence requirement does not name API_KEY or distinguish missing keys from empty strings. getenv is retrieval; membership is explicit presence. Rewrite stem/options in a new item revision.',
  'SS-PY-0344':
    'BLOCK: glob matches CSV-named directories too; all files requires is_file filtering or explicitly asking for matching pathnames. Rewrite under a new item revision.',
  'SS-PY-0346':
    'shell=False prevents shell interpolation, not option injection into the invoked program. State fixed trusted program and argument contract.',
  'SS-PY-0355':
    'Tracebacks may contain secrets in exception messages. This is no guarantee of safe logging; keep narrow wording and expert review.',
};
const review = starterSource.questions.map((q) => ({
  id: q.id,
  version: q.version,
  family: q.family_id,
  status: q.status,
  distractorReview: q.distractor_review_status,
  structuralChecks: 'passed',
  expertApproval: 'PENDING',
  learnerEligible: false,
  candidateRevision: clarifications[q.id]
    ? 'engineering-clarification-1; unapproved'
    : 'unchanged source draft',
  engineeringNote:
    (clarifications[q.id]
      ? 'Supplied-source issue addressed in a separately versioned engineering candidate; independent review pending. Source concern: '
      : '') +
    (special[q.id] ??
      (q.response_mode === 'multiple_choice'
        ? 'Key consistency checked; distractor uniqueness/plausibility still requires independent educator review.'
        : 'Numeric contract checked; independent educator and pilot review pending.')),
}));
writeFileSync(
  directory + '/QUALITY_REVIEW.json',
  JSON.stringify(
    {
      sourceSHA256: createHash('sha256')
        .update(readFileSync('src/lib/diagnostic/starter-v3/source.json'))
        .digest('hex'),
      bankId: bank.id,
      policy: bank.policy,
      review,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    journeys.map((j) => ({
      profile: j.profile,
      count: j.trace.length,
      findings: j.report.findings.map((f) => ({ area: f.name, status: f.status, count: f.count })),
      stopReason: j.stopReason,
    })),
    null,
    2,
  ),
);
