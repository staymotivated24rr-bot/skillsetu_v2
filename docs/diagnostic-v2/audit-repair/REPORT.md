# Audit repair: behavior, verification and rollout

Base: `feat/interactive-diagnostic-v2`, commit `232d687`. Work branch: `feat/diagnostic-v2-audit-repair`. This improves the existing engine/service/UI; it does not incorporate the alternative implementation from PR #7.

## Provenance and data boundaries
The supplied audit and screenshots are evidence of the 27 Oct browser observations. Remote deployment-to-commit parity was not independently established. No production endpoint was written, migrated or deployed. The earlier localhost:3001 preview belonged to another branch/build, so its behavior is not attributed to this source. This repair is tested at localhost:3002 against disposable database `skillsetu_audit`; all QA identities are synthetic. The live remote build remains unverified.

## Before / after
| Area | Before | After |
|---|---|---|
| Text grading | Exact authored string membership | New-item explicit fragment contracts; bounded token comparison accepts whitespace and mixed quote equivalents; full token stream rejects semantic differences and extra code |
| Historical behavior | Published 1.0 bank and rules | Original bank fingerprint and rule implementation preserved; existing snapshots use legacy selection/findings/report logic and exact legacy grading |
| Routing | Fresh runs silently use previous first gap | Independent is the default; separate prior-informed action discloses report routing and no proficiency credit |
| Content | 36 items / shared process hint | New immutable reviewed-2.0.0 bank, 48 IDs, contextual item hints, subskill labels, difficulty rationale and exposure families; opaque workflow IDs and rotated decisions |
| Interaction | Static input/radio/order | Source-transition state cards with learner notes, range boundary controls synchronized to the answer, error localization synchronized to the answer; native keyboard/touch alternatives |
| Learning | Short static overview | Predict → compare worked example → targeted practice check → neighbouring transfer case; practice never mutates diagnostic results |
| Report | Broad uncertainty sentence | Independent counts and formats retained; distinguishes sparse/assisted, narrow-format, foundation-only and conflicting evidence; links to specific subskill practice |
| Exhaustion | Only overall bank exhaustion | Explicit unresolved-competency exhaustion after mandatory coverage; no invented mastery or repeated item |

## Selection traces
`before-traces.json` captures deterministic baseline strong/struggling/mixed selection. `after-traces.json` logs item ID, subskill, competency, difficulty, type, actual submitted answer, rationale and stop reason for three independent synthetic profiles. Revised runs stop at 18 strong, 19 struggling (first response assisted), 24 alternating mixed. These are reproducible synthetic trajectories, not a reproduction of the audit's exact mixed answers or empirical learner validation. Other patterns can reach the unchanged maximum 30. Assistance never contributes to independent mastery evidence.

The current selector retains prior-answer difficulty adjustment, prerequisite investigation, format variety, uncertainty follow-up and mandatory coverage reservation. New parallel content expands available verification; rules remain preliminary. No IRT, ability confidence percentage or hiring score is introduced. Independent runs exclude prior-report routing; reassessment can start at a previous gap and reuses known content, explicitly limiting transfer claims. Within-run IDs never repeat. Exposure families identify reused source content, but longitudinal exposure balancing remains a later calibration task.

## Grading contract and review limits
The lexer accepts only a bounded token vocabulary and quoted string values. It never executes, evals or imports learner text. Valid whitespace and single/double quote combinations normalize; identifier case, operands, defaults, bounds and operators remain significant. `row.get('note', '')` differs from a None default; `reading is None` differs from equality/truthiness; `sorted(items)` differs from mutating sort; range bounds and bool-versus-exact-int remain significant. `unsure` is a nonmatch, not an empty draft or mastery signal. The contract is a constrained fragment language, not a full Python equivalence solver: algebraic rewrites, arbitrary escape spellings and unlisted syntactic forms can still be rejected. The UI requests constrained fragments.

All new item keys have automated positive tests; representative semantic negatives and injection-like inputs are tested. Engineering review checked original keys and distractors, but independent educator sign-off has NOT occurred. Every item remains draft for a consented formative pilot until a reviewer checks ambiguity, difficulty, distractors, parallel-item independence and accessibility. Do not call authored difficulty calibrated. State cards are learner-authored predictions through a fixed scenario, not a Python interpreter.

## Migration and compatibility
No new migration or schema change is required. Existing branch migrations are applied only to disposable data. New runs snapshot bank 2.0.0 and engine rules-2.0.0. Original bank remains byte-identical; old engine is retained in `legacy-engine.ts`. Session ownership locks, immutable payloads, duplicate transport retries, hint flags, drafts and serialized completed reports are retained. Tests resume an archived rules-1.0.0 fixture, finish it, start new modes and verify its stored report never changes. Existing learning/proficiency tables are untouched.

## Staged load and rollout plan (not executed)
Keep the pilot flag off in production. First independent educator review and a small consented think-aloud pilot; use unseen practical tasks to investigate false gaps. Then disposable staging: ramp 1/5/10 submissions per second, 20 minutes per stage, realistic 18–30-answer sessions plus refresh/draft traffic, bounded retries and simultaneous submissions. Record p50/p95/p99, pool wait, database locks, row growth, CPU/memory, errors and duplicate/lost evidence. Proposed acceptance: zero lost or duplicated evidence, <1% request errors and p95 <500ms at the agreed initial load. These are targets, not measured results or capacity claims.

Before any rollout: resolve current dependency advisories, review privacy/session revocation/abuse limits, backup and restore rehearsal, verify staging build commit and bank digests, and review migration history. Use a small flagged cohort with monitoring; rollback the application flag while retaining snapshots and legacy engine. No merge/deployment is authorized here.
