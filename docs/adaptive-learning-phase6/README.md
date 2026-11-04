# Personalized learning and revision — Phase 6

Implemented locally on `codex/adaptive-learning-revision`, 3 November 2026. This is a **separate deterministic learning selector**. Diagnostic selection, classification, scoring, bank content and historical reports are unchanged.

## Open the feature

Local entry: **http://127.0.0.1:3007/diagnostic-v2**. Complete or reopen an owned report and find **Your next concept and revision** below its existing learning pathway.

- Live guidance: `/diagnostic-v2/learn/revision?source=<owned-completed-run-id>`.
- Saved decision: the same route with `&decision=<owned-decision-id>`.
- The original `?run=<diagnostic-run-id>` report bookmark remains valid and unchanged.

Use the original V2 browser session. The existing isolated local preview uses `skillsetu_studio_dev` on loopback port 15434; records from other application stores have not been copied into it. The legacy demo cookie is never linked or treated as equivalent identity.

## Implemented integration and persistence

`src/lib/learning-studio/selector.ts` implements policy **`learning-revision-1-draft.1`**, using:

1. Completed, owned diagnostic report findings and their distinction between likely gaps, uncertain evidence and preliminary strengths.
2. The pinned diagnostic competency prerequisites, existing Python topic/skill prerequisites, and the explicit Phase 4 mapping (`diagnostic-learning-1-draft.1`). No substring matching or unrelated lesson substitution.
3. Persisted V2 lesson/module versions, completed steps, first/retry submission flags and results, hint events, run ordinals and submission timestamps.
4. First-ever exposure to a checkpoint within the exact lesson version, distinct authored final forms, and time since meaningful submitted evidence.

The existing learning service prepares key-free evidence and invokes the pure selector. It validates session expiry, source ownership/completion, Python role, bank/plan/module digests and existing version gates. Session/run locks serialize the evidence read with existing starts and submissions. There is no new database, model, migration or competing service layer.

`GET /api/diagnostic-v2/learning?recommendation=<source-run-id>` derives current guidance without writing records. Add `&decision=<id>` to read an immutable saved decision. `POST` to the same existing endpoint with `{"action":"learning-select","sourceRunId":"..."}` saves a snapshot. The client cannot supply scores, timestamps, difficulty, mastery or evidence overrides; strict transport and schema checks remain in force.

Saved decisions reuse `DiagnosticLearningPlan` with `kind=adaptive-learning`, the owned source relation, report digest and recommendation snapshot/digest. The selector version plus a SHA-256 fingerprint of the bank/report, exact persisted practice evidence, calendar day and output supplies the existing source/mapping uniqueness key. Repeated/concurrent saves of identical evidence return the same row. New evidence or a new scheduling day can produce a new immutable decision. Old decision bookmarks retain their original reasoning, counts and due status; they are not silently recomputed.

No assessment record, proficiency score, prior recommendation, lesson run, submission or earlier mastery receipt is rewritten. The selector consumes practice evidence; completion of a lesson never increases diagnostic proficiency. Only the validated V2 session's learning records are used. Legacy demo learning/repair history remains separate until a future explicitly approved secure linking design exists.

## Outputs

Each decision includes a recommended concept/subskill; a reason and reason code; prerequisite context; diagnostic evidence category; suggested learning difficulty and explanation; review status/date; practice-mastery status and counts; fresh-form availability; a safe existing learning/review link; and source learning-run IDs.

Difficulty is **advisory instructional intent**: 1 = scaffolded foundation, 2 = applied contrast, 3 = transfer/stretch. This feature does not alter authored lesson questions or generate a harder challenge on demand. Current available final forms belong to the existing applied lesson; a requested stretch level may require future reviewed content. Availability and partial coverage are disclosed separately.

An `unsupported` practice status means no full interactive evidence contract is mapped to that exact subskill; it is not a negative statement about the learner. A `version-mismatch` preserves older learning without crediting it toward another version. Existing guided-overview links remain available when a full lesson is absent.

## Deterministic policies

### Prerequisites and uncertainty

Findings are considered in the report's learning order, with overdue review and likely gaps prioritized. A matched lesson with demonstrated practice and no review due is deferred so other concepts can be considered. Before recommending a goal, the selector walks its unmet prerequisite chain. Preliminary diagnostic strength can support prerequisite readiness, but it is not converted into lesson mastery. A partial lesson never clears an entire broad skill prerequisite. Missing/uncertain prerequisite evidence is described as uncertainty, not demonstrated weakness. Cycles, missing graph prerequisites and cross-role inference fail closed.

### Practice evidence and easy-item farming

Only the explicitly versioned variables/reference lesson currently has a full selector evidence contract:

- Five checkpoint IDs are matched by exact version. First-ever unaided checkpoint matches/misses and assisted first attempts remain separate across all owned runs.
- Later matches to the same checkpoint are counted as repetitions, with the easy rebinding checkpoint identified separately. They supply **zero new independent credit**. Repeated easy matches prompt an applied contrast rather than manufacturing mastery.
- Guided completion, XP, views, drafts and hint counts never establish mastery.
- Each of the three authored final forms can provide one first, unaided outcome. Assisted finals are excluded and reported separately. Recycled forms after run three supply no fresh independent evidence.
- Preliminary **lesson-only** practice mastery requires either four of five first-ever unaided checkpoint matches plus a successful fresh unaided final, or two distinct fresh unaided final successes after learning. A mixed history remains inconsistent until two consecutive fresh final outcomes resolve it. Earlier misses are retained in the explanation.
- This is a new conservative selector policy. It does not rewrite or replace Phase 3 lesson mastery receipts, whose original policy remains pinned to historical runs.

