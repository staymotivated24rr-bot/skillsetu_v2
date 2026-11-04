# Architecture and measured evidence

The current authentic v2 implementation is documented in the final section below. Earlier sections describe preserved legacy-v1 behavior; they remain for interpreting historical Data Analyst, Python and Java attempts.

## Runtime

Next.js App Router monolith: one responsive client workspace, a small Node API, pure scoring functions, and Prisma backed by PostgreSQL. Neon is the hosted database target for Vercel. The client never receives assessment keys or future stakeholder replies. Server route validation uses Zod and enforces session ownership, action ordering, valid choices, and same-host browser submissions.

Source map:

- `src/lib/skills.ts`: preserved Data Analyst 16-node graph, targets, importance, prerequisites, example employer thresholds.
- `src/lib/simulations.ts`: three diagnostic scenarios and three alternate reassessment scenarios; eight scored actions each.
- `src/lib/lessons.ts`: one original micro-lesson per skill; shared learning objectives in interactive/structured modes; four graded practice items each.
- `src/lib/engine.ts`: weighted scoring, gap planning, readiness, before/after and mastery functions.
- `src/lib/service.ts`: relational persistence, transactions, safe public projections, original baseline and latest reassessment.
- `src/lib/provider.ts`: local hints/explanations plus an injectable provider with deterministic fallback on failure.
- `src/app/api/demo/route.ts`: validated student actions and public fictional-cohort reads.
- `src/components`: workspace, simulation runner, lessons, reports and cohort dashboard.
- `prisma/schema.prisma`: PostgreSQL schema; `prisma/migrations`: checked-in Prisma migrations applied with `prisma migrate deploy`.

## Workplace simulations

Diagnostic cases: retailer revenue decline, checkout experiment, and support queue briefing. Reassessment cases: subscription credits, notification experiment with a harm guardrail, and warehouse performance.

Each case follows clarify → query/clean/describe → analyze → interpret/decide → brief. The learner chooses structured text actions rather than chatting freely. Clarification options trigger different stakeholder responses. All choices still reveal the essential agreed definition, so a poor initial clarification does not make later items impossible. The submitted action is graded once and cannot be changed; stakeholder dialogue continues the case without inflating a score. No 3D, voice, AI roleplay, live code execution, or external API.

The observable workplace rubric:

- Requirement clarification: recognizes a business decision, metric, population, comparison period and constraints.
- Communication: selects a brief with a measured finding, honest uncertainty, and a useful next action.
- Analytical reasoning: distinguishes association from causal evidence and chooses decision-relevant investigations.
- Technical skills: chooses correct SQL, spreadsheet or pandas operations at the right grain.
- Statistics/probability: calculates or interprets rates, summaries, intervals and pre-agreed tests in context.

The rubric evaluates recognition in structured choices. It does **not** prove the learner can independently write production SQL or compose a complete stakeholder brief. That is a future validation/authoring extension.

## Scoring

An action is 1 if its selected option matches the authored rubric and 0 otherwise. For skill `s`:
`proficiency = round(100 × sum(correct × mapping weight) / sum(mapping weight))`.
Every skill is mapped in both assessment banks. Evidence density remains limited; report evidence counts alongside proficiency. A shared action contributes to each explicitly mapped skill. Evidence count is shown beside scores. No arbitrary demo points or automatic improvement.

Role readiness is the importance-weighted average of skill proficiency, rounded to an integer. Categories: <45 significant development; 45–74 developing; 75+ near role-ready **unless every individual role target is met**, in which case the label is “Meets prototype readiness threshold.” A high average alone cannot pass a weak essential skill. Employer matching uses each skill's independent example-employer target.

The first completed diagnostic remains baseline. Current evidence is the latest completed assessment, including a poorer reassessment. Partial attempts are excluded. Practice mastery never overwrites diagnostic or reassessment evidence. Stored answers, scores, learning path and report references are linked to an attempt, with completion writes inside one transaction.

## Gap plan and personalization

Include only skills below the role target. Rank independent skills by `(target − current) × importance`, then order unmet prerequisites before dependent gaps with a duplicate-free topological traversal. Expose prerequisite names and the reason for each recommendation. Completed/mastered lessons show their status; first-response practice mistakes expose feedback and hints, and a new run can verify mastery after review.

