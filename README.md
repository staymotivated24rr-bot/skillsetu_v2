# SkillSetu

A locally runnable job-readiness prototype for engineering students with Data Analyst, Python Developer, and Java Developer tracks. Choose a role and work through three original workplace simulations, discover specific skill gaps, complete focused lessons, and verify progress using three different cases. Scores come from submitted answers, including when performance declines.

## Run locally

**If you are using this repository in a Codex cloud workspace:** a `localhost` link in your own browser points to your computer, not to the cloud workspace. To run on your computer, download/extract the source project there first, then follow the instructions below. A server running in the cloud needs a supported forwarded preview or a separate deployment to be reachable from your browser.

For an easier launch after installing Node.js 24, double-click `start-skillsetu.cmd` on Windows. On macOS/Linux open a terminal in the extracted project and run `bash start-skillsetu.sh`. These scripts install dependencies on first use, initialize/seed the database and start the app. Keep the terminal window open while using SkillSetu.

Use **Node.js 24** (or Node 22.13+) and npm. SkillSetu now uses PostgreSQL for durable persistence. For the hosted demo, Neon provides the database; local development can point to the same Neon project or another PostgreSQL database.

From the repository directory:

```sh
npm ci --ignore-scripts
cp .env.example .env
npm run setup
npm run dev
```

Open **http://localhost:3000**. On Windows PowerShell use `Copy-Item .env.example .env` instead of `cp`. `npm run setup` explicitly generates the Prisma client, applies migrations and seeds content; install scripts are unnecessary.

For a production build:

```sh
npm run build
npm start
```

If a port is occupied: `npm run dev -- --port 3001` or `npm start -- --port 3001`.

Set `DATABASE_URL` to a PostgreSQL connection string before running setup. Never commit `.env` or a real database password.

`npm run setup` generates the Prisma client, applies checked-in PostgreSQL migrations, and idempotently seeds the three SkillSetu tracks and fictional cohorts.

## Deploy on Vercel with Neon

SkillSetu uses PostgreSQL in hosted environments. The recommended deployment is Vercel + Neon.

1. Create a Neon PostgreSQL project and database.
2. Copy its pooled PostgreSQL connection string.
3. Add it to Vercel as the secret environment variable `DATABASE_URL` for Production (and Preview if desired).
4. From a trusted environment using the same `DATABASE_URL`, run:

```sh
npm ci
npm run setup
```

5. Redeploy Vercel.
6. Open `/api/health`. A healthy hosted deployment returns HTTP 200 with `"database": "hosted-postgresql"`.

The application deliberately returns HTTP 503 on Vercel when `DATABASE_URL` is missing or is not a PostgreSQL URL, rather than pretending student progress is durable.

## Demonstrate the product

1. Select **Find my skill gaps**. Enter a nickname and select **Enter student demo**. Choose Data Analyst, Python Developer, or Java Developer before entering. Use the Target role selector later to switch tracks; each keeps its own baseline, progress, and reports.
2. Select **Begin workplace diagnostic**. Take three stakeholder cases for your selected role. Data Analyst investigates revenue, experiments, and support; Python Developer repairs orders, supplier API integration, and dispatch scripts; Java Developer repairs order services, collection logic, and backend separation.
3. In each case, ask a clarification question, interpret the case file, choose analytical actions, and prepare a stakeholder brief. **Send response** saves the action and reveals the stakeholder reply. Continue through 24 actions and select **Submit assessment**. You can refresh or return later without losing submitted answers.
4. Review the skill map, evidence counts, strongest signals, and prerequisite-aware gap priorities. **Show action feedback** explains each decision after completion.
5. Open **Learning plan**. Start a gap-repair module. Choose **Interactive** for problems first or **Structured** for explanations first. Both use the same objectives, worked examples and checks.
6. Answer four practice items; try hints and retries. Mastery requires at least three correct first responses including the final application. Opening a lesson earns no mastery. A weaker run is recorded honestly; **New practice run** permits another verification after study.
7. Select **Verify in a fresh case** or **Start reassessment**. New role-specific cases cover subscription/notification/warehouse analysis; Python log import, reservations, and customer automation; or Java payments, inventory, and customer services. Submit 24 new actions.
8. Inspect **Before → after** and remaining gaps. Practice does not automatically increase the assessment score. A reassessment can improve, stay flat, or decline.
9. Open **Readiness report**. See baseline/current scores, skill evidence, changes, completed learning modules, next actions and the fictional employer-style requirement match. **Print report** supports browser printing or Save as PDF.
10. Open **Placement dashboard** and choose a **Cohort role** to view its separate fictional 30-student cohort, 26 diagnostics, common gaps, initial/current averages, learning completion and students meeting every individual role target. This is labelled sample data and does not change when you use the student demo.

