# Local diagnostic interaction report

Audited source commit **0fd0039**, bank **python-adaptive-reviewed-2.0.0**, Next build **rBmPQ5IUTOoBkEL_leYfi**. Exhaustive run: 30/10/2026, 23:37:31–30/10/2026, 23:40:31 IST. Local browser automation used isolated Microsoft Edge/Chromium contexts, not a cloud browser. The user's localhost session with seven saved answers was observed and left untouched; audit sessions used 127.0.0.1 and disposable identities.

## Outcome

- **48/48 published questions exercised; 143/143 submission variants passed.**
- **18/18 displayed decision options submitted**, 41 authored acceptable text formats, 36 explicit unsure submissions, 36 semantic mismatches, six authored ordering sequences and six reversed sequences. All enabled ordering moves, state-card next/previous controls, boundary controls and source-line options were activated.
- **635 successful actions/checks recorded** by the exhaustive harness, plus five passing supplemental recovery/entry checks. This is a recorded-check count, not a claim that every low-level mouse/keyboard event was counted.
- Six linked module pages, both practice choices on each, and both report restart modes were exercised.
- **2,807 records present before the exhaustive run were unchanged** in before/after row hashes, including diagnostic snapshots/reports/responses, legacy attempts, bank records, lesson/practice/repair progress and users. The exhaustive run created 149 disposable runs, followed by one supplemental recovery session, two focused screenshot fixtures and new regression sessions. Test data was retained, not deleted.
- **Nine existing Chromium regressions passed in 58.8 seconds**, covering ownership/origin rejection, forged/stale/oversized submissions, transport idempotency, mobile keyboard, 320/390/1024/1440 layout, actual animation and reduced motion.
- Audit-script TypeScript and lint checks pass. Application code, schema, bank, dependencies and deployed data were not changed. No build was needed or performed during this audit; the running build above was inspected. The earlier 113-test unit/integration result was not rerun or counted as a new result here.

The passing submission checks do **not** mean there are no UX issues. The refresh audit found **three issue classes affecting six items**, and visual/content review added **two observations** below. No observed loss of submitted responses or historical reports, wrong grading relative to the authored keys, or duplicate saves. Authored-key agreement is engineering verification, not independent educator validation or validated psychometrics.

## Findings and reproduction

### F1 · P2 · Boundary candidate resets while the saved answer survives

Affected: review2-values-parallel-loop-boundary.

1. Set Candidate stop to a value other than 3, wait for the draft to save, refresh, then Resume diagnostic.
2. Observed: The restored answer is retained, but the dial, slider and numeric candidate reset to 3. The screenshot shows a saved answer of 5 alongside a candidate of 3.

Impact: The learner sees conflicting states; touching the reset control can overwrite the restored answer.

Suggested repair: Initialize/synchronize the candidate from the restored draft and keep a single source of answer state.

Source starting point: src/components/diagnostic-manipulation.tsx:12. [Screenshot](screenshots/review2-values-parallel-loop-boundary-resume-discrepancy.png).

### F2 · P2 · Source-line choice loses its selected state on resume

Affected: review2-collections-parallel-error-location, review2-errors-parallel-error-location, review2-testing-parallel-error-location.

1. Select a source-line radio, wait for its answer draft to save, refresh and Resume diagnostic.
2. Observed: The text answer is restored, but no source-line radio remains checked.

Impact: The visible error-localization control no longer represents the saved answer.

Suggested repair: Derive the selected line from the saved draft, including updates made through the answer input.

Source starting point: src/components/diagnostic-manipulation.tsx:14. [Screenshot](screenshots/resume-source-line.png).

### F3 · P3 · State-card scratch work is not restored

Affected: review2-values-parallel-state-cards, review2-functions-parallel-state-cards.

1. Advance through state cards, enter scratch predictions, save the final answer, refresh and Resume diagnostic.
2. Observed: The answer persists, but transition notes and active state-card position reset.

Impact: Exploration work can disappear during a break even though the answer draft is saved. Scratch work is not graded.

Suggested repair: Persist per-transition scratch state separately, or disclose clearly that the thinking-space notes are temporary.

Source starting point: src/components/diagnostic-manipulation.tsx:12. [Screenshot](screenshots/resume-scratch.png).

