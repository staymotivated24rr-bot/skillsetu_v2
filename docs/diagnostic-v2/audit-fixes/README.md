# Student-audit fixes — 1 November 2026

Branch: `codex/diagnostic-audit-fixes`, based on `1c8b717`. Local development only. No production deployment or production database operations.

## Before / after

| Issue | Before | Fixed behavior |
| --- | --- | --- |
| B03 | Q10's whitespace-dependent choices both appeared as `python 5`; Q6/Q18 output lines collapsed. | Shared assessment/review renderer: monospace, preserved line breaks, visible space/newline/tab markers and spoken whitespace descriptions. Saved/correct answers use the same display. |
| B01 | Numeric syntax errors appeared in a global banner above the viewport. | Error directly below the input, `role=alert`, associated description and `aria-invalid`; preserves focus/value and scrolls the message into view. Invalid formats do not send answer requests. Server validation remains authoritative. |
| B04 | Binary-search error led to graph algorithms and a generic testing check. | Complexity/binary-search links teach O(log n), sorted random-access assumptions, halving, linear-vs-binary work, input doubling, empty/singleton cases and an unseen transfer trace. |
| B02 | `1 answers`, `1 responses`, `1 task types`, `1 independent families`. | Count-aware map, progress, resume, summary and report labels. Historical rationale/reason grammar is formatted only for display; stored strings remain intact. |

## All 360 questions audited

Run `node --import tsx scripts/audit-option-presentation.ts`. The [complete audit](OPTION_PRESENTATION_AUDIT.json) checks all 360 source option sets and the mapped options actually presented: **216 MCQs / 864 visible choices**, plus **144 numeric questions with hidden source options**.

Three items collapsed under the old rendering: **SS-PY-0295, SS-PY-0296, SS-PY-0297**. All now remain distinguishable. **Zero remaining presentation collisions; zero items require quarantine.** New-bank validation rejects colliding visible/accessibility representations, including canonical Unicode equivalents. Scoring also rejects an unpresentable choice set with an unscored 422. Audit failures are flagged `QUARANTINE`; coverage is never silently relaxed. This is not independent educator approval or semantic key validation.

## Preservation and migration

No migration, reset, dependency change, key edit, item renumbering or bank content/version change. Saved option indexes, snapshots, grades and report JSON remain intact. Old wrong answers are not retrospectively regraded; their actual whitespace now appears in review. Adaptive rules and the draft 24/24/30/3 policy are unchanged. The only scoring-path addition refuses ambiguous choices before evidence is saved.

Public active questions remain key-free; correct answers remain limited to owned completed reviews. No learner code execution. All 360 draft questions retain the existing explicit local-only preview gate; no hosted enablement. Practice never changes diagnostic proficiency.

Only the verified **localhost `skillsetu_test`** database was migrated/seeded for testing. The learner database and production Neon were not modified. The build used `VERCEL=1` solely to invoke the existing no-migration/no-seed guard, with the local test connection configured; this was a local compilation, not a deployment.

## Verification

| Check | Result |
| --- | --- |
| Lint | Passed |
| TypeScript | Passed |
| Unit/integration | **189/189, 18 files, 68.68 s** |
| Production compilation | Passed; build confirmed no migration/seed |
| Final browser checks | **11/11 final cases passed**: 10 in the compiled-build run, plus the corrected legacy review rerun (12.7 s) |

Regression coverage includes all four issues, malformed numeric API requests, ownership/idempotency, duplicate responses, exact resume, save interruption/retry, independent/mixed/assisted/unsure profiles, immutable reports/snapshots, older engines, role separation and learning progress. Browser rendering fixtures contain public projections only; separate real API journeys use synthetic isolated sessions. Chromium-based installed Microsoft Edge is used because the Playwright browser download is absent.

Initial setup failures were resolved: local PostgreSQL was stopped, then the test schema needed existing migrations/seed. A Prisma Windows DLL lock required stopping the owned development server before building. Two browser fixtures were corrected: decimal-format rejection explicitly selects a two-decimal item, and the legacy review server uses its six-area default while draft journeys request `?preview=starter-v3`. These are setup/harness issues, not concealed app failures.

The last combined browser run passed 10 cases and failed one obsolete flat-text assertion in legacy review (5.5 min). That assertion now separately verifies the option label and preformatted output. Its complete desktop/mobile journey passed on rerun (1/1, 12.7 s); no application code changed after the successful build. Both exhaustive option sweeps passed on that final compiled source: desktop 2.0 min; mobile 2.5 min. Inline numeric tests passed at both widths, including retained drafts and zero answer calls for invalid formatting.

