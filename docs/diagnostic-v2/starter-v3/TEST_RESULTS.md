# Local verification — 31 October 2026

Final source: branch `codex/python-bank-360-staging`; private bank `python-starter-v3-360-draft-2`; engine `hybrid-4.0.0-draft.1`. All database tests used the existing disposable `skillsetu_audit` database on loopback port 15432. Production was not accessed.

| Check | Result |
| --- | --- |
| Full Vitest unit/integration suite | **157/157**, 15 files, 55.61 s |
| ESLint repository check | Passed |
| TypeScript `tsc --noEmit` | Passed |
| Production build | Passed; VERCEL=1 skipped migrations and seed |
| Relevant diagnostic Chromium/Edge suite | **15/15**, 3.0 min |
| Additional screenshot labeling rerun | **1/1**, 7.6 s; same product build |
| Authored Python stdout keys | **303/303**, pinned Pyodide 0.29.3 in opaque-origin browser workers |
| Authored exception keys | **3/3**: expected ValueError, ZeroDivisionError and IndexError |
| Revised environment/glob candidate behavior | Passed boundary vectors: absent/empty/exact/wrong keys; CSV files versus named directories, other suffixes and nested paths |
| Standalone local source importer | Passed; DRAFT, 360 items, learner eligibility false; repeat-import equality covered by integration test |
| Aggregate-only local pilot exporter | Passed; ignored output; synthetic data explicitly labeled |
| Feature off check after testing | Regular page **200**, health **200**, draft page **404**, draft start **404** |
| Historical banks / migrations diff | No changes to legacy, reviewed or block banks; no Prisma changes |
| Diff whitespace check | Passed |

Browser command:

```powershell
$env:E2E_BASE_URL='http://127.0.0.1:3002'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
node --env-file=.env.audit node_modules/@playwright/test/cli.js test e2e/diagnostic-starter.spec.ts e2e/diagnostic-starter-keys.spec.ts e2e/diagnostic-review.spec.ts e2e/diagnostic-v2.spec.ts e2e/diagnostic-audit.spec.ts e2e/diagnostic-blocks.spec.ts e2e/diagnostic-motion.spec.ts e2e/diagnostic-studio.spec.ts
```

Coverage includes every original block palette, all submitted/review answer formats, keyboard/touch controls, 320–1440 px layouts, focus/reduced motion, save/resume, offline retry, ownership/origin attacks, stale/forged/oversized requests, repeated identical submission, final-only correctness, all-eight-area completion and existing lesson links. New service coverage verifies format errors do not mutate the run or response count, normal/draft lookup separation, source import idempotency and immutable completed reports.

The key audit adds standard-library modules **only inside a test-supplied sandbox document for trusted authored snippets**. Production sandbox code, CSP, network restrictions and learner execution limits are unchanged. No authored or learner Python executes in Node, Vercel or the shell. Native CPython 3.11/Windows output parity was not separately certified; the retained source says Python 3.11+ and the measured verification runtime is the pinned browser runtime.

Earlier checks caught an unavailable local DB service, a Windows Prisma DLL lock from concurrent test/build processes, and a six-versus-6 label regression in an existing UI test. Restarting the existing local DB, sequencing Prisma builds after tests, and restoring legacy wording resolved these. The final full browser suite passed; the initial 13/14 browser result is not counted as a clean run.

Screenshots were visually inspected after animations were disabled for capture: `previews/mcq-desktop.png`, `previews/numeric-mobile.png`, `previews/report-desktop.png`, `previews/report-mobile.png`. The displayed 24/24 score is a synthetic all-correct QA attempt, not a learner result or validation claim.

Not performed: independent educator signoff, real-student pilot, statistical calibration, load/capacity tests, complete assistive-technology audit, Firefox/WebKit certification, all unrelated application browser suites, or production deployment/commit parity inspection. The draft stays disabled by default. See README.md for reproduction, rollback and release gates.
