# Interactive Learning Studio — local demonstration

Implemented 3 November 2026 on `codex/interactive-learning-studio`, using the approved architecture plan. This extends the existing application; it does not replace the student journey or diagnostic.

## Open and restart

Route: **http://127.0.0.1:3007/diagnostic-v2/learn/studio**

Startup: `npm run dev:studio`. The ignored `.env.studio` points only to the newly created `skillsetu_studio_dev` database on 127.0.0.1:15434. The helper refuses hosted/nonlocal connections and a database name without `_studio_dev`, checks the new storage, and does not migrate or seed on startup. PostgreSQL must be running. No real credentials were copied or edited. The existing application/diagnostic stores are not used.

The separate `skillsetu_studio_test` database on that new disposable cluster is used exclusively for tests. Test processes explicitly set both DATABASE_URL and TEST_DATABASE_URL; they do not rely on the older ignored `.env.test`. All six checked-in migrations and fictional seed data were applied only to these two new stores. Existing databases were not migrated, seeded, reset or queried for learner data.

## One lesson, eight reusable step types

Lesson `studio-positive-batch`, content version `1.0.0-draft.1`, schema version 1, evaluator `studio-contracts-1`: **Trace a safe batch total**.

| Stable step ID | Type | Demonstration |
| --- | --- | --- |
| batch-concept | explanation | Input → keep positives → total concept cards |
| batch-predict | prediction | Predict integer output of a bounded loop |
| batch-reason | reasoning | Distinguish zero from None |
| batch-numeric | numeric | Float formatting with exactly two decimal places |
| batch-block | blocks | Choose the positive-value condition in a code blank |
| batch-order | ordering | Order initialization, iteration, accumulation and return |
| batch-trace | trace | Persist total/count after each of three inputs |
| batch-execute | execution | Edit and run the helper through the existing browser sandbox |

The versioned contract includes lesson/step IDs, objectives, prerequisite IDs, instructional text, visual metadata, constrained response metadata, private authored keys, hints, explanatory correct/incorrect feedback, and accessibility labels/descriptions. Public projections explicitly allowlist instructional fields and controls. Unanswered data contains no key, expected execution outputs, correct index or private feedback rules. Examples are teaching material, not independent assessment.

Next/Previous and unlocked-step navigation work with saved server state. Progress counts completed learning checks. Incorrect responses retain authored feedback and permit a new explicit attempt; format errors do not create an attempt. Completion requires a successful check/acknowledgement for all eight steps, while preserving earlier misses. New practice runs create new rows; they do not overwrite the completed run. The UI deliberately calls this **guided practice completion**, never assessed proficiency or independent mastery.

## Reuse and boundaries

- Reuses `TaskResponse` and its opaque iframe/Web Worker/Pyodide implementation, `CodeBlockComposer`, `DiagnosticOption` whitespace/accessibility presentation, shared Learning Studio tokens, original Orbit companion and learning service conventions.
- `TaskResponse` gains an optional draft callback. `CodeBlockComposer` accepts a smaller question projection and optional learning instruction. Their defaults preserve existing diagnostic/legacy behavior.
- Uses the existing `py-fundamentals` prerequisite and private `gradeTask`/numeric evaluators. Python is never executed in Node, a shell, or the application server.
- Follows Learning/RepairLearning's first-attempt, retry, concept, feedback and completion conventions. Those components remain unchanged because they depend on legacy DemoState, baseline authorization and readiness. No synthetic legacy attempt or fake score is created to render this lesson.
- Does not change diagnostic engine/service, authored banks, historical grading, sandbox document, or legacy learning service source.
- Does not yet connect all diagnostic findings to complete courses. The 120-family crosswalk and broader lesson authoring remain later work; only this demonstration is registered.

## Persistence and session identity

The additive migration `202611030001_learning_studio` creates the six planned learning tables: LearningModuleVersion, DiagnosticLearningPlan, DiagnosticLearningTarget, DiagnosticLearningRun, DiagnosticLearningSubmission and DiagnosticLearningEvent. It adds back-relations on DiagnosticSession/DiagnosticRun without changing existing columns or records. A SQL partial unique index enforces one first submission per run/step; preserve this checked-in index when maintaining Prisma 6 migrations.

For this standalone demo, the plan explicitly has `kind=demonstration`, `sourceRunId=null`, and `coverage=demonstration-only`. This is the small phase-2 specialization of the approved model: it allows practice without fabricating a completed diagnostic. No report-to-skill conversion or reassessment routing is implemented here. Future report-derived plans must verify owned completed source runs; the current API cannot accept a client source-run or owner ID.

Authorization resolves only the existing `skillsetu-diagnostic` opaque cookie and its expiring server session. The `skillsetu-demo` UUID cookie is never accepted as a fallback, set, transferred or cleared by this feature. A new diagnostic session action explicitly deletes only that cookie; saved records remain stored. Matching names/browser tabs do not connect identities.