### F4 · P2 · The return-contract lesson still uses generic verification practice

Affected: Functions & scope lesson reached from the struggling report.

1. Open the Functions module recommendation for return-contract; predict a case, compare the example, and exercise both practice options.
2. Observed: The route displays Practice: return-contract, but its guided check falls through to the generic independent-expectation question instead of a return-value contract exercise. Both buttons work; all six modules are reachable.

Impact: The recommendation is functional, but its repair activity is less targeted than the diagnostic subskill suggests.

Suggested repair: Give return-contract an explicit guided activity and review the other generic fallback routes for subskill alignment.

Source starting point: src/components/guided-repair.tsx:16. [Screenshot](screenshots/lesson-2.png).

### F5 · P3 · Localized code displays two sets of line numbers

Affected: The three error-location items.

1. Inspect an error-location question before submitting.
2. Observed: The code already contains authored 1:, 2: labels while the renderer adds its own gutter numbers. This was visually observed, not counted as a failed submission.

Impact: Redundant labels add clutter to a task that asks for a line number.

Suggested repair: Use one consistent presentation numbering layer without mutating published bank snapshots or grading line identifiers.

Source starting point: src/components/diagnostic-experience.tsx:385. [Screenshot](screenshots/review2-errors-parallel-error-location.png).

## Natural adaptive journeys

These runs used normal UI selection with isolated identities, with **no question reassignment**. Their item-by-item ID, competency, type, difficulty, answer class and selection rationale are in RESULTS.json. Exact private answer keys are not repeated in the report.

| Profile | Responses | Result | Stop |
| --- | ---: | --- | --- |
| strong | 18 | Six demonstrated strengths | Minimum length and coverage met; repeated evidence is consistent across every competency. |
| struggling | 19 | Six likely gaps (first response assisted) | Minimum length and coverage met; repeated evidence is consistent across every competency. |
| mixed | 30 | Six insufficient-evidence findings | Maximum length reached; unresolved areas remain insufficient evidence. |

The mixed profile deliberately missed every third submission. It is a different answer sequence from the founder's earlier 24-question mixed audit; this run reached the documented 30-question maximum, with five responses and four task types per competency. Do not compare the two lengths as deployment parity evidence.

## Button and interaction coverage

| Surface | Exercised behavior |
| --- | --- |
| Entry | Empty/whitespace name keeps start disabled; 40-character input bound; nickname and start action |
| Resume | Saved draft restored for every item fixture; assisted hint stays disabled after refresh |
| Question | Every decision option; text accepted/unsure/mismatch; submit enablement; Why this task open/close; process hint without submitting |
| Exploration | Every source-line radio; slider stops 0–7 via keyboard; number values 0–7 plus clamping; every state transition forward/backward and scratch notes |
| Ordering | Disabled first-up/last-down boundaries; every available up/down control; saved order after refresh; correct and reversed sequence submissions |
| Progress | Mobile learning map open/close; active competency visible; progress counts saved answers |
| Feedback | Continue discovery and final See my skill map; assistance label, counts and authored grading |
| Report | Bookmark/reopen; review disclosure; all six module links and learning-order links; fresh independent and disclosed prior-informed starts; historical report remains unchanged |
| Lesson | Prediction required; compare example; each radio choice; check reasoning; try another case; return to map; practice leaves the sealed diagnostic report unchanged |
| Recovery | Aborted answer request; visible error; reconnect/resume restores draft; retry; actual rapid double-click saves once; new browser session retains the old run |
| Navigation | SkillSetu brand to home and browser back to report |

## Method and limits

A normal adaptive run cannot reach all 48 items because the policy stops at 18–30. The item sweep therefore reassigned the current item **only inside newly created audit-owned runs in skillsetu_audit**, retaining their authentic immutable bank snapshot and grading path. Each answer variant used an unsubmitted fixture run; no learner response was rewritten. Fixture screenshots show Task 1 because these are isolated item checks, not adaptive-selection evidence. Question sweep alternated desktop 1440×1000 and mobile 390×844; it did not test every question on both sizes. Every displayed option was activated and submitted, but all 24 permutations of each four-step workflow and all possible free-text strings were not exhaustively enumerated.

