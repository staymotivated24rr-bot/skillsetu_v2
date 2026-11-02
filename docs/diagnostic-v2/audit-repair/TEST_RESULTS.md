# Executed verification

Environment: Windows, Node 24.21, Prisma 6.19, installed Next 16.4.3, local PostgreSQL, disposable `skillsetu_audit`, Chromium-based Edge through Playwright. Installed dependencies differ from this branch's older lockfile; a clean locked dependency reinstall was NOT verified. Dependency remediation remains a separate release gate.

- Baseline original engine suite: 16/16 pass before implementation; published bank fingerprint retained.
- New contract/policy plus original engine targeted tests: 38/38 pass.
- Complete unit/integration suite: 113/113 in 11 files, 61.98 seconds. Includes all original roles, migration/history tests, new contract cases, hint flags, ownership, concurrency/idempotency, legacy snapshot completion and immutable report reopen, explicit independent/prior-informed starts.
- Final production staging browser run: 6/6 pass; desktop strong completion, mobile struggling flow, hints/drafts/offline retry/refresh, cross-session and origin/forged input rejection, keyboard ordering, reduced motion and three original manipulation fixtures. Guided practice completion is additionally asserted to leave the sealed report unchanged. Screenshots are captured with synthetic identities; manipulation screenshots use explicit disposable QA fixtures rather than pretending their evidence came from learner assessment.
- Lint and typecheck pass. Production build passes with VERCEL=1 so no build-time migrations or seed writes occur.
- git diff --check passes. No new schema migration. Existing migrations were applied only to disposable data.

Transient failures fixed: stale `.next` types referenced a route from another branch (cleared only the verified local build cache); inherited npm/npx subprocess launches failed on Windows (Node CLI paths now used); a legacy test's old-bank ID was updated to the new-bank ID; a new practice assertion initially matched two status elements and was narrowed to the stage announcement. No failures were suppressed or skipped to obtain these counts.

Not executed: remote production verification, full legacy Pyodide browser matrix on this branch, formal screen-reader audit, human educator panel, empirical fairness/reliability study, clean locked install, capacity/load benchmark, production migration or deployment. Test success does not establish 10,000-user capacity or psychometric validity.

Screenshots: screenshots/audit-loop-boundary.png, audit-state-cards.png, audit-error-location.png, audit-guided-repair.png and diagnostic-v2-desktop-report.png. They were visually inspected for readable controls, unclipped mobile layout and focus visibility.
