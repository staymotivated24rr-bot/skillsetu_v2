# Final answer count and individual question review — 31 October 2026

The completed report now shows **X / total correct**, the number wrong or unsure, and the number correct with a process hint. The count is per submitted question, not per code blank. Assisted correct answers are included in the raw answer total and labeled explicitly; existing independent-proficiency calculations remain unchanged.

The last section of the report is **Review every question**. Expand its review disclosure to choose any numbered question or use Previous/Next. Each view shows the complete saved prompt, original code, original options/steps/code palettes, the learner's submitted text/option/step order/block selections, Correct or Wrong, assistance status and the sealed explanation. Code-block review includes the learner's assembled code. Choices are read-only and selected options are labeled. Navigation announces question position and moves keyboard focus to the selected question heading. The question navigator and detail view work at mobile widths 390 and 320.

This also works for existing completed reports without retaking the diagnostic. Refresh the local browser tab to load the new interface. No results or review data appear while a run is in progress.

## History and privacy

The score is derived from the sealed report evidence. A separate, completed-only `RunView.review` projection joins that evidence with the original bank snapshot and original persisted response payloads. It preserves report order and grades exactly as stored. It does not regrade, regenerate or update the historical report JSON, responses or bank content. It never substitutes the current live bank for an attempt's original snapshot. Missing or malformed legacy payloads produce an explicit unavailable-answer message; stored outcomes stay readable and are not invented or changed.

Each question uses the existing public projection, excluding answer keys, expected outputs, contracts and authored solutions. Only the learner's saved choice and the existing sealed result are added to the completed review. Existing ownership, session, checksum and transaction behavior remain in force. An in-progress run returns `report: null` and `review: null`.

No schema migration, bank publication, scoring change or learning-progress change is required. Existing applied migrations and all three authored bank files remain unchanged. No learner code is executed.

## Verification

- Repository ESLint and TypeScript passed; production build passed with migrations/seed explicitly skipped through `VERCEL=1`.
- Full unit/integration run: **139 tests passed, 13 files, 81.23 seconds**. New coverage checks all four answer formats, absence of private question keys, preservation of sealed outcomes and snapshot prompts, malformed legacy payloads, evidence ordering and missing-question fallback. Service coverage verifies completed-only review and byte-stable stored report JSON across repeated reads.
- Combined local Edge/Chromium regression run: **12/12 passed in 2.1 minutes**. It includes the code-block sweep, active-attempt preservation, natural diagnostic completion, historical bookmark/lesson behavior, security/idempotency, keyboard/mobile layout and neutral intermediate receipts.
- The new review journey creates an isolated mixed run through the real API and adaptive selector, without rewriting an existing attempt. It verifies the total and assisted count, then opens every submitted question and compares its prompt, saved answer, explanation and result. The run includes code-block, option, ordering and text formats. It verifies navigation boundaries, keyboard focus, 390/320 layout and report equality after reopening.
- The same review journey was rerun to capture the score close-up: **1/1 passed in 14.2 seconds**. Screenshots under previews/ were visually inspected on desktop and mobile.
- Local page and health endpoint return HTTP 200; runtime uses the disposable local skillsetu_audit database. No production commit/deployment parity was inspected, and no behavior is attributed to the live build.

Implementation is in `report-review.ts` (read-only reconstruction), `diagnostic-question-review.tsx` (score/navigation/detail), the existing service view and the diagnostic report shell. The new browser test is `e2e/diagnostic-review.spec.ts`.

No merge, push, deployment, production database operation or history reset was performed. Full independent educator/psychometric validation and full screen-reader certification remain outside these engineering checks.
