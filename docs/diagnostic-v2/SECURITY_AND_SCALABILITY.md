# Security, operations and 10,000 registered users

This is a flag-off pilot, not a public-account release or a benchmarked concurrent-user platform. Keep the existing Next/PostgreSQL architecture. No production account, remote runner or hosting configuration was provisioned.

## Threat model and implemented controls

| Threat | Current control | Remaining boundary |
| --- | --- | --- |
| Read/write another pilot's attempt | Random 256-bit cookie, token hash lookup, expiry, session-scoped queries and owned row locks | Cookie theft/browser compromise can impersonate a session; no user login/recovery |
| Forge correct/score fields | Strict schemas; private authored keys; only server grades; no client score/output accepted | Small published item bank can be memorized or externally assisted |
| Change submitted answer | Unique run/question index, row lock, normalized exact replay, changed replay rejected | General audit/event export still future |
| Race or duplicate saves | Insert/select/report in one PostgreSQL transaction; hint/draft share lock | Client draft writes use latest arriving request, not a cross-tab conflict editor |
| Reveal keys | Allowlisted public projection of only active item; private no-store responses; type-only client imports | Completion explanations deliberately teach content; repeat-bank testing is vulnerable to familiarity |
| CSRF and excessive input | Required exact Origin with public Host, HTTP(S) only, Sec-Fetch-Site rejection, strict JSON, streaming 8 KiB cap | Trusted reverse-proxy Host routing must be configured correctly; no distributed abuse quota yet |
| Malicious learner code | Pilot never executes text; exact bounded fragment/value checks only | Does not assess unrestricted implementation quality |
| Historical tampering | Immutable bank registry, per-run snapshot/digest/engine version, sealed report | Digest detects accidental/in-process mismatch, not an administrator able to rewrite both content and hash |

TLS plus Secure cookies are required publicly. HttpOnly/SameSite cookies reduce exposure; they are not account authentication. Session deletion/recovery, consent, retention/export, account linking, secure identity provider, verified ownership and server-side revocation must precede real public accounts. Losing a pilot cookie loses self-service access; records are not deleted. Token hash lookup must never accept a learner ID or a session database ID as a bearer token.

### Legacy audit

Legacy `skillsetu-demo` stores a UUID directly. Application ownership checks prevent ordinary cross-session access, but a leaked UUID grants impersonation. Migrate to verified identity and unpredictable revocable server sessions before serving real students. Keep fictional placement cohorts distinct from student data. There is no institutional multi-tenancy/authorization model yet. Legacy missing-Origin requests remain accepted by existing API policy; the new route requires Origin.

Pyodide executes in a browser worker inside an opaque-origin iframe with pinned self-hosted assets, CSP/network restrictions and timeouts. Preserve those boundaries. Legacy `/api/demo` accepts client-produced outputs and compares them with server expectations; a caller can submit forged outputs without executing the displayed source. Server-side ownership/schema checks do not prove execution integrity. This is low-stakes preparation evidence. The new diagnostic does not use this transcript path or grant code-execution credit from it.

### Production code-evaluation strategy (design only)

For future independent executable assessments, use a remote per-job microVM/container isolation service with no application/DB credentials, deny-all outbound network, read-only root, disposable writable storage, non-root identity, CPU/time/memory/process/output limits and cancellation. Authenticate job submissions server-to-runner; store code hash, pinned runtime, private cases, evaluator version and signed job result. Do not trust browser outputs. Separate queue concurrency and costs from the web request path, monitor isolation failures and retain minimal data under a defined policy. A plain Node child process, Python import restriction or shared Docker process is not a sufficient production sandbox. No runner was installed or provisioned here.

## Planning assumptions

10,000 registered users is not 10,000 simultaneous users. Initial planning scenario: 10% daily active (1,000); 200 diagnostic starts/day, 24 answers/start ≈4,800 answer writes/day. Each 30-minute session averages one answer every 75 seconds. Plan a 50-active-session peak initially, 200 in a load-test surge; at 50 users this is roughly 0.67 answer writes/s, plus reads and debounced draft saves. Registration/event bursts can dominate averages. Validate these assumptions in a pilot rather than presenting them as traffic forecasts.

