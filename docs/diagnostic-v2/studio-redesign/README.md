# Learning Studio redesign — 30 October 2026

The previous diagnostic used a long charcoal column with a repeated mascot callout above the code. This pass replaces that layout with an editorial dark-blue shell, a warm assessment canvas, separate reading/exploration and answering panels, a numbered journey rail, compact mobile map, tactile choices and buttons, and consistent report surfaces. Original Orbit animation remains in the introduction, side rail and feedback. All motion respects reduced-motion preferences.

Reference study used the actually installed REA 6.8.0 CLI and its isolated Node 24.22.1 runtime, through the same entry point as scripts/rea-local.ps1. No MCP connection is claimed. REA launched fresh Edge sessions against the public [Brilliant](https://brilliant.org/), [Duolingo](https://www.duolingo.com/) and [Alux](https://www.alux.com/) homepages. Alux was first captured with its consent overlay, then captured after choosing Reject All. No login or private lesson access was used.

Observed design principles and their application:

| Reference | Observed on the captured public page | Original SkillSetu application |
| --- | --- | --- |
| Brilliant | Quiet cream background, strong editorial heading, focused visual exercise and clear green action | Warm focused task canvas, typographic hierarchy, clear reading area |
| Duolingo | Playful illustration, large rounded controls, dimensional button edges, uncluttered next step | Original Orbit, tactile answer choices, single submission action and saved-feedback reactions |
| Alux | Dark navy composition, blue accents, generous editorial spacing and separated content columns | Persistent dark studio shell, blue workspace markers and distinct journey/scenario/answer regions |

These are design interpretations, not copied layouts or assets. No brand logos, character artwork, question content, private source code or website imagery was added to the product. The supplied screenshot is the before-state feedback; the broader learning/diagnostic behavior remains SkillSetu's.

REA performed seven captures (four reference captures, three local captures) and one local before/after comparison. REA_EVIDENCE.json retains IDs, provider information, completeness and hashes. Reference raw evidence remains in ignored .env.local-runtime/design-study to avoid bundling third-party page assets. Local evidence and comparison records are retained in evidence/. The comparison reports changed; it does not measure design quality, learning efficacy, animation timing or accessibility compliance. Still images were inspected, while Playwright verified actual moving transforms and reduced motion separately.

Validation on the local disposable skillsetu_audit database:

- Typecheck: passed (standalone tsc and final production-build TypeScript).
- ESLint: passed across the repository after the final source change.
- Vitest: 113/113 tests, 11/11 files, 74.70 seconds. Includes services, historical reports, ownership, idempotency, migrations and bank compatibility. No backend files changed after this run.
- Final Chromium/Edge regression: 9/9 tests in 59.3 seconds. Includes the existing six diagnostic checks, two actual-animation checks, and one layout/navigation/draft-resume journey across widths 1440, 1024, 390 and 320.
- Production build: passed using the project npm build command with VERCEL=1 so migrations and seed were explicitly skipped. A direct next build launched with node --env-file failed because its worker inherited an unsupported NODE_OPTIONS flag; the supported npm build command completed successfully afterward.
- Selected small-text color pairs were calculated and darkened to exceed 4.5:1; this is not a full automated WCAG audit. Browser checks cover keyboard access, visible focus, reduced motion and horizontal overflow. Desktop/mobile/intro/report screenshots were visually inspected.
- Local page and health endpoint: HTTP 200 after final startup.

No schema migration, bank version change, scoring change, content-key change, API change or database rewrite is needed. Existing run identifiers, submitted evidence, drafts, assistance labels, snapshots and historical reports retain their behavior. The process-hint button is explicitly type=button inside the unified task form so it cannot accidentally submit an answer.

Review and rollout: review the isolated feature branch and the desktop/mobile captures; obtain founder feedback on the visual direction and perform a short learner usability pilot before any rollout. Deployment remains a separate decision. Rollback is a source revert of this presentation change; no data migration reversal is needed. No production deployment or merge was performed, and production/source parity has not been verified. BUILD_PROVENANCE.json ties the local Next build to exact component/style hashes rather than attributing it to the live site.

Preview: http://localhost:3002/diagnostic-v2 (refresh an already-open tab). Preserved browser sessions resume their current task; they do not need to start over.