The selector prefers resuming an owned active run before starting another. A completed/exposed run opens the existing lesson; use its **New practice run** action for the next available final form. Only three forms exist. Exhaustion is explicit: review remains available, but further independent verification needs newly authored content. Neither an inactive or partially started fourth run nor a new report resets exposure.

### Review scheduling

Dates use **Asia/Kolkata calendar days**, matching the current learner timezone. Defaults are intentionally simple and versioned:

- Guided/developing evidence: one day.
- Inconsistent independent evidence: two days.
- Demonstrated practice: seven, fourteen or thirty days after one, two or three distinct successful fresh finals.

The anchor is the latest meaningful first-exposure unaided checkpoint/final outcome, falling back to the first submitted guided evidence when none exists. Merely visiting, asking more hints, retrying old questions or farming easy matches does not postpone an overdue review. Last submitted practice time is still reported separately. These intervals are instructional defaults, not a calibrated forgetting curve or psychometric model.

## Six synthetic learner simulations

Complete deterministic outputs and explanations are in **`SIMULATIONS.json`**. No diagnostic questions, learner answers or private keys are included. Simulations use synthetic report/evidence fixtures at a fixed clock, not real learners or clinical/psychometric validation.

| Profile | Recommended concept | Difficulty | Practice status | Review | Evidence explanation |
| --- | --- | --- | --- | --- | --- |
| Complete beginner | Values & control flow | 1 | unsupported | not started | Uncertain foundation prerequisite before collections; overview only for this particular subskill |
| Strong learner | Values & control flow | 3 | unsupported | not started | Prior aliasing lesson practice is established; another concept needs an independent transfer task, which is not falsely claimed as authored full content |
| Struggling learner | Collections & mutation | 1 | developing | due | Zero first unaided checkpoint matches and a fresh final miss call for scaffolding |
| Inconsistent learner | Collections & mutation | 2 | inconsistent | verification needed | Two first unaided checkpoint matches, three misses and a missed final need contrasting independent evidence |
| Repeated hints | Collections & mutation | 1 | guided | due | Five hint uses, assisted first checkpoints and an assisted final provide no unaided mastery credit |
| Returning after inactivity | Collections & mutation | 3 | demonstrated | due | Earlier lesson-only independent evidence remains preserved; its seven-day review date has passed |

## Verification and historical safety

New automated suites:

- `tests/learning-selector.test.ts`: six profiles, determinism, input immutability, prerequisite-first behavior, no broad credit from partial mastery, easy farming/recycled forms, independent recovery, content-version separation, malformed evidence, cycle/cross-role rejection and timezone review boundaries.
- `tests/learning-selector-service.test.ts`: persisted hint/step evidence, concurrent idempotent saves, changed-evidence snapshots, immutable archived decisions, ownership/expiry, unchanged source report/view and no proficiency writes.
- `e2e/learning-revision.spec.ts`: real synthetic eight-area diagnostic → live recommendation → save → practice/hints → refreshed/new decision → old bookmark/refresh → report; foreign access and forged difficulty rejected; 1440/390/320px and no visible JavaScript errors or horizontal overflow.

All tests use the existing isolated `skillsetu_visualizations_test` database on 127.0.0.1:15434, with explicit matching DATABASE_URL and TEST_DATABASE_URL. No production/shared database, real credentials, reset, new migration, push, PR, merge or deployment is involved. The previous isolated cluster was already available; a redundant startup attempt could not open its held log, and successful database tests confirmed the existing server remained usable. No PID/log/data files were removed.

The initial prerequisite test expected a particular explanation path after adding already-mastered lesson history. The selector correctly chose the unresolved foundation directly; the assertion was corrected to verify the actual invariant (partial lesson mastery does not clear it), rather than force an arbitrary rationale. Final results, build and source hashes are recorded in `VERIFICATION.json`.

The build retains the existing generated Prisma client, with build-time database writes disabled by the established guard. Schema and applied migrations are unchanged. The existing Windows native-client DLL locking limitation is documented in earlier phase reports; no regeneration is required by this phase.

| Final verification | Result |
| --- | --- |
| Unit/integration | PASS: 233/233, 28 files, 91.46 seconds |
| Combined Chromium regressions | PASS: 32/32, 3.6 minutes, no skips |
| New revision journeys | Included: 1440px, 390px, 320px; saved decisions, hint adaptation, ownership, refresh and historical report equality |
| ESLint / TypeScript | PASS after final UI changes |
| Guarded production compilation | PASS; build `-yzvcUTfBTgftQJtBut_B` |
| Protected source preservation | 39 assessment, sandbox, schema/migration and lesson-contract files unchanged by hash |
| Visual review | Desktop/mobile recommendation panels and five-page existing A4 report inspected |

Relevant existing browser journeys include the six/eight-area diagnostic, immediate question transitions, prior reports, report-to-learning links, both lesson runners, four visualization types, Pyodide timeout/cancellation/network restrictions, all-role workspace/learning flows and mobile layouts. This is the relevant regression subset, not a claim that every repository E2E file, physical device, screen reader or load scenario was tested.

## Limits and rollout

Content coverage is still limited to the one complete variables/reference lesson and existing guided overviews. Suggested difficulty is not a claim that every level has an available new task. More independent forms and full subskill lessons require versioned content and educator review. Simulation results show deterministic policy behavior, not calibrated effectiveness. Review intervals and mastery thresholds need pilot data before stronger claims.

Manual assistive-technology/physical-device checks and measured load remain future validation. Source version changes must bump the selector/crosswalk contract as appropriate; saved decisions remain immutable. Runtime flags remain local-only. Existing optional/development dependency audit concerns are unchanged and documented separately. The original diagnostic adaptive engine is untouched.
