# SkillSetu durable instructions

SkillSetu is a three-role placement-preparation prototype: Data Analyst, Python Developer and Java Developer. Use Next.js App Router, React/TypeScript, Prisma 6.19, PostgreSQL/Neon, Vitest and Playwright. No hiring guarantees, employer endorsement or scientific-confidence claims.

Current founder specification: docs/AUTHENTIC_READINESS_SPEC.md. Python receives authentic assessment and deeper repair content first; shared architecture and the dark shell support all roles. Preserve all legacy banks, Data Analyst/Java content, Python historical attempts and lesson progress. No cross-role proficiency credit. Assessment proficiency and practice mastery remain separate. Reassessment may improve, stay flat or decline.

Use additive migrations; do not edit previously applied migrations, reset/drop production Neon, mutate immutable bank content, or run learner code in Node/Vercel/shell. New bank IDs/content versions are required when authoring changes. Browser Pyodide runs in an opaque-origin iframe/Web Worker; preserve CSP/network restrictions and timeouts. Browser outputs are inspectable/forgeable prototype evidence, not high-stakes certification. Never expose answer keys, expected outputs, solutions or database credentials through public projections.

Runtime: Node 24 recommended (22.13+ minimum). npm ci --ignore-scripts, configure ignored .env with PostgreSQL DATABASE_URL, configure separate ignored .env.test with TEST_DATABASE_URL, then npm run setup. Setup/build copies pinned Pyodide assets, generates Prisma, applies checked-in migrations and seeds idempotently when DATABASE_URL is available. Cloud runtime helpers are in /workspace/skillsetu-runtime. Keep inherited proxy/CA settings; commands opening sockets need executor network access enabled.

Continue through authorized implementation without milestone approval pauses. Record reversible defaults in docs/DECISIONS.md and genuine non-blockers in docs/PENDING_QUESTIONS.md. Keep docs/STATUS.md honest. Run typecheck, lint, unit/integration tests, production build and relevant Chromium journeys after meaningful phases; fix failures before proceeding. Inspect desktop/mobile/PDF artifacts. Final work goes through a dedicated branch and PR into main; do not merge automatically or silently publish production database changes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
