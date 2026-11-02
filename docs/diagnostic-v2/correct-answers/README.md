# Correct answers in the completed review — 31 October 2026

Every question in a completed diagnostic review now has a distinct **Correct answer** section alongside the learner's saved answer and recorded result. Multiple-choice options and code palettes also label the correct choice directly, while preserving a separate Your selection marker.

- Multiple choice: correct option number and its full text.
- Code blocks: the correct piece for every blank and the fully completed code.
- Ordering: the complete correct step sequence.
- Text/prediction/completion: all authored accepted forms.

This is shown for correct, wrong and unsure responses. The learner can still select any question number or use Previous/Next. The correct option is marked even when the learner selected a different one. Total correct counts, assistance labels, competence findings and grading are unchanged.

## End-only access and immutable history

The founder explicitly requested correct solutions in the final report. This change authorizes that disclosure only for submitted questions in an owned, completed run. Active question projections still omit raw answer keys, expected values, contracts and solutions. In-progress report/review remain null. The new human-readable correctAnswer field belongs only to the completed review; no full bank or unattempted question solutions are returned.

Solutions are read from the attempt's immutable bank snapshot. They are not derived from the learner's answer or from the newest published bank. Existing report JSON and response payloads are not modified or regraded. Existing completed reports gain this view after refresh, without retaking or backfilling data. Missing/corrupt archived question content receives an explicit unavailable message rather than an invented solution.

No schema migration, bank-content change, bank version, grading rule, dependency or practice-progress change is needed. The existing fixed-bank familiarity warning still applies to reassessment after reviewing solutions. This is a learning feature, not psychometric validation or a hiring score.

## Verification

- Full unit/integration suite: 144/144 tests, 13 files, 80.66 seconds.
- Solution resolution checks every entry in the 36-item legacy, 48-item reviewed and 60-item block banks, including each authored text alternative. It checks solution/key agreement, snapshot-specific keys, preserved sealed outcomes and missing-content handling. These are engineering checks, not independent educator validation.
- Browser review walks every submitted question in a natural mixed run and compares displayed correct solutions with the authored option, each blank, ordered steps or text answers. It checks in-progress hiding, saved selections/results, 390/320 layout and reopening without changing the sealed report.
- Repository lint, TypeScript and production build pass. Build used VERCEL=1 to skip migrations/seed; the app runs locally with ignored .env.audit against disposable skillsetu_audit. Browser run totals are recorded in BUILD_PROVENANCE.json.
- Desktop code-block and mobile multiple-choice screenshots were visually inspected and retained under previews/.

Local preview: http://localhost:3002/diagnostic-v2. Refresh the completed report and open Review every question. Previous attempts remain intact. Production deployment/commit parity was not inspected; nothing in these notes is attributed to the live build. No push, merge, deployment, production database operation or learner code execution occurred.

Combined Chromium/Edge verification: **12/12 passed in 2.3 minutes**, including end-only solutions for every reviewed question and all existing diagnostic regressions. Source/build hashes and local runtime provenance are in BUILD_PROVENANCE.json.
