# Verification — 31 October 2026

All data operations used the persisted disposable loopback `skillsetu_audit` database. No production connection was used. Authored banks, source JSON, the prior hybrid implementation and Prisma files have no diff.

| Check | Result |
| --- | --- |
| Full unit/integration suite | **178/178**, 17 files, **61.98 s** |
| New engine/profile unit cases | 17 passed within the full suite |
| New engine persistence/history integration cases | 3 passed within the full suite |
| Repository lint | Passed |
| TypeScript | Passed |
| Production build | Passed; migration/seed explicitly skipped |
| New eight-area Chromium/Edge journeys | **4/4**, **28.2 s**, final build |
| Legacy Chromium/Edge journeys | **12/12**, **1.7 min** |
| Whitespace check | Passed |
| Screenshots | Desktop and mobile visually inspected; unsure has neutral styling |

There are **16 distinct relevant browser journeys**. The new four were repeated after a final neutral-unsure CSS correction and report-copy clarification; the legacy twelve passed before that presentation-only change. Legacy result labels and styles were unchanged. The earlier four-journey run passed in 28.3 seconds as well. No unresolved test failure remains in these executed checks.

The new profile tests cover beginner, intermediate, advanced, strong-fundamentals/weak-DSA, copying-related errors, unsure and assisted runs. They verify every initial competency task is intermediate, the first 24 cover three distinct families per area, no repeat IDs/families, deterministic replay/seed variation, independent streaks, qualified fallback difficulty, contradiction evidence, missing metadata, exhaustion, post-24 probes and a 26-question recovery case.

Integration tests verify stored engine versions/run-ID seeds, refresh/resume, ownership, concurrent duplicate submission, response timestamps/rationale, a v4.0 attempt completing under its original selector, immutable sealed reports, new-version startup and a 30-unsure run with no false gaps or invented misconceptions. Existing numeric contracts remain covered, including signs/zeros, exact decimal precision, format errors and unchanged response counts on rejected input.

Browser coverage includes all 24 real UI submissions directly reaching the next task/report, an unsure first UI response and 30-response final report with a mid-run refresh, private in-progress projections, numeric retry/resume, 30 separate unsure review entries, final correct answers, mobile layout/focus/reduced motion, original code-block palettes, saved legacy attempts, offline retry, origin/ownership/stale request guards and historical report bookmarks.

Commands:

```powershell
node --env-file=.env.audit node_modules/vitest/vitest.mjs run
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit
node --import tsx scripts/audit-hybrid-v41.ts
```

With the new local default on port 3002:

```powershell
$env:DIAGNOSTIC_STARTER_V3_DEFAULT='true'
$env:E2E_BASE_URL='http://127.0.0.1:3002'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
node --env-file=.env.audit node_modules/@playwright/test/cli.js test e2e/diagnostic-hybrid-vnext.spec.ts e2e/diagnostic-direct-transition.spec.ts e2e/diagnostic-eight-default.spec.ts e2e/diagnostic-starter.spec.ts
```

The legacy twelve used a separate temporary server on port 3003 with local draft preview permitted and `DIAGNOSTIC_STARTER_V3_DEFAULT=false`:

```powershell
$env:E2E_BASE_URL='http://127.0.0.1:3003'
node --env-file=.env.audit node_modules/@playwright/test/cli.js test e2e/diagnostic-v2.spec.ts e2e/diagnostic-blocks.spec.ts e2e/diagnostic-motion.spec.ts e2e/diagnostic-studio.spec.ts e2e/diagnostic-review.spec.ts e2e/diagnostic-audit.spec.ts
```

The temporary legacy server was stopped after verification; the eight-area local app remains on port 3002. Earlier 303 stdout/three exception key verifications belong to the unchanged imported-bank validation and were not repeated here. No native Python execution, learner-code execution in Node/shell, new runtime dependency, migration or seed occurred during production builds. Existing checked-in migrations and idempotent setup were exercised only by the integration suite on disposable data.

Not performed: independent educator signoff, learner pilot, psychometric calibration, full assistive-technology/cross-engine certification, load test or production parity inspection. These remain release gates; heuristic simulation is not evidence of hiring readiness.
