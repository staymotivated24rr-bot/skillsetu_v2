import { mkdirSync, writeFileSync } from 'node:fs';
import { starterDiagnostic, starterSource } from '../src/lib/diagnostic/starter-v3/bank';
import {
  optionPresentation,
  optionPresentationIssues,
} from '../src/lib/diagnostic/option-presentation';
const rows = starterSource.questions.map((q) => {
  const mapped = starterDiagnostic.questions.find((item) => item.id === q.id)!;
  const options = mapped.options ?? Object.values(q.options);
  return {
    id: q.id,
    mode: q.response_mode,
    presented: !!mapped.options,
    formerlyCollapsed:
      new Set(options.map((s) => s.replace(/\s+/g, ' ').trim())).size !== options.length,
    status: optionPresentationIssues(options).length ? 'QUARANTINE' : 'DISTINGUISHABLE',
    issues: optionPresentationIssues(options),
    options: options.map(optionPresentation),
  };
});
const directory = 'docs/diagnostic-v2/audit-fixes';
mkdirSync(directory, { recursive: true });
const summary = {
  bankId: starterDiagnostic.id,
  questions: rows.length,
  mcqs: rows.filter((r) => r.presented).length,
  renderedChoices: rows.filter((r) => r.presented).length * 4,
  numericItems: rows.filter((r) => !r.presented).length,
  formerlyCollapsed: rows.filter((r) => r.formerlyCollapsed).map((r) => r.id),
  quarantined: rows.filter((r) => r.status === 'QUARANTINE').map((r) => r.id),
  expertApproval: 'PENDING; local draft only',
  rows,
};
writeFileSync(directory + '/OPTION_PRESENTATION_AUDIT.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, rows: undefined }, null, 2));
if (summary.quarantined.length) process.exitCode = 1;
