# Verification evidence — 2026-10-02

## Actual checks

- `npm test`: **18 passed** (12 pure/content/provider tests and 6 persisted service integration tests). Test database is isolated from application data.
- `npm run typecheck`: **passed**.
- `npm run lint`: **passed**, no warnings/errors.
- `npm run build`: **passed**, Next.js production output includes static homepage and dynamic Node API.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium E2E_SERVER_COMMAND='npm run start' npm run test:e2e`: **3 passed** against a production server.
- Browser suite uses actual submitted choices to produce both a 0→100 increase and a subsequent 100→0 decline, never adjusting scores directly.
- Desktop landing/report/cohort screenshots and a 390px mobile simulation screenshot inspected. Mobile landing and simulation have no horizontal overflow. Radio selection works by keyboard. A mid-case refresh resumes the next unanswered action.
- Printable report exported as an A4 PDF. Chrome print media hides navigation and controls; output inspected for readability.

The automated learner's extreme scores are deliberate test inputs, not a claim of learning efficacy. The sample report is evidence of the reporting flow, not a real student's result.

## Clean setup

Copied only source/configuration to `/tmp/skillsetu-clean`, excluding node_modules, build outputs, database, .env, test output and Git internals. Installed with `npm ci --ignore-scripts --offline --cache /tmp/skillsetu-npm-cache` (cached packages; no Prisma binaries or external APIs). Copied `.env.example` to `.env`.

- First `npm run setup`: generated engine-free Prisma client, applied initial SQL migration, seeded all content/cohort — **passed**.
- Second `npm run setup`: detected existing migration, preserved compatible schema and idempotently updated seeds — **passed**.
- Production build from that fresh directory — **passed**.
- Started production server on port 3001; fresh-browser smoke verified entry, seeded first case, persisted action, refresh/resume, 30-member cohort and no browser page errors — **passed**.
- Temporary clean-check server stopped after verification.

## Repaired failures

- Shell/package-manager network access had to be explicitly enabled using the configured proxy; installation then passed.
- Native Prisma download host was unavailable. Replaced unused native bootstrap with bundled WASM generation and the engine-free driver; fresh installation confirms it works.
- Legitimate browser submissions were initially rejected by an internal URL origin check. Origin is now compared with the incoming Host; unrelated origins remain rejected.
- Returned answers lacked an explicit order, allowing the wrong stakeholder follow-up after changing cases. Relation ordering is now scenario/action order; regression assertion added.
- A browser regression check used a same-document hash navigation after directly completing an assessment through the API; reloading now verifies the freshly persisted result rather than stale client state.

No unresolved implementation failure remains. Known prototype limits are documented in README and ARCHITECTURE; real identity/college access, open-ended coding/communication, larger item banks and validated educational outcomes remain future work.
