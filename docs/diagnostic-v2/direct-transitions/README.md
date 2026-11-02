# Direct transitions after submission

The founder requested removal of the “Response saved / Keep going at your pace” interstitial. The working copy's direct-transition change was retained, reviewed and built for local hosting.

After a successful answer save, the returned current question renders immediately, with no separate receipt, Continue discovery button or artificial delay. The last response renders the completed report directly. The next question heading receives focus. Correctness, explanations and solutions remain withheld until the report.

The app still waits for the server transaction to succeed before advancing. A failed request retains the question and selected answer for retry. Draft persistence, ownership, idempotency, bank snapshots, scoring and historical reports are unchanged. No database migration, production data change, push, merge or deployment.

Local eight-area app: `http://localhost:3002/diagnostic-v2`. Refresh an existing tab to load the rebuilt client. The unapproved bank remains local-only with its draft banner.

Verification:

- Full unit/integration suite: 158/158 across 15 files, 74.92 seconds.
- ESLint, TypeScript, production build and whitespace check passed; build skipped migrations and seed.
- Three eight-area browser journeys passed in 24.2 seconds, including all 24 submissions through the actual UI, final report routing, heading focus, no save receipt/Continue button, interrupted submit and retry, numeric format/resume, eight-area default and historical six-area preservation.
- Twelve legacy browser checks passed in 1.7 minutes. Updated code-block, motion and end-to-end tests expect the next question directly instead of a receipt; keyboard, mobile, reduced motion, offline retry and completed review passed as well.
- The first unit/integration invocation found the local audit DB service stopped. It was restarted with the same persisted disposable data; the complete rerun passed. No production connection was used.

Authored questions, grading, policy and sandbox execution did not change. Earlier screenshot/audit artifacts showing a save screen are historical records, not the current UI.
