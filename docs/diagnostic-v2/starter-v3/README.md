# 360-item Python diagnostic: local draft integration

Local UI follow-up: the eight-area diagnostic can now be the normal `/diagnostic-v2` development landing page by additionally setting `DIAGNOSTIC_STARTER_V3_DEFAULT=true` in the startup shell. This still requires the existing local-only draft gate; `.env.example` and hosted defaults remain off. Use `?preview=legacy` to explicitly inspect the older six-area entry. Saved attempts always display their own snapshot's competencies, not the selected new-run definition. See `../eight-area-default/README.md` for the latest local runtime state; earlier off-state provenance is a historical verification record.

The supplied `C:/Users/raksh/Downloads/skillsetu_v3 (1).zip` was located and extracted to ignored `.env.local-runtime/starter-kit-v3`. Its integration prompt, audit, distractor guide, numeric README and TypeScript validator were read. JSON is the import source; XLSX/CSV remain original reviewer/export artifacts.

## Compatibility and boundaries

- `/diagnostic-v2` retains the current design, six-area bank, code-block tasks, practice and saved history by default.
- The eight-area bank is a separate **unapproved local preview**, `python-starter-v3-360-draft-2`, content version `4.0.0-draft.2`, engine `hybrid-4.0.0-draft.1`.
- All 360 original source IDs and metadata are retained in private `src/lib/diagnostic/starter-v3/source.json`. No bank JSON, keys, output references, option hypotheses or solutions enter active question projections. Completed owned reviews retain the founder-authorized correct-answer display.
- Five engineering clarifications are separate candidate revisions in `clarifications.ts`: graph connectivity (0222), explicit measurement tolerances (0305), exact environment-key presence including empty values (0343), CSV file/type filtering (0344), and shell syntax versus executable argument semantics (0346). The original source is unchanged. All five still require independent approval.
- Earlier local draft-1 snapshots are retained and readable only with the draft gate enabled. New attempts use draft-2. Neither draft enters the default six-area run lookup.
- Existing `AssessmentBank`, `DiagnosticRun` and `DiagnosticResponse` tables suffice. **No schema migration, destructive operation, or historical regrade.** Each run seals its own bank JSON/digest, item versions, selected payload, private selection rationale and response timestamp. Final report JSON is read-only.
- The idempotent importer stores one immutable source-and-adapter snapshot transactionally. Identity is bank version + item ID; original item version and all source review fields are preserved. Content mismatches fail rather than overwrite.

## Selection and reporting

The separate eight-area policy is **minimum 24 / target 24 / maximum 30 / coverage 3**. Eight × three observations cannot fit an 18-question minimum. The existing six-area 18/24/30 policy is unchanged.

Coverage is balanced by current counts. Start at intermediate; hold difficulty until two consistent independent observations in that area, then adjust one level. Assisted results cannot raise difficulty or establish proficiency. Never reuse a family within a run. Prior-informed mode supplies disclosed routing only; independent runs receive no prior credit.

After mandatory coverage, investigate unresolved evidence using fresh families, difficulty proximity, subskill variety and matching option-hypothesis follow-ups. Stop at 24 only when repeated independent observations are consistent across all areas; otherwise extend up to 30. Exhaustion stops with uncertainty, never invented proficiency.

Wrong MCQ selections create **hypotheses**, not established misconceptions. Repetition requires at least two independent families; unsure and assistance create none. Even repeated labels remain preliminary. Sparse or conflicting observations remain insufficient evidence. New reports include independent counts, task variety, specific uncertainty, prerequisite context, named subskills, next steps and eight original short practice starters. These starters do not constitute complete lessons for every one of the bank's subskills.

`SELECTION_TRACES.json` logs synthetic independent profiles, item/version/family, competency, difficulty, type, submitted answer, rationale and stop reason: strong 24, struggling 24, mixed 30. These fixtures are not psychometric validation.

## Answer contracts

- 216 MCQs: four A–D options, exactly one keyed choice, no duplicate/empty option strings. Supplied alternatives are drafts, not automatically certified plausible.
- 135 integer inputs: visible Integer instruction, no decimal point.
- Nine float inputs: visible precision, exactly 1–4 decimal places, text control preserving trailing zeros.
- Numeric options retained privately for source compatibility, never rendered.
- Server-side decimal-string comparison, signs/leading zeros normalized; no floating-point equality, arbitrary evaluation or rounding.
- Format errors return 422, retain the active question/draft and **do not write a response, score or misconception**. Explicit unsure records a separate answer route.
- Per-question save feedback stays neutral. Correctness, explanations, selected answers and correct solutions appear only in the completed owned report.

