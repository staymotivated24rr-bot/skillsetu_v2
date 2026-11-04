# Executed verification — 27 October 2026

Environment: Node 24.19.0, locked Next 16.3.8/React 19, Prisma 6.19, local PostgreSQL 17.11, system Chromium through Playwright. GitHub CI configuration targets PostgreSQL 16; remote CI results are separate from these local results. App database `skillsetu` and integration database `skillsetu_test` are separate, both local loopback. No production database or deployment used.

## Baseline and environment repairs

- Initial typecheck/ESLint passed.
- Initial unit/integration run: 65 tests passed, 5 skipped after setup failed in one suite. Initial build failed copying absent `node_modules/pyodide/pyodide.js`.
- Restored dependencies using `npm_config_cache=/tmp/skillsetu-npm npm ci --ignore-scripts`; the default restored npm cache location was not writable/available. No lockfile/dependency changes.
- All 70 pre-existing unit/integration tests then passed (8 files).
- Early dev browser checks on 127.0.0.1 encountered Next dev resource origin blocking; use localhost in dev. Testing also identified and fixed the new API comparing Origin to Next's internal bind URL rather than public Host.
- An intermediate browser run passed desktop completion, mobile gap completion and API security, then exposed an ambiguous test locator matching both the application error and Next's route-announcer alert. Scoped the test locator to main; no product workaround.
- The first production regression attempt encountered missing original role/employer seed records in local app storage (500/missing FK); interrupted the run, ran the existing idempotent local seed, and reran from the production build. Existing learners were preserved. This was a local setup failure, not a hidden passing result.

## Final local checks

| Check | Executed result |
| --- | --- |
| `npm run typecheck` | Passed, no errors |
| `npm run lint` | Passed, no errors/warnings |
| `npm test` with local `TEST_DATABASE_URL` | 90 passed, 10 files; none skipped |
| `npm run build` | Passed; pilot page/API/module routes generated as dynamic |
| Flag-off production page/API/module requests | All returned 404 |
| `git diff --check` | Passed |
| Original banks/tracks/role catalog/first three migrations diff | No changes |
| Built client-chunk scan for private new-bank identifiers/misconception tags | No matches; supplements projection tests, not a complete information-flow proof |
| Full production Chromium suite | 14 passed / 1 test synchronization failure in 8.9 minutes; all 10 existing regression journeys passed |
| Final production diagnostic rerun after test-only synchronization fix | All 5 new journeys passed in 17.9 seconds; all 15 distinct browser cases now verified |

## New automated coverage

16 engine tests: version fingerprint, authored-bank validation and prerequisite cycles, reusable eight-competency role with 24/30/36 bounds, original content/difficulty/type coverage, correct/incorrect divergence, harder/easier selection, prerequisite probes, one-answer uncertainty, four full response patterns, 120 deterministic varied trajectories, no repeats, coverage/length bounds, learning order and honest report counts, server grading/modality/input validation, hidden keys and invalid histories.

4 PostgreSQL service tests: opaque/expired token rejection, concurrent starts, ownership of reads/answers/hints/drafts, draft/hint persistence, concurrent exact retries, changed answer rejection, stale draft rejection, report sealing and final-answer replay, explicit restart/history preservation, legacy record preservation, immutable registry publication, no incidental DB response columns in public report, snapshot digest recovery errors.

5 new Playwright journeys (all passed in the final targeted run): desktop full strong diagnostic and learning links; mobile saved draft/hint/reload/offline retry; mobile incorrect divergent path and gap report; API foreign-session/origin/forged-score/size/replay attacks; keyboard ordering/focus/boundary controls/reduced motion. The full production run verified all 10 existing journeys, including all 130 coding contracts. The new mobile restart test initially read the API before restart finished (expected 0 responses, read the prior 18); its screenshot already showed the new task correctly. Added a wait for the new Submit control, then reran all five new journeys successfully against the same production build. No product change or second full 130-contract rerun was needed.

## Full-story boundary evidence

Browser entry submits to `/api/diagnostic-v2`; the API authenticates an opaque cookie and validates Origin/body; the service uses PostgreSQL transactions to store evidence and select the next item; GET returns the owned current projection; final evidence generates a stored report and existing module links. Unit/service results above verify the data boundary; production browser results verify user interaction and rendered response. A standalone production screenshot capture reported zero page errors and no 390px horizontal overflow. Original desktop/mobile introduction screenshots were visually inspected at `/workspace/artifacts/diagnostic-v2/desktop-intro.png` and `mobile-intro.png`; desktop task/report and mobile task/order/report captures were also copied there and visually inspected. Raw command logs are retained alongside these artifacts.

## Limits

No load/concurrency capacity benchmark, real student/practitioner validation, calibrated difficulty, formal psychometric study, full accessibility audit/screen-reader session, Firefox/WebKit run, real mobile-device test, external production authentication, remote evaluator or live hosting verification. The 120 selector simulations are correctness tests, not load benchmarks. REA setup/runtime was not executed. No test result implies production release readiness.