The first handoff restored **localhost:3002** against the main `.env` connection (`skillsetu_local`). Its page returned HTTP 200, but that was not enough: the subsequent start-button report exposed missing diagnostic tables in that database. That runtime choice was corrected as described below. No migration, seed or learner submission was made against `skillsetu_local` during the repair. The separately tested local build ID is `AMiprOc3I0bmVbpPh4vLl`; remote production parity was not inspected.

### Start-button runtime correction

The actual prior diagnostic store is the existing local **`skillsetu_audit`** database configured in ignored `.env.audit`. It has the diagnostic tables and saved attempts. The server now uses this connection again, retaining those records; neither database was reset or migrated.

Start the local diagnostic with **`npm run dev:diagnostic`**. This reads `.env.audit`, refuses remote/hosted database targets, enables the existing local eight-area gate and checks for session/run/response tables before launching Next on port 3002. It never migrates, seeds or resets data. Plain `npm run dev` still uses the main project's `.env`; it is not the command for this separately configured diagnostic store.

Verified the actual `http://localhost:3002/diagnostic-v2` start button with a synthetic isolated browser identity: opens the first question, survives refresh/resume, preserves six-area compatibility and works at mobile width. Browser regression: **1/1 passed (5.7 s)**. New startup configuration regressions: **5/5 passed**. Full follow-up unit/integration suite: **194/194 across 19 files, 61.62 s**; types and lint pass. [First-question mobile screenshot](screenshots/start-flow-mobile.png). This follow-up changes local startup tooling only, not assessment UI, answer keys or grading.

## Screenshots inspected

Fixtures deliberately exercise all items instead of the adaptive stopping policy; their artificial progress counts are not product-policy changes.

- [Q10-style choices, desktop](screenshots/presentation-SS-PY-0297-1440.png)
- [Q10-style choices, mobile](screenshots/presentation-SS-PY-0297-390.png)
- [Saved versus correct whitespace, mobile review](screenshots/review-whitespace-390.png)
- [Inline integer error, mobile](screenshots/numeric-inline-0-390.png)
- [Inline float error, desktop](screenshots/numeric-inline-1-1440.png)
- [Q6-style multiline output](screenshots/presentation-SS-PY-0250-1440.png)
- [Binary-search transfer lesson](screenshots/binary-search-repair.png)
- [Real synthetic legacy review, mobile](screenshots/legacy-review-mobile.png)

Automated API sessions cover actual stopping/scoring/history. Screenshot inspection confirmed the marked choices, preserved newlines, readable mobile error and unchanged legacy review structure. No PDF was produced or changed in this repair task.

## Test locally

Run `npm run dev:diagnostic`, then open `http://localhost:3002/diagnostic-v2?preview=starter-v3` with a synthetic identity. No correctness feedback should appear until completion. Inspect marked whitespace and multiline outputs in final review. An integer `6.0` or a two-decimal answer `4.7` should show an inline format error without increasing progress.

Binary-search lesson: `/diagnostic-v2/learn?skill=starter-dsa&subskill=Algorithmic%20complexity`.

Browser command: run Playwright for `diagnostic-presentation.spec.ts`, `diagnostic-starter.spec.ts`, `diagnostic-hybrid-vnext.spec.ts`, `diagnostic-direct-transition.spec.ts`, `diagnostic-review.spec.ts`. Set `E2E_BASE_URL` to the isolated server and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium executable. Keep the default draft flag false when running legacy review; explicit draft routes still work. Never use a learner or production database for these suites.

## Remaining limits

Educator approval and pilot validation remain pending. Other starter lessons remain introductory; this task adds a precise binary-search repair, not a complete 360-subskill curriculum. Mobile testing uses viewport emulation; no physical-device, full screen-reader or measured load testing. No production/commit deployment parity claim. Remote publication/PR and deployment remain outside this local verification step.

Specific content follow-up: independently review the existing normalization distractor hypothesis (“Assumes lower does not remove whitespace”) under a new candidate item version. `lower` itself does preserve whitespace; `strip` removes it in these questions. The presentation repair intentionally leaves historical labels and grades intact. This is recorded in `docs/PENDING_QUESTIONS.md` rather than silently altering immutable source metadata.