Module versions store immutable content JSON/digests and evaluator versions. Plans store immutable recommendation JSON/digests. Per-run state pins a completion-policy version. Owned row locks serialize events, draft revisions, visits, hints, evaluations and submissions. Exact request-ID/hash retries are idempotent; changed reuse is rejected. Explicit learning retries append submissions. Optimistic draft revision checks reject stale writes. Hints/evaluations are persisted as events; all post-concept checks are conservatively treated as guided/assisted, without mastery credit. Writes never touch SkillScore, AssessmentAttempt, legacy lesson/repair progress, DiagnosticRun or DiagnosticResponse.

Browser transcripts are inspectable and forgeable. Server-owned comparison against private cases is not proof that submitted code ran honestly. This remains low-stakes preparation, not certification.

## Verification results

Node 24.22.2, Prisma 6.19, Next.js 16.4.1; installed Microsoft Edge used as Chromium. Final compiled build ID: `7FP29NAeD3HQEAcFITbyW`.

| Check | Result |
| --- | --- |
| Prisma schema validation | Passed |
| New additive migration | Applied successfully to the two new local stores only |
| Lint | Passed |
| TypeScript | Passed |
| Full unit/integration | **209/209, 21 files, 77.92 seconds** |
| New lesson unit tests | 13 passed: eight contracts, private projection, numeric formats, invalid controls/transcripts, local-only gate |
| New persistence integration tests | 2 passed: identity separation, ownership/order, stale drafts, concurrent/idempotent submissions, first attempts, all modalities, sealed report preservation and additive restart |
| Final new browser suite | **3/3, 41.6 seconds**: complete desktop/mobile journeys plus API security |
| Existing browser regressions | **15/15, 2.3 minutes**: diagnostic transitions/uncertainty, old six-area compatibility, all-role flows, Studio layouts, ownership and sandbox isolation |
| Existing full Python/repair/mobile journey | **2/2, 4.6 minutes** |
| Total distinct browser cases | **20 passed**; overlapping reruns are not counted again |
| Production build | Passed; existing VERCEL guard confirmed no migration/seed during build |
| Exact production audit filter | `npm audit --omit=dev --omit=optional --audit-level=high`: 0 vulnerabilities |
| Visual QA | Inspected final desktop blocks, mobile tracing and completion screenshots; inspected all pages of new regression-generated Python 9-page and Data Analyst 5-page A4 reports |

The final new browser suite passed after the local contrast and session-recovery changes. The 17 existing browser cases ran on the preceding build; later changes are scoped to the new route/service/styles/helper, with shared controls unchanged. The final full unit suite and build include those changes. No private data was used. Integration fixtures that supply expected execution transcripts are explicitly synthetic and never execute their code strings; browser journeys actually execute Python in the sandbox.

Browser checks include server draft restoration for output/state/code, Previous/Next, an incorrect first answer followed by retry, hints, inline numeric format validation, keyboard code-block selection, all eight types, real Pyodide evaluation, no horizontal overflow at 1440/390px, coexistence with an unrelated demo identity, and a committed response whose transport result is deliberately lost and safely retried once. API checks reject foreign sessions, forged correctness fields, oversized bodies, unauthenticated starts and cross-origin writes.

Resolved verification issues: an initial unit assertion confused the public step-kind value `explanation` with a private property; browser interception was synchronized and alert selectors scoped to main to exclude Next's route announcer. Screenshot inspection caught inherited pale text on the new cream cards; local overrides and a color regression assertion corrected it. These initial failures are not counted as passes.

## Files and extension points

- `src/lib/learning-studio/types.ts`: public contracts/view DTOs.
- `content.ts`: one private lesson and allowlisted projection; add reviewed versions here, never modify a registered version.
- `evaluation.ts`: bounded strict payloads and type-specific server evaluation.
- `service.ts`: session-owned immutable publication, progress, revisions, events and attempts.
- `src/app/api/diagnostic-v2/learning/route.ts`: strict JSON/origin/host/size guards and diagnostic identity.
- `src/app/diagnostic-v2/learn/studio/page.tsx`, `src/components/interactive-lesson-studio*`: feature-gated reusable runner and local styling.
- `prisma/schema.prisma`, new migration: additive persistence.
- `tests/learning-studio*`, `e2e/learning-studio.spec.ts`: regression coverage.
- `scripts/dev-learning-studio.mjs`, `dev:studio` script and disabled example flag: safe local entry.

## Remaining limits and rollback

Development-only flag `LEARNING_STUDIO_ENABLED` requires a loopback database and absence of VERCEL; hosted access fails closed. Educator review is pending for the demonstration; no approved content/assessment bank was changed. Completion is practice attainment, not a new mastery algorithm. There is no verified account recovery, full course catalog, automatic crosswalk, distributed rate limiting or measured capacity. Multi-device identity is not provided. Firefox/WebKit, physical devices and full screen-reader certification were not tested. See the preceding security review for optional Prisma/development-tool dependency findings; the filtered audit does not certify the entire dependency graph.

Disable the feature or stop its local server to roll back. Retain the new tables, snapshots and learning records; do not drop/reset anything or rewrite old migrations. Existing application stores need no changes for this local demo. No GitHub push, PR, production migration, merge or deployment occurred.

## Screenshots

- [Code-block step, desktop](screenshots/learning-studio-blocks-1440.png)
- [Variable-state tracing, mobile](screenshots/learning-studio-trace-390.png)
- [Completed guided execution, desktop](screenshots/learning-studio-complete-1440.png)