A fully completed account at 30 responses stores bounded short text, small response metadata, one bank snapshot and a report. At 10,000 completed users this is up to 300,000 response rows per assessment cycle; repeated runs multiply it. Raw snapshot size is recorded in future load checks; set retention/maximum restart policy before abuse exposure. Shared bank storage could later replace repeated snapshots with an immutable FK plus version dispatcher after migration planning.

## Scaling path

- Stateless app servers: no mutable in-memory assessment state; PostgreSQL locks enforce one active run and sequenced answers across instances. Do not implement correctness with process-local locks.
- Indexes: unique token hash, session/run chronology, unique run/question and run/position support critical queries. Current queries are bounded to a 30-response run; ordered includes use the position index. Add expiry/cleanup index only when implementing scheduled retention; avoid speculative indexes.
- Pooling: use managed pooled DATABASE_URL for web requests, a controlled direct migration connection and provider-appropriate Prisma limits. Bound total connections across instances; monitor connection wait and transaction duration before raising concurrency. Do not run migrations per HTTP request or on every autosave.
- Selector: 36 items and ≤30 responses; current simple scans are intentionally small. Cache immutable parsed banks by digest if profiling shows a need. Never cache private run responses in shared CDN storage.
- Drafts: 650ms debounce and cancellation, local draft fallback. Autosave is convenience; only submitted responses drive evidence. Do not add request-per-keystroke writes or silently submit offline work. Budget up to several draft writes per answer in load tests.
- Abuse controls: before public enablement, enforce distributed session/IP token-bucket limits at platform or shared storage (proposed: registration 5/hour/IP; starts 10/day/session; reads 60/min/session; answer/draft/hint aggregate 120/min/session with burst 20). These are initial engineering limits requiring usability/load review, not implemented quotas. Add 429/Retry-After handling and test replay semantics under throttling.
- Observability: add request/transaction latency histograms, database pool wait, failed saves, resume rate, starts/completions, stop reason, assistance and item distribution. Never log tokens, private answer keys, full learner answers or raw DATABASE_URL. Current unexpected API errors log only error class and return a recoverable generic message. Platform tracing/alerts are not provisioned.
- Recovery: PostgreSQL atomic commit avoids half-saved evidence. GET resumes after ambiguous network success. Use bounded database/connect/transaction timeouts; monitor lock contention and rollbacks. Test same-run concurrency separately from many independent sessions.
- Backups: managed daily backup/PITR as supported, documented retention and restore rehearsal. Stage additive migrations with a recent backup, inspect locks and schema diffs, migrate before enabling the route; roll back the application/flag if needed while retaining additive tables. Never reset the shared database.
- Hosting/costs: one Next application and managed PostgreSQL pool is the default. Budget app requests/CPU/bandwidth, database compute/storage/backups, telemetry and browser assets separately. Pyodide is large and lazy-loaded only by the existing coding flow; this pilot does not download it. Actual provider plan pricing/quotas must be checked at release; no current quote or capacity purchase is asserted. Existing Vercel/Neon configuration is unchanged.

## Measurable performance gates — proposed, not benchmark results

Warm API GET/answer p95 <500ms, p99 <1.5s at 50 active sessions; <1% server errors excluding intentional validation errors; answer transaction p95 <150ms; zero duplicate evidence, missing owned responses or cross-user disclosures. First useful mobile task under 2.5s on the chosen representative device/network; no unexpected horizontal scrolling. Resource/headroom targets need explicit hosting plan and test setup.

Load-test strategy: disposable dedicated PostgreSQL plus production build, realistic seeded sessions; 5-minute warmup, 15-minute 50-session steady load, 5-minute 200-session surge, 15-minute soak, then a rollback/restore rehearsal. Model think time, draft bursts, 1% exact transport retries, stale submissions, simultaneous starts and multiple sessions—not a tight loop on one run. Record environment, commit, plan, p50/p95/p99, errors, connections/CPU/memory, row count invariants and spend. Include disabled-flag checks. A small selector benchmark or passing Playwright suite does not establish 10,000-user production capacity. No concurrent-user/load benchmark was run in this milestone.
