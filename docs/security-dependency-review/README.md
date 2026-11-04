# Local dependency security review — 3 November 2026

## Snapshot and scope

Reference: `staymotivated24rr-bot/skillsetu_v2` commit `c3c409fb0a819cbda6c89b68d0e13333badc0733`.
Local starting commit: `7c91a18c4bb9d46d0561f90f1dd9624ca0fc7050`.
The commits have identical tracked trees (`bb72c195169eadccdb16a5fadd5e8d8db90013bd`); the working tree was clean.
Work stays on local branch `codex/security-dependency-patches`. No push, PR, deployment, database reset, learner-history change, bank change, migration edit or credential edit.

Read AGENTS.md, manifests/lockfile, Prisma schema, Vitest/Playwright configurations, Review CI, the build database guard and bundled Next.js 16 upgrade guide before verification.

## Reproduction and changes

GitHub run [41505398153](https://github.com/staymotivated24rr-bot/skillsetu_v2/actions/runs/41505398153) was confirmed to reference the supplied commit. Build, migrations, seed, types and lint succeeded; audit failed and unit/browser steps were skipped.

The exact CI command, `npm audit --omit=dev --omit=optional --audit-level=high`, reproduced one critical and one high affected package (four advisories). The lockfile, rather than the manually newer preinstalled local runtime, determined CI's vulnerable versions.

| Package | Reference lock | Patched exact manifest/lock | Reason |
| --- | --- | --- | --- |
| next | 16.3.8 | 16.4.1 | Smallest patched Next 16 release for all three reported advisories |
| zod | 4.6.5 | 4.6.6 | Smallest patched Zod 4 release |
| eslint-config-next | 16.3.8 | 16.4.1 | Match framework tooling |

The corresponding `@next/env`, SWC platform packages and ESLint plugin move from 16.3.8 to 16.4.1. No unrelated package version changed. React/React DOM remain locked at 19.3.0; Prisma remains 6.19.0. Sharp remains 0.35.5. Exact pins make the chosen security floor explicit.

Before installation the local node_modules had Next 16.4.3/Zod 4.6.7 despite the older lockfile. The selected versions are upgrades relative to the reference/clean CI snapshot; their lower numbers relative to that unmanaged local install are intentional minimal-patch selection.

Primary advisory evidence:

- [Next image optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw): Next 16.0.0–16.4.0 affected, 16.4.1 patched; sharp 0.35.5 required.
- [Next Server Actions denial of service](https://github.com/advisories/GHSA-p3m5-59mp-jv5r): Next 16.0.0–16.4.0 affected, 16.4.1 patched.
- [Next use-cache typed arrays](https://github.com/advisories/GHSA-673q-mjm6-r5xr): Next 16.0.0–16.4.0 affected, 16.4.1 patched.
- [Zod resource exhaustion](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): versions below 4.6.6 affected.

## Isolation and commands

Created a new disposable PostgreSQL 18.4 cluster under the ignored `.env.local-runtime/security-postgres-20261103`, bound only to 127.0.0.1:15433. Its new `skillsetu_security_test` database contains only seeded fictional data and synthetic test learners. Existing databases, `.env`, `.env.audit` and `.env.test` were not modified. The temporary cluster uses local trust authentication and is stopped after verification.

All test processes explicitly set both `DATABASE_URL` and `TEST_DATABASE_URL` to `postgresql://postgres@127.0.0.1:15433/skillsetu_security_test?schema=public`, overriding the ignored files. Only the checked-in migrations/seed were applied to this new database. No reset or drop command was used.

Commands:

```text
npm install --save-exact --ignore-scripts next@16.4.1 zod@4.6.6
npm install --save-dev --save-exact --ignore-scripts eslint-config-next@16.4.1
npm ci --ignore-scripts --prefix .env.local-runtime/security-clean-install
npm audit --omit=dev --omit=optional --audit-level=high
npm audit --omit=dev --audit-level=high
npm audit --json
node node_modules/prisma/build/index.js generate
node node_modules/prisma/build/index.js migrate deploy
node --import tsx prisma/seed.ts
npm run typecheck
npm run lint
npm test
npm run build
```

The clean install uses copied manifests in an ignored temporary directory, preserving the working install and local PostgreSQL binaries. Its lockfile is byte-equivalent in content to the patched project lockfile. All lifecycle scripts are disabled for installation; Prisma generation and pinned browser-runtime preparation run explicitly. Build uses the existing `VERCEL=1` guard solely to prevent migration/seed side effects. The build logs confirm no database writes during build. This is a local production compilation, not a Vercel deployment.

QA servers use ports 3004 (normal v2 with explicit draft preview), 3005 (legacy Python), and 3006 (eight-competency local default). All use the isolated database. Chromium journeys use the installed Microsoft Edge executable. No learner Python is executed in Node or shell; existing browser sandbox remains authoritative.

## Results

| Check | Result |
| --- | --- |
| Original CI audit reproduced | FAIL as expected: 1 critical + 1 high affected package |
| Patched exact CI audit | PASS: 0 vulnerabilities, exit 0 |
| Production audit including optional dependencies | FAIL: 4 high affected packages, exit 1 |
| Full audit including development dependencies | FAIL: 25 affected packages — 2 critical, 6 high, 17 moderate |
| Clean lockfile install | PASS: 474 packages installed; no lifecycle scripts |
| Typecheck | PASS |
| Lint | PASS |
| Unit/integration | PASS: 194 tests in 19 files, 66.85 seconds |
| Production build | PASS: Next.js 16.4.1, build ID `dy0iqZhOMbZ1qJ_9j58Wy` |
| Core browser regressions | PASS: 24/24, 7.8 minutes |
| Legacy Python browser regressions | PASS: 2/2, 5.4 minutes |
| Eight-competency/Studio browser regressions | PASS: 6/6, 40.5 seconds |
| Final typecheck and whitespace check | PASS |

All 32 browser cases passed without retry or skip. Core run: `diagnostic-v2`, `diagnostic-review`, `diagnostic-starter`, `diagnostic-hybrid-vnext`, `diagnostic-direct-transition`, `diagnostic-presentation`, `diagnostic-studio`, `journey`, `developer-tracks`, `authentic-security`, and `sandbox` specs. Legacy run: `authentic-python` and `mobile-authentic`. Studio run: `studio-interface`, `workspace-python-v2`, and `diagnostic-eight-default`.

Coverage includes all 864 MCQ choices at both 1440px and 390px, inline numeric validation, immediate transitions and network retry, scoring/individual answer review, autosave/resume, assistance/uncertainty, old report compatibility, cross-session/origin validation, oversized/forged payloads, all three roles, practice/reassessment separation, keyboard/mobile/reduced-motion layouts, and the opaque browser Python sandbox's execution/timeout/recovery and file/network isolation.

Inspected fresh mobile workspace/lesson and desktop question screenshots. Rendered and inspected every page of the generated Java (6-page), Studio (6-page) and legacy Python (9-page) A4 reports; no visible clipping or layout regression. Data Analyst's end-to-end report also passed its browser/PDF assertions. The PDF skill was used only for read-only QA inspection. QA captures/PDFs remain ignored under `test-results` and `.env.local-runtime`, not copied into source.

All temporary QA servers and the new test PostgreSQL instance were stopped after verification. The existing application databases were not used by tests. Next's build-generated `next-env.d.ts` path changes were restored to their original content so the final code diff contains no generated-file churn.

Other browser files (exhaustive coding/key execution and REA/motion/manipulation-specific authoring audits) were not rerun; no bank, sandbox, animation or authored interaction source was changed. No Firefox, WebKit, real mobile device or remote Linux CI run was performed. These are unverified scopes, not passing tests.

Audit JSON is captured in `audit-before.json`, `audit-after.json`, `audit-optional.json`, and `audit-full.json`. Counts are affected dependency packages, not unique CVEs/advisories; inherited effects can count a root and its vulnerable transitives separately.

## Remaining vulnerabilities and limits

The CI exclusion filter passes; the complete dependency graph is **not vulnerability-free**.

- With optional packages included, `@prisma/client`'s optional Prisma peer retains `prisma` → `@prisma/config` → `deepmerge-ts` and `effect`. npm reports four high affected packages. Root advisories are [recursive merge stack exhaustion](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) and [Effect RPC context contamination](https://github.com/advisories/GHSA-38f7-945m-qr2g). Prisma CLI is a dev dependency but also a peer-optional path, so these cannot be described as absent from every production installation. npm proposes Prisma 7.10.1; Prisma 6.19 is deliberately preserved. A tested follow-up is needed for those dependencies or deployment packaging.
- Full audit additionally flags development tooling: Vitest/tinypool critical findings, Vite high findings, Vitest mocker moderate findings, and minimatch plus the ESLint/TypeScript-ESLint dependency chain. See the full JSON for exact advisory ranges and paths. npm proposes major tooling upgrades or inappropriate old ESLint versions; no forced fix, blanket override, or unrelated major upgrade was applied. Development/test services must not be treated as secure exposed application servers.
- Windows Node 24.22.2/npm 11.19.1 verification does not replace a fresh Linux CI run. npm warns that the existing ESLint 9.39.5 is unsupported. No remote run was triggered, and nothing was published.
- This review repairs the four reported advisories and checks behavior; it is not a penetration test, complete accessibility/device certification, or load/capacity claim.