An initial audit launch used unsupported top-level await in this CommonJS repository; the harness was corrected before browser work started. Later, the broad recovery alert locator also matched Next's route announcer, so that section stopped before clicking recovery actions. This was a harness ambiguity, not an application failure. RESULTS.json retains that original event; RECOVERY_RERUN.json records all corrected main-scoped recovery checks passing. The reusable full harness now uses the corrected locator.

There were no captured uncaught browser page errors during the exhaustive item/journey run. Deliberately aborted network requests are expected recovery stimuli. 63 screenshots are retained; selected desktop/mobile/question/lesson/report views were visually inspected, not every screenshot manually reviewed. This is not a full screen-reader, cross-browser, touch-device, load or capacity certification. Historical/retired banks were preserved by hashes and compatibility regressions; their entire UI content was not exhaustively replayed. Scope is the Python diagnostic and its linked six lesson routes, not the rest of SkillSetu.

Production deployment/commit parity was not inspected; no conclusion in this report is attributed to the live Vercel build. No merge, push, deployment or production database operation was performed. No learner code was executed. Findings are reported and remain unfixed because the request was an interaction audit.

## Complete question matrix

| Item | Competency | Type | Passed cases | Refresh observation | Screenshot |
| --- | --- | --- | ---: | --- | --- |
| review2-values-trace-1 | values | prediction | 3/3 | — | [View](screenshots/review2-values-trace-1.png) |
| review2-values-decision-1 | values | decision | 3/3 | — | [View](screenshots/review2-values-decision-1.png) |
| review2-values-trace-2 | values | prediction | 3/3 | — | [View](screenshots/review2-values-trace-2.png) |
| review2-values-patch-2 | values | completion | 3/3 | — | [View](screenshots/review2-values-patch-2.png) |
| review2-values-patch-3 | values | completion | 4/4 | — | [View](screenshots/review2-values-patch-3.png) |
| review2-values-workflow-3 | values | ordering | 2/2 | — | [View](screenshots/review2-values-workflow-3.png) |
| review2-collections-trace-1 | collections | prediction | 3/3 | — | [View](screenshots/review2-collections-trace-1.png) |
| review2-collections-decision-1 | collections | decision | 3/3 | — | [View](screenshots/review2-collections-decision-1.png) |
| review2-collections-trace-2 | collections | prediction | 3/3 | — | [View](screenshots/review2-collections-trace-2.png) |
| review2-collections-patch-2 | collections | completion | 3/3 | — | [View](screenshots/review2-collections-patch-2.png) |
| review2-collections-patch-3 | collections | completion | 6/6 | — | [View](screenshots/review2-collections-patch-3.png) |
| review2-collections-workflow-3 | collections | ordering | 2/2 | — | [View](screenshots/review2-collections-workflow-3.png) |
| review2-functions-trace-1 | functions | prediction | 3/3 | — | [View](screenshots/review2-functions-trace-1.png) |
| review2-functions-decision-1 | functions | decision | 3/3 | — | [View](screenshots/review2-functions-decision-1.png) |
| review2-functions-trace-2 | functions | prediction | 3/3 | — | [View](screenshots/review2-functions-trace-2.png) |
| review2-functions-patch-2 | functions | completion | 3/3 | — | [View](screenshots/review2-functions-patch-2.png) |
| review2-functions-patch-3 | functions | completion | 4/4 | — | [View](screenshots/review2-functions-patch-3.png) |
| review2-functions-workflow-3 | functions | ordering | 2/2 | — | [View](screenshots/review2-functions-workflow-3.png) |
| review2-errors-trace-1 | errors | prediction | 3/3 | — | [View](screenshots/review2-errors-trace-1.png) |
| review2-errors-decision-1 | errors | decision | 3/3 | — | [View](screenshots/review2-errors-decision-1.png) |
| review2-errors-trace-2 | errors | prediction | 3/3 | — | [View](screenshots/review2-errors-trace-2.png) |
| review2-errors-patch-2 | errors | completion | 3/3 | — | [View](screenshots/review2-errors-patch-2.png) |
| review2-errors-patch-3 | errors | completion | 3/3 | — | [View](screenshots/review2-errors-patch-3.png) |
| review2-errors-workflow-3 | errors | ordering | 2/2 | — | [View](screenshots/review2-errors-workflow-3.png) |
| review2-validation-trace-1 | validation | prediction | 3/3 | — | [View](screenshots/review2-validation-trace-1.png) |
| review2-validation-decision-1 | validation | decision | 3/3 | — | [View](screenshots/review2-validation-decision-1.png) |
| review2-validation-trace-2 | validation | prediction | 3/3 | — | [View](screenshots/review2-validation-trace-2.png) |
| review2-validation-patch-2 | validation | completion | 3/3 | — | [View](screenshots/review2-validation-patch-2.png) |
| review2-validation-patch-3 | validation | completion | 3/3 | — | [View](screenshots/review2-validation-patch-3.png) |
| review2-validation-workflow-3 | validation | ordering | 2/2 | — | [View](screenshots/review2-validation-workflow-3.png) |
| review2-testing-trace-1 | testing | prediction | 3/3 | — | [View](screenshots/review2-testing-trace-1.png) |
| review2-testing-decision-1 | testing | decision | 3/3 | — | [View](screenshots/review2-testing-decision-1.png) |
| review2-testing-trace-2 | testing | prediction | 3/3 | — | [View](screenshots/review2-testing-trace-2.png) |
| review2-testing-patch-2 | testing | completion | 3/3 | — | [View](screenshots/review2-testing-patch-2.png) |
| review2-testing-patch-3 | testing | completion | 3/3 | — | [View](screenshots/review2-testing-patch-3.png) |
| review2-testing-workflow-3 | testing | ordering | 2/2 | — | [View](screenshots/review2-testing-workflow-3.png) |
| review2-values-parallel-loop-boundary | values | completion | 3/3 | resume-control-desync | [View](screenshots/review2-values-parallel-loop-boundary.png) |
| review2-values-parallel-state-cards | values | completion | 3/3 | scratch-not-persisted | [View](screenshots/review2-values-parallel-state-cards.png) |
| review2-collections-parallel-error-location | collections | completion | 3/3 | resume-localization-desync | [View](screenshots/review2-collections-parallel-error-location.png) |
| review2-collections-parallel-dictionary-default | collections | completion | 3/3 | — | [View](screenshots/review2-collections-parallel-dictionary-default.png) |
| review2-functions-parallel-state-cards | functions | completion | 3/3 | scratch-not-persisted | [View](screenshots/review2-functions-parallel-state-cards.png) |
| review2-functions-parallel-return-contract | functions | completion | 3/3 | — | [View](screenshots/review2-functions-parallel-return-contract.png) |
| review2-errors-parallel-error-location | errors | completion | 3/3 | resume-localization-desync | [View](screenshots/review2-errors-parallel-error-location.png) |
| review2-errors-parallel-cleanup | errors | completion | 3/3 | — | [View](screenshots/review2-errors-parallel-cleanup.png) |
| review2-validation-parallel-exact-type | validation | completion | 3/3 | — | [View](screenshots/review2-validation-parallel-exact-type.png) |
| review2-validation-parallel-range-check | validation | completion | 3/3 | — | [View](screenshots/review2-validation-parallel-range-check.png) |
| review2-testing-parallel-boundary | testing | completion | 3/3 | — | [View](screenshots/review2-testing-parallel-boundary.png) |
| review2-testing-parallel-error-location | testing | completion | 3/3 | resume-localization-desync | [View](screenshots/review2-testing-parallel-error-location.png) |

## Evidence and rerun

- [Interactive HTML report](report.html)
- [Machine-readable cases, actions, journeys and findings](RESULTS.json)
- [Recovery rerun](RECOVERY_RERUN.json)
- [CSV coverage matrix](COVERAGE.csv)
- [Build/runtime provenance](PROVENANCE.json)
- [Prioritized findings](FINDINGS.json)

From the repository root with the local audit app/database running:

```powershell
node --env-file=.env.audit --import tsx scripts/audit-diagnostic-interactions.ts
node --env-file=.env.audit --import tsx scripts/audit-diagnostic-recovery.ts
```

These commands create fresh disposable audit data; they reject databases other than the named local audit instance.
