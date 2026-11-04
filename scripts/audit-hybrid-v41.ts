import { mkdirSync, writeFileSync } from 'node:fs';
import { simulateProfile, profileNames, profileAnswer } from '../tests/helpers/hybrid-profiles';
import { HYBRID_VERSION } from '../src/lib/diagnostic/hybrid-vnext';
import { starterDiagnostic as bank } from '../src/lib/diagnostic/starter-v3/bank';
import { selectNext, grade, makeReport } from '../src/lib/diagnostic/engine';
import type { Evidence } from '../src/lib/diagnostic/types';
const directory = 'docs/diagnostic-v2/hybrid-v41';
mkdirSync(directory, { recursive: true });
const journeys = profileNames.map(simulateProfile);
const baseline = (['beginner', 'advanced', 'unsure'] as const).map((profile) => {
  const rows: Evidence[] = [];
  let selection = selectNext(bank, rows);
  while (selection.questionId) {
    const q = bank.questions.find((q) => q.id === selection.questionId)!;
    const payload = profileAnswer(q, profile);
    rows.push({
      questionId: q.id,
      correct: grade(q, payload).correct,
      assisted: false,
      payload: JSON.stringify(payload),
    });
    selection = selectNext(bank, rows);
  }
  const report = makeReport(bank, rows, selection.rationale);
  const after = journeys.find((j) => j.profile === profile)!;
  return {
    profile,
    before: {
      engine: report.engineVersion,
      count: rows.length,
      statuses: report.findings.map((f) => f.status),
    },
    after: {
      engine: HYBRID_VERSION,
      count: after.trace.length,
      statuses: after.report.findings.map((f) => f.status),
    },
  };
});
writeFileSync(directory + '/BASELINE_COMPARISON.json', JSON.stringify(baseline, null, 2) + '\n');
writeFileSync(
  directory + '/SELECTION_TRACES.json',
  JSON.stringify(
    {
      engineVersion: HYBRID_VERSION,
      note: 'Synthetic fixtures, not learner calibration or employment readiness evidence.',
      journeys,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    journeys.map((j) => ({
      profile: j.profile,
      seed: j.seed,
      count: j.trace.length,
      findings: j.report.findings.map((f) => ({
        area: f.name,
        status: f.status,
        independent: f.independent,
        unsure: f.unsure,
      })),
    })),
    null,
    2,
  ),
);