For a short demonstration, start a diagnostic and show the first stakeholder exchange, then use the full automated browser test to exercise all steps. There is no hidden button that fabricates student answers or improvement.

## What exists

| Track            | Skills / lessons | Diagnostic cases                                        | Different reassessment cases                                   |
| ---------------- | ---------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| Data Analyst     | 16               | Revenue, checkout experiment, support queue             | Renewals, notifications, warehouse                             |
| Python Developer | 17               | Order processor, supplier API, dispatch refactor        | Log importer, inventory reservation API, customer import       |
| Java Developer   | 18               | Order service, dispatch collections, backend controller | Payment retries, inventory reconciliation, customer API/import |

- Every role has three diagnostic cases and three alternate cases, each with eight mapped actions: 24 decisions per assessment, 144 actions across the product.
- 51 original lessons and 204 practice checks support both learning modes, hints, feedback, retries, and persisted mastery.
- Shared scoring, prerequisite-aware gap plans, before/after comparison, printable reports, and fictional employer profiles use the selected role’s evidence.
- Role switching saves independent progress, including unfinished assessments. There is no automatic proficiency credit between tracks. A stale tab cannot submit another role’s assessment or practice.
- Three separate fictional 30-student cohorts, with 26 diagnosed students each, demonstrate role-specific gaps, changes and learning completion.
- Data Analyst skill/content IDs, authored banks, scoring engine, and existing student records are preserved. Migration defaults existing learners to Data Analyst without resetting history.
- Durable PostgreSQL/Neon persistence, validated demo sessions, server-owned grading, deployment guards, response headers and accessible navigation.

## Architecture

Next.js App Router, React, TypeScript, Prisma 6 with PostgreSQL/Neon, Zod, Lucide icons, Vitest, and Playwright. Original deterministic local content implements a provider interface, with a fallback wrapper for future optional providers. There is no active AI integration or “AI-powered” claim.

Prisma generates the PostgreSQL client during build. Checked-in Prisma migrations are applied with `prisma migrate deploy`; add a new migration for future schema changes and do not edit migrations after they have been applied to a persistent database.

The role catalog in `src/lib/role-catalog.ts` drives shared screens. `src/lib/tracks/` holds developer content and registers all three tracks. Assessment grading remains on the server; text/code excerpts are interpreted through structured choices, not executed. The tracks cover junior language/backend foundations without Django/FastAPI/Spring prerequisites.

See [architecture and scoring details](docs/ARCHITECTURE.md), [decisions](docs/DECISIONS.md), [approved specification](docs/PRODUCT_SPEC.md), [milestones](docs/EXECUTION_PLAN.md), [current status](docs/STATUS.md), and [pending questions](docs/PENDING_QUESTIONS.md).

## Checks

Run setup before checks on a fresh checkout:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Database integration tests migrate and seed the PostgreSQL database selected by `TEST_DATABASE_URL`. Configure a separate test database; they never reset the application database. Unit/integration coverage includes mapping/content coverage, weighted proficiency, completeness/duplicate guards, role/employer targets, prerequisite ordering/cycles, readiness and before/after, persisted progress/mastery/retries, session ownership, stakeholder replies, hidden keys, stored paths/reports, reassessment declines, and the fictional cohort.

Install a browser once if Playwright does not have one:

```sh
npx playwright install chromium
npm run test:e2e
```

Or use an existing Chromium executable, for example on Linux:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

The browser suite exercises the entire student flow for all three roles, role switching/resume and independent cohort selection, both lesson modes, hints, mastery, positive and negative reassessment, report printing/PDF, the fictional cohort, a 390px mobile view, keyboard selection, refresh/resume, and invalid/cross-session/cross-origin API requests. Test learners are added to the local demo database; no existing learner is deleted. Reports/screenshots are in ignored `test-results/` and the browser test report is in `playwright-report/`.

To check the production server rather than development:

```sh
npm run build
E2E_SERVER_COMMAND='npm run start' npm run test:e2e
```

To use a different port, set `E2E_BASE_URL=http://127.0.0.1:3004` and `E2E_SERVER_COMMAND='npm run start -- --port 3004'`. Stop any existing server on port 3000 first if you want to ensure this command starts the production build. On Windows set these environment variables using PowerShell syntax.

## Prototype limitations