## Local commands

Public/default flag state: **OFF** in `.env.example`; local preview additionally requires an explicitly enabled flag, `DIAGNOSTIC_DRAFT_ENV=local`, a loopback database and absence of `VERCEL`. Do not point test or import commands at production.

With the existing disposable audit PostgreSQL server running on 127.0.0.1:15432:

```powershell
# Only this shell opts into local draft testing. No .env files need changing.
$env:DIAGNOSTIC_STARTER_V3_PREVIEW='true'
$env:DIAGNOSTIC_DRAFT_ENV='local'
node --env-file=.env.audit --import tsx scripts/import-starter-v3.ts
node --env-file=.env.audit node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3002
```

Open `http://localhost:3002/diagnostic-v2?preview=starter-v3` in an isolated browser profile. New preview sessions are separate from the default bank even within one cookie session. Refresh, resume, try a malformed numeric value, use unsure, complete the report and inspect each answer. Bookmark the preview report with its `run` and `preview` query parameters.

Stop any existing verified server on that port before starting another. A build is required after code changes. On Windows, stop Next and let database tests finish before Prisma generation to avoid DLL locking. Build without database writes:

```powershell
$env:VERCEL='1'
node --env-file=.env.audit 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run build
# Use a fresh shell for local preview: VERCEL must be absent.
```

Tests and reproducible content audit:

```powershell
node --env-file=.env.audit node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node --import tsx scripts/audit-starter-v3.ts
$env:E2E_BASE_URL='http://127.0.0.1:3002'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
node --env-file=.env.audit node_modules/@playwright/test/cli.js test e2e/diagnostic-starter.spec.ts e2e/diagnostic-starter-keys.spec.ts
```

Rollback: stop the preview server; remove the temporary shell variables or set the preview flag false; start the ordinary local app. Preserve all imported banks and draft attempts. No deletion or reverse migration is necessary. This does not modify production or enable public access.

## Content review and remaining release gates

`QUALITY_REVIEW.json` records status for every source question; **zero items have independent expert approval**. Engineering consistency checks do not substitute for reviewing all 216 MCQ distractors and 144 numeric tasks. Short boolean/exception items can have weak discrimination despite a technically correct key. Numeric formats, difficulty, family independence and misconception mappings require pilot review.

The supplied-source environment and glob ambiguities were checked against official [os.getenv documentation](https://docs.python.org/3/library/os.html#os.getenv) and [Path.glob documentation](https://docs.python.org/3/library/pathlib.html#pathlib.Path.glob). The candidate revisions tighten the contracts; they are not instructor signoff. [Logger.exception documentation](https://docs.python.org/3/library/logging.html#logging.Logger.exception) supports traceback recording, not a guarantee that exception messages contain no secrets. Review 0220/0221 graph assumptions, 0284 exact True identity, 0301 integer-domain metamorphic equality and 0355 logging context carefully.

Before learner release: independent Python/educator review, versioned fixes for any remaining ambiguity, approval manifest, low-stakes learner pilot with ambiguity feedback, accessibility review and measured rollout. No readiness percentage or hiring claim is produced.

## Pilot and load plan

`scripts/pilot-starter-v3.ts` exports only local aggregates to ignored `.env.local-runtime/starter-v3-pilot.json`: per-item/version independent option frequencies, unsure/assistance, proportion correct and descriptive item/rest-score correlations (suppressed below 30 observations). Adaptive sampling biases correlations; synthetic QA is not learner calibration. Collect human ambiguity feedback separately in the educator review process before approval. Pause items with defensible alternatives, unused distractors or unexplained group differences; revise under new content versions.

Use a disposable staging database for measured concurrency steps of 1, 5, 20 and 50 concurrent sessions. Measure p50/p95 request latency, errors, connection-pool pressure, duplicate write behavior and resume under interrupted connections. Set budgets before testing; stop when exceeded. No load capacity was measured or claimed in this task.

Production deployment/commit parity has not been inspected. All behavior and screenshots here concern the local build; no attribution to the live deployment. No push, merge or deployment is authorized.