The same four practice items support both modes. At least three correct first responses **and** a correct final application are needed for mastery. Repeated attempts on the same item do not alter the first-response result. Each new run has a separate history; repeated runs currently reuse a fixed bank. Completion can regress to “needs practice” on a weaker new run, which is shown honestly.

## Data model and future growth

Role, SkillCategory, SkillNode, role requirements, assessment templates, scenarios, questions and weighted mappings describe content. User, attempts, answers, scores, learning paths, progress/practice answers and report snapshots describe evidence. College/Cohort/CohortMember holds explicitly fictional fixture summaries independently of student sessions. EmployerProfile and employer requirements demonstrate role comparison.

Future employers and openings should reference requirement profiles; interviews/referrals should reference an opening, learner and evidence snapshot. Do not treat today's fictional profiles as jobs or referrals. The runtime now uses PostgreSQL; JSON-shaped authored payloads remain serialized into text to keep the current model simple.

## Security and operational limits

Demo UUID cookies are HttpOnly and SameSite=Lax; ownership is checked on student operations. This is demo access, not verified identity, college authorization or enterprise authentication. The cohort is public fictional data. The application does not need email, real names, API keys, or secrets. React renders text without raw HTML. Database credentials and content keys remain server-side.

Fixed assessment banks and cookie demo sessions are appropriate for a prototype, not production multi-tenant deployment. Before collecting real student data add real authentication, officer authorization, consent/retention policy, rate limiting, content versioning and assessment integrity controls. Seed content updates in place, so freeze/version items before a real longitudinal study. Preserve `.env` and database privacy. The app has no billing or external sending features.

## Multi-role extension

`role-catalog.ts` is safe public metadata: role name, description, work, duration, categories and template/profile/cohort IDs. `tracks/index.ts` registers that metadata with server-side Data Analyst banks and original developer banks. Python has 17 nodes, Java 18, Data Analyst 16. Each role has its own 24-action diagnostic, different 24-action reassessment, one four-check lesson per skill, fictional employer requirements and fictional cohort.

Developer topic definitions supply concept, intuition, worked example, summary and four authored checks through shared authoring helpers. The fourth check applies the concept to a larger workplace decision. Correct options rotate deterministically to avoid a fixed answer-position pattern. The same existing engine grades every role with binary rubric credit weighted by mapped skill relevance; no partial credit or AI grading is implied. Code excerpts are text to interpret, not a sandbox.

User.selectedRoleId stores the chosen catalog role; cohort.roleId records fixture scope. The immutable second migration adds these fields with Data Analyst defaults. Existing assessment, question, lesson and learner IDs remain stable. API selection validates catalog IDs. Skill/lesson/progress/attempt/employer queries are scoped to that role; writes check ownership, role, sequence and valid choices. Learning requires the current role’s completed baseline. Both active and completed attempts are retained across switches, but excluded from other roles’ reports. No skill evidence or mastery is transferred automatically.

The public college selector changes its cohort independently of student selection. Each cohort has 30 fictional aliases; role skill IDs prevent cross-track comparisons. Fixture changes are never described as actual student improvement.

PostgreSQL migrations are managed by Prisma migration history. CI runs PostgreSQL 16, applies migrations, seeds all tracks, and reruns integration tests against the relational model. Real Neon credentials and the production Vercel cutover are verified separately before merge.

## Authentic assessment v2 (shared architecture, Python content)

The legacy sections above describe `legacy-v1` attempts. The additive v2 implementation is in `src/lib/authentic/`: `types.ts` defines discriminated task conventions, `python-banks.ts` privately authors five Python banks and 17 deeper repair modules, `grading.ts` provides pure output/rubric/order grading and evidence strength, `planning.ts` computes actual change explanations and seven-day pacing, and `service.ts` applies ownership/order/version rules to task and repair operations. Private bank content is imported only by seed/service/tests; client projections remove correct indices, expected outputs, rubric concepts, solution code and unrevealed branches.

`AssessmentBank` holds immutable serialized content and a SHA-256 digest. `AssessmentAttempt` adds nullable bank relation, role snapshot, skill snapshot, assessment version and content version. Null bank relations retain the original legacy path. `TaskEvidence` stores task type, scenario, transfer, mappings/weights, bank/version, bounded learner payload, submitted credit and stakeholder response. `SkillScore.quality` stores descriptive evidence metadata. `RepairRun` snapshots module content/version and mode/run/status; `RepairAnswer` stores each first response and retry separately. Original lesson/progress tables stay intact. Migration `202610020003_authentic_evidence` only adds fields/tables/relations; the first two migrations are unchanged.