- Legacy Data Analyst/Java banks have limited mapped actions; Python v2 provides four or more opportunities per skill. Indicators remain coarse; the assessment is not scientifically validated and does not guarantee employability, interviews or placement.
- Data Analyst/Java structured choices assess recognition and decisions. Python v2 also executes small functions client-side and grades explanations/ordered verification. These tasks do not prove production coding ability. No live SQL server, unrestricted stakeholder conversation, avatar or voice.
- Legacy roles reuse an alternate reassessment bank. Python v2 cycles three reassessment banks; repeated practice still reuses fixed module items, so familiarity can affect scores. Future trials should add larger item banks, alternate forms, content versioning and independent evaluation.
- Legacy lessons remain short demo content with four practice items. Python v2 has six-stage repair modules; neither is a complete professional curriculum.
- Cookie demo access is not production authentication. The placement dashboard is public fictional data; no real college authorization, multi-tenancy, billing, recruiter marketplace or external hiring integration is implemented.
- A single Next.js/PostgreSQL monolith and serialized content payloads suit the current prototype. Real deployments need identity/access control, content integrity, privacy/consent/retention decisions and operational hardening.
- Cohort metrics are explicitly fabricated fixtures to demonstrate the dashboard. Student results are computed from submitted assessment evidence; browser code transcripts remain forgeable prototype evidence.

No unresolved founder decision currently blocks this MVP.

## Smallest next validation

Pilot a chosen role with 20–30 engineering students: collect feedback on whether the applied tasks reveal credible gaps, let students repair identified gaps, then reassess. Record baseline/current skill evidence, completion and time spent. Ask one placement officer and one role-appropriate employer reviewer to critique the tasks and rubrics. Include independently scored fresh tasks to distinguish skill transfer from familiarity with multiple-choice items. Treat findings as early validation, not proven placement outcomes.

## Authentic Python preparation (v2)

Python Developer now uses authored decision, code edit, bug fix, short-answer, ordered-step and transfer tasks. Two baseline variants and three reassessment variants each provide 68 opportunities across four work contexts. Plan roughly 90–120 minutes; submitted responses and local coding drafts resume after refresh. Data Analyst/Java content and all legacy history remain intact.

Python runs in a lazy browser worker using pinned, self-hosted Pyodide. Setup/build prepares the runtime assets automatically. `Run Python` evaluates actual outputs; syntax/runtime failures and a five-second execution timeout permit retry. No learner code runs on the application server. Expected-output keys and solutions are excluded from public APIs, but browser evidence can be inspected or forged: this is a preparation prototype, not high-stakes anti-cheating certification.

Each skill displays weighted assessed credit, target, latest-bank opportunities, cumulative diverse evidence, transfer and a descriptive evidence-strength label. Practice mastery adds no readiness points. Reassessment can improve, stay flat or decline; the report explains actual skill changes and permits selecting historical reports. Python repair modules add guided/independent/harder/workplace/verification/transfer tasks and a prerequisite-aware seven-day suggested plan. Short-answer grading uses deterministic concept rubrics, not AI.

The application uses a dark-first semantic design system; reports print using a light paper layout. All cohorts stay clearly fictional. Mobile code tasks show larger-screen guidance and keep drafts; no task is silently skipped.

### Isolated tests

Create a separate PostgreSQL test database, copy `.env.test.example` to `.env.test`, and configure `TEST_DATABASE_URL` there. Tests no longer inherit the application's `DATABASE_URL`. CI configures both databases explicitly for its disposable PostgreSQL service.

```sh
npm run setup
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
E2E_BASE_URL=http://127.0.0.1:3004 E2E_SERVER_COMMAND='npm run start -- --port 3004' npm run test:e2e
```

For cloud development, source `/workspace/skillsetu-runtime/env.sh` and restore PostgreSQL with `/workspace/skillsetu-runtime/start-postgres.sh`. Socket/network commands need executor network access enabled. Use `localhost` for development browser checks and a fresh port for production tests.

See `docs/AUTHENTIC_READINESS_SPEC.md`, `docs/DECISIONS.md` and `docs/ARCHITECTURE.md` for versioning, migration safety, rubric/security limitations and shared versus Python-only content. The first two production migrations and all legacy banks remain unchanged. New banks are immutable: changing content requires a new bank ID/content version. No database reset or automatic merge is needed.

## Adaptive Python diagnostic pilot

A separate, default-off pilot is available at `/diagnostic-v2` when the server runs with `DIAGNOSTIC_V2_ENABLED=true`. It selects questions adaptively across six Python competencies, persists answers/drafts and hint use, and creates an evidence-based report with existing learning-module introductions. It uses its own browser session and does not replace the current three-role journey or its historical records. The 18–30 responses are product defaults, not validated proficiency thresholds; code completion checks bounded fragments rather than executing learner code.

Run the normal local setup first and use a separate PostgreSQL test database. Keep the flag off on public deployments until account authentication, distributed abuse controls and content-validation gates are complete. Design, limitations, REA investigation and executed verification results are under [docs/diagnostic-v2](docs/diagnostic-v2/PRODUCT_REQUIREMENTS.md).
