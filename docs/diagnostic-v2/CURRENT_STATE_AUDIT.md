# Current-state audit — 27 October 2026

Inspected checkout `6393d08fcfb2616b11e7df9f4ae4d14a6f6a1f52`, README, AGENTS, existing docs, every source/API family, Prisma schema/migrations, tests, CI and deployment/build configuration. Historical verification statements in STATUS/README are historical, not this run's evidence. See TEST_RESULTS for executed checks.

## Actual application

- Next.js App Router 16, React 19, TypeScript, Prisma 6.19 and PostgreSQL. Package-lock currently installs Next 16.3.8. Preserve inherited proxy/CA and Node 24 runtime.
- `src/components/skillsetu.tsx` orchestrates the existing SPA. `src/lib/service.ts` owns student lifecycle, immutable submissions, legacy scoring/path/reports, lesson practice and sample cohorts. `engine.ts` implements mapped weighted scoring and prerequisite planning.
- `role-catalog.ts` registers Data Analyst, Python Developer and Java Developer. 51 existing skill/lesson nodes; Java stays registered. AI Engineer is future work.
- `authentic/python-banks.ts`, `grading.ts`, `service.ts` provide five versioned 68-task Python forms, authentic repair modules, content digests, bank snapshots and evidence. Feedback changes constraints but does not select a new task sequence. This is the gap addressed here.
- Existing `TaskResponse` supports decisions, deterministic explanation rubrics, ordering and browser code editing. The new controls use bounded code fragments and trace answers, so the existing arbitrary-code worker is not required by the pilot.
- API inventory: `/api/demo` multiplexes onboarding/role selection, assessment/lesson/repair submission, review and sample cohort reads; `/api/python-sandbox` serves a fixed worker host; `/api/health` checks database readiness. New `/api/diagnostic-v2` is separately gated.

## Storage and preservation

User → AssessmentAttempt → legacy AssessmentAnswer/SkillScore/ReadinessReport/LearningPath; immutable AssessmentBank → TaskEvidence; LessonProgress/PracticeAnswer and RepairRun/RepairAnswer remain independent of assessed proficiency. Role/SkillNode requirements and prerequisites drive existing reports. Cohorts and employer requirements are explicitly fictional fixtures.

Three pre-existing PostgreSQL migrations remain byte-for-byte intact. This change adds DiagnosticSession/Run/Response and a session-owner foreign key in two additive migrations. No table reset, legacy bank edit, role replacement, legacy attempt conversion or production deployment occurs. New attempts store their complete bank, digest, engine version, selection reasons and final report. Existing AssessmentBank serves as the immutable content registry. New run tables intentionally do not impersonate legacy baseline completion.

## Reuse and technical debt

Reuse Next/PostgreSQL, Prisma transactions/row locks, existing error type, dark tokens, Python skill IDs and authored module introductions. Isolate the UI rather than complicate the legacy simulation controller. A browser pilot session is distinct from the legacy demo session; completing it does not unlock legacy practice automatically.

The legacy demo cookie contains an unsigned user UUID. UUID entropy is not account authentication; anyone possessing an ID can impersonate that demo. The legacy API does ownership checks relative to that cookie, but has no verified identity, revocation model, tenant authorization or public abuse controls. Keep it a demo.

Client-reported Python outputs can be forged even though evaluation expectations are server-owned. Legacy code credit must not become certified evidence. Keyword-based explanation grading can reward word matching and reject valid paraphrases. Existing UI is large and bank payloads are broad; deeper component separation and bounded projections would reduce maintenance cost. Build locally migrates/seeds when DATABASE_URL exists; hosted VERCEL builds skip writes. Run trusted additive migration separately before release.

## Verified baseline

Initial typecheck and lint passed. Initial tests: 65 passed, 5 skipped, one suite failed during setup; build failed because restored node_modules lacked pinned Pyodide assets. `npm ci --ignore-scripts` with a writable `/tmp` npm cache restored the lockfile dependencies. All 70 pre-existing unit/integration tests then passed against local `skillsetu_test`. No prior browser-pass claims were reused. New test counts and production browser results are in TEST_RESULTS.