Completion is serialized by an attempt row lock and writes evidence scores/path/report atomically. Concurrent starts lock the learner row to avoid duplicate active attempts. Starting another role never borrows its baseline or proficiency. Latest proficiency uses only the completed bank's weighted task credit. Cumulative confidence deduplicates task IDs across completed banks; it does not average away a recent decline. Historical reports use stored proficiency, bank/version and skill/target snapshots. Legacy employer profiles remain explicitly fictional, current reference targets rather than promised hiring criteria.

### Browser Python boundary

`python:prepare` copies pinned runtime assets from the npm package into ignored `public/python/` during setup/build. The runtime is fetched only when Run Python is requested. `GET /api/python-sandbox` returns a fixed document as text; the client mounts it using `iframe.srcdoc` and `sandbox="allow-scripts"` without `allow-same-origin`. The document CSP allows scripts/connect only to that deployment's `/python/` path; other network destinations and application API paths are excluded. The worker loads Pyodide, disables network/importScripts/nested-worker globals, and evaluates only in its own WebAssembly/Python namespace. It returns JSON-safe outputs, enforcing bounded output and input preservation. The API compares outputs to private authored cases; the API never executes learner code. The frame and worker are discarded after each run/timeout. Python's virtual files are not server files; imports/open/network are restricted additionally.

A browser execution transcript is supplied by the learner's browser and can be forged. Static CSP/opaque origin protects application credentials and APIs; import allowlists alone are not a certified Python sandbox. Tests and evaluation inputs are inspectable; retries can reveal pass counts. This is suitable for prototype preparation, not trusted anti-cheating certification. A future high-stakes mode requires an independently isolated remote runner and stronger identity/assessment integrity. Browser memory is bounded by the browser process, not a guaranteed per-task quota.

### Evidence and scoring

Decision credit is 0/1. Code credit is the fraction of expected-output cases matched, after mutation/error checks. Ordered steps receive the fraction of correct precedence pairs. Explanations receive weighted credit for three normalized concept dimensions, with a 30-character minimum and 4,000-character maximum. No explanation or lesson completion automatically raises readiness.

Skill evidence score = `round(100 × sum(task credit × skill mapping weight) / sum(skill mapping weight))`. Readiness = role-importance-weighted average of those skill scores, not raw task accuracy. Each important Python skill has at least four primary independent opportunities; critical skills have six or more mapped opportunities. Evidence strength is Limited by default; Moderate needs at least three opportunities, two types and two scenarios; Stronger needs at least five unique opportunities, three types/scenarios, three independent opportunities and transfer. These are authored descriptive rules, not statistical confidence intervals. UI shows latest-bank opportunities, cumulative unique opportunities, types, transfer and label reasoning.

The stakeholder response selects strong/developing/risk branches from submitted credit; the following task reveals the corresponding fixed authored constraint. Task contracts, skill weights and denominators do not change by branch. Two baseline and three reassessment banks vary work contexts, inputs, boundaries and recognition questions while retaining the skill/weight blueprint. They are not psychometrically equated; further pilot validation is required.

### Repair and presentation

Python's new six-task repair sequence adds actual code/short-answer/order work, first-response mastery, hints, retries, independent and transfer applications. Legacy four-item modules remain available in storage/API for history compatibility. Prerequisite-first gaps feed a seven-day effort plan; mastered repair modules move to fresh verification without changing assessed proficiency. Failed evidence is named in priority cards. Reports provide before/after, improved/declining/unchanged skills, new gaps, additional weak evidence, limitations, concrete next actions and historical report selection.

The shared CSS uses semantic dark tokens for surfaces, text, borders, accent/status/focus and spacing, with a separate light print token set. Student navigation includes keyboard focus trapping and Escape/restore for mobile. Cohort analytics exclusively use the 90 fictional seeded members; task diversity is not invented for fixture summaries, so their confidence is explicitly limited. No live anonymous users are mixed into cohort analytics.

Deployment remains Node/Next.js on Vercel with Neon/PostgreSQL. Run additive migrations/seed from a trusted environment before the new build serves these tables. This branch is verified locally against production-equivalent builds; live Neon credentials and remote deployment verification must be reported separately.
