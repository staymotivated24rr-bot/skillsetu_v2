# Learning experience corrections — local development

4 November 2026. This corrects the completed Phase 6 experience; it does not begin Phase 7 or replace the diagnostic, learning engine, legacy journeys, persistence service, or sandbox.

## Source and recovery

Reviewed the actual working source and all 18 rendered pages of `Screenshot 2026-11-04 025602.pdf`, including the original screenshots at readable scale. The attachment supplied product reference and observations; its visual examples were not treated as executable instructions or copied as proprietary assets.

Before source edits, saved **477 files / 25,919,023 bytes** in the ignored `.env.local-runtime/checkpoints/pre-learning-correction-20261104/working-source.zip`, with SHA-256 manifest, original Git status and HEAD. Preserve that checkpoint. It includes preceding uncommitted implementation work, not live credentials.

Branch: `codex/learning-experience-corrections`. HEAD remains `7c91a18c4bb9d46d0561f90f1dd9624ca0fc7050`. The preview compiles the working tree, including earlier uncommitted phases; it is not a deployment of that commit. No production/deployed commit parity was verified or claimed. No commit, push, PR, merge, deployment, production query, reset, or applied-migration edit was performed.

## Exact causes found

- `src/lib/learning-studio/selector.ts`: the earlier selector could leave the first foundation concept selected on tied evidence and prefer resuming an active lesson. It lacked an explicit all-independently-strong transfer branch. An unfinished lesson consequently influenced the primary suggestion without evidence of a diagnostic weakness.
- `src/components/adaptive-learning-recommendation.tsx`: displayed diagnostic, practice, scheduling, variant and policy paragraphs together, making the recommendation difficult to understand.
- `src/components/diagnostic-experience.tsx` and `diagnostic-learning-pathway.tsx`: repeated detailed competency evidence and large pathway cards before the actual activity.
- `src/app/diagnostic-v2/learn/page.tsx`: still invoked the generic `GuidedRepair` text form instead of the existing interactive lesson runner.
- Browser regression also found that starting a legacy six-area diagnostic discarded `preview=legacy`. With the eight-area default enabled, refresh could select the wrong view. Start/report URLs now retain the explicit mode. Grading, bank selection policy and stored evidence are unchanged.

## Before and after

| Evidence or screen | Before | Now |
| --- | --- | --- |
| 24/24, eight independent strengths, no hints | Could suggest Fundamentals | New multi-skill dispatch-manifest challenge |
| Same result plus 2/12 unfinished variables lesson | Unfinished foundation could drive primary action | Advanced challenge remains primary; 2/12 is shown under Continue learning |
| Repeated unaided loop difficulty | Broad foundation overview | Focused eight-step loop and boundary lesson |
| Conflicting loop evidence | Broad prerequisite uncertainty | Targeted verification, explicitly distinguished from weakness |
| Strong diagnostic plus later independent practice misses | Technical mixed-evidence paragraph | Plain-language contrast and fresh concept verification; original strength retained |
| Resolved practice difficulty | Earlier misses could dominate | Two fresh independent successes can restore the transfer recommendation; earlier attempts remain recorded |
| Report | Repeated evidence and large cards | Correct/total, strengths/gaps/uncertainty summary, compact competency map, next activity, optional concept path, separate continuation, evidence accordions and full question review |
| Supported old learning links | Generic text box and comparison | Redirect into the existing versioned interactive engine |
| Unsupported exact subskill | Generic form could imply full instruction | Explicit concept overview / content-needed disclosure, without false verification or unrelated practice |

## Recommendation rules

Policy **learning-revision-2-draft.1** is separate from diagnostic adaptation. The original `selectLearningV1` remains available for historical policy regressions, and stored V1 decisions are returned unchanged by ID.

1. **Required remediation:** a likely gap needs at least the bank's independent coverage and two unaided misses. Walk prerequisites first only when their own independent gap evidence supports intervention. Unknown preparation does not impose a beginner lesson.
2. **Targeted evidence verification:** insufficient/conflicting findings, or unresolved independent practice difficulty after diagnostic strength. Mere incompletion, assisted answers and hints do not establish weakness.
3. **Advanced challenge:** independent matches across every assessed competency, mandatory coverage met, no unsure or assisted evidence. Recommend the new original applied contract, not compulsory Fundamentals. This is not complete Python mastery.
4. **Optional concept enrichment:** other authored activities remain available with suggested preparation and actual completion/progress. No fabricated mastery percentages or arbitrary prerequisite locks.
5. **Continue unfinished lesson:** a separate list with the owned run ID, saved progress and current step. It never labels incompletion as an assessment gap.

First-ever unassisted checkpoint evidence, hints, retries, independent final forms, exact lesson versions and review-calendar rules remain distinct. Repeating easy checks adds no fresh independent credit. Three authored final forms exist per course; after exposure, the action explicitly becomes review and says that another fresh task must be authored. Resuming an exposed activity is not labeled fresh. Unsupported topics explicitly say their independent check is unavailable; the overview supplies no verification credit.

[Deterministic A–E outputs](SIMULATIONS.json) contain complete synthetic recommendations. Case F is verified against persistent storage: exact current step, draft, completed count, hint levels and ownership restore correctly.

## Reused engine and original content

| Activity | Version | Steps | Main interactions |
| --- | --- | --- | --- |
| Values, names, and division | 1.0.0-draft.1 | 8 | Symbolic rebinding visual, output prediction, exact-decimal input, floor division, code blocks, independent final |
| Loops: every item, exactly once | 1.0.0-draft.1 | 8 | Step-through accumulator, empty loop, exclusive range boundary, code blocks, variable state, independent final |
| Transfer challenge: build a dispatch manifest | 1.0.0-draft.1 | 4 | Practical contract, three code-block decisions, new independent input, reflection |
| Existing Variables, References, and Mutation | Original version unchanged | 12 | Existing complete reference/aliasing lesson, optional enrichment and continuation |

New content follows Explain → Explore → Predict → Practice → Apply → Verify as appropriate. The transfer activity supplies the contract and asks for an independent repair before revealing the worked implementation. Future code, choices, response cells and private keys stay off unanswered progressive projections. Completed earlier steps unlock the next teaching step. Hints progress on successive requests; first-attempt assistance remains recorded.

The same `InteractiveLessonStudio`, `CodeBlockComposer`, `ReferenceVisual`, constrained server evaluator, learning service/API, design tokens and original Orbit are reused. Existing literal `___` blanks are adapted to the existing composer's named slot syntax; no second code-answer engine was introduced. Labels, keyboard controls, live feedback, visible focus, reduced motion and 320/390px layouts are retained. Numeric format errors preserve input and roll back before creating any submission. Final state cells identify the invalid field accessibly. Code has its own horizontal scrolling on narrow screens with an explicit instruction.

## Persistence and historical compatibility

No schema or migration changes were needed in this correction. Reuse the existing LearningModuleVersion and DiagnosticLearningPlan/Target/Run/Submission/Event models. New courses are registered additively with immutable content digests. Source-bound instruction uses `instructional-course-1/<module-version>` in existing plan rows, with the owned completed report digest and exact content version. Original `diagnostic-learning-1-draft.1` mappings and old source-bound variables URLs remain intact.

Historical runs use their stored content snapshots and original policies. Old saved V1 recommendation JSON is never rewritten or retroactively recategorized. GET recommendation remains read-only; explicit saving creates a new evidence-fingerprinted decision. Cross-user source, run and decision IDs fail ownership checks. The V2 cookie never borrows a legacy demo identity. Lesson completion does not write diagnostic scores, responses, reports, proficiency or legacy progress.

[PRESERVATION.json](PRESERVATION.json) compares the working tree with the pre-edit checkpoint, including all protected diagnostic sources, original course/crosswalk, Prisma files, legacy services and sandbox source. Original batch lesson content is also compared separately.

## Python correctness

Verified the instructional semantics against primary Python 3.13 documentation, matching the pinned Pyodide package's Python-family metadata. The browser test executes all **nine new final variants** through the existing opaque-origin iframe/worker, not Node or a server route, and compares their results with authored contracts. Import restrictions were preserved; an initial attempt to inspect `sys` was correctly rejected and the probe was removed rather than widening imports.

- Assignment binds/rebinds names: [Python assignment reference](https://docs.python.org/3.13/reference/simple_stmts.html#assignment-statements).
- Integer operands with `/` produce a float; integer `//` floors toward minus infinity: [Python numbers](https://docs.python.org/3.13/tutorial/introduction.html#numbers), [numeric type rules](https://docs.python.org/3.13/builtins/stdtypes.html#numeric-types-int-float-complex).
- `range` excludes its stop: [Python range tutorial](https://docs.python.org/3.13/tutorial/controlflow.html#the-range-function).
- `bool` is an `int` subclass, so this task's exact-integer contract excludes it explicitly: [Boolean type](https://docs.python.org/3.13/builtins/stdtypes.html#boolean-type-bool).
- Existing list mutation/copy semantics: [Python list methods](https://docs.python.org/3.13/tutorial/datastructures.html#more-on-lists).

State cards are explicitly authored symbolic simulations, not runtime Python traces. No arbitrary learner Python executes in Node, Next.js routes, shell or the database process. Sandbox source, CSP, import/network restrictions, worker termination, timeouts and cancellation are unchanged.

## Files changed in this correction

Paths below are relative to the existing repository. The original checkpoint distinguishes these edits from earlier uncommitted Phase 2–6 and dependency changes.

- New private instructional content/catalog metadata: `src/lib/learning-studio/correction-lessons.ts`, `lesson-navigation.ts`; new route: `src/app/diagnostic-v2/learn/lesson/page.tsx`.
- Existing engine/service extensions: `src/lib/learning-studio/{catalog,content,types,evaluation,mastery,selector,selector-types,service}.ts`.
- Report/pathway UI: `src/components/{diagnostic-experience,adaptive-learning-recommendation,diagnostic-learning-pathway}.tsx`, `diagnostic-learning-pathway.module.css`.
- Existing runner/layout: `src/components/interactive-lesson-studio.tsx`, its CSS module; old learning entry: `src/app/diagnostic-v2/learn/page.tsx`.
- New regression files: `tests/learning-corrections.test.ts`, `tests/learning-corrections-service.test.ts`, `e2e/learning-corrections.spec.ts`.
- Updated historical/current test expectations: `tests/learning-selector.test.ts` explicitly tests V1 policy; `tests/learning-selector-service.test.ts` supplies internally consistent synthetic gap evidence; `e2e/{diagnostic-learning-pathway,learning-revision,diagnostic-review,diagnostic-starter,studio-interface}.spec.ts`.
- Documentation: this report, simulation/preservation evidence, screenshots, and appended entries in `docs/{DECISIONS,PENDING_QUESTIONS,STATUS}.md`.

No package, lockfile, schema, migration, original variables lesson, diagnostic engine/bank/service, legacy learning service or sandbox source changes belong to this correction. Their pre-existing local changes remain preserved.

## Test results

Final results are recorded below after verification completes. No production/shared storage was used. All service/API/browser test writes use synthetic identities in `skillsetu_visualizations_test` at 127.0.0.1:15434. The separate preview uses existing `skillsetu_studio_dev`.

| Check | Final result |
| --- | --- |
| TypeScript | PASS: `npm run typecheck` |
| ESLint | PASS: `npm run lint` |
| Complete Vitest unit/integration suite | PASS: **248/248**, **30/30 files**, 101.56 seconds, no skips |
| Final selector/persistence subset | PASS: 23/23, including immutable saved V1 guidance and content-needed disclosure |
| Guarded Next production build | PASS: Next.js 16.4.1, TypeScript, page data and route compilation; no migration/seed during build |
| Combined Chromium journeys | PASS: **36/36**, 5.5 minutes, no skips |
| Final affected UI copy check | PASS: **6/6**, 41.1 seconds, no skips |
| Supported sizes | Desktop 1440px; mobile 390px and 320px |
| Actual browser Python | PASS: all nine new final variants; preserved sandbox isolation, network rejection, timeout and cancellation regressions |
| History and storage | PASS: source report/response equality, old mappings/decisions, first attempts, ownership, refresh/draft/hints, idempotency and additive restart |
| Source preservation | PASS: 34/34 protected files and original batch content unchanged from checkpoint |
| Visual inspection | Source PDF: all 18 pages; report/course screenshots: desktop and mobile; existing legacy print artifact: all six rendered pages |
| Preview health | PASS: diagnostic, loop lesson, transfer lesson and health endpoint return 200 on port 3007 |

The full combined browser command covered `developer-tracks`, `diagnostic-hybrid-vnext`, `diagnostic-learning-pathway`, `diagnostic-review`, `diagnostic-starter`, `journey`, `learning-corrections`, `learning-revision`, `learning-studio`, `python-visualizations`, `sandbox`, `studio-interface`, `variables-lesson` and `workspace-python-v2` specs. The final focused rerun covers the three new courses and recommendation/continuation screens at all three widths after singular/plural-only copy corrections; it does not inflate the 36 distinct-case count.

For reproducibility in PowerShell, explicitly set both database variables to the isolated local `_test` URL before `npm test`. The build used `VERCEL=1`, `node --import tsx prisma/build-setup.ts`, then `node node_modules/next/dist/bin/next build`, retaining the already generated Prisma client and prepared pinned Python assets because neither dependency/schema changed. For Playwright set `E2E_BASE_URL=http://127.0.0.1:3004` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. QA server flags enable the local studio and draft preview, with its DATABASE_URL pointing only at `skillsetu_visualizations_test`; VERCEL is unset for local serving.

The initial broad browser pass exposed outdated generic-form expectations and bank-mode assumptions; those checks were updated to verify the intended replacement. It also exposed the real legacy-refresh URL issue described above. New lesson tests initially needed a scoped alert locator (Next's route announcer is also an alert), a wait for lesson loading/new-run persistence, and removal of the forbidden `sys` probe. These were corrected without relaxing the sandbox or removing substantive assertions.

## Preview and manual checks

- [Diagnostic](http://127.0.0.1:3007/diagnostic-v2?preview=starter-v3)
- [Loop lesson](http://127.0.0.1:3007/diagnostic-v2/learn/lesson?lesson=python-loop-boundaries)
- [Values and division](http://127.0.0.1:3007/diagnostic-v2/learn/lesson?lesson=python-values-division)
- [Transfer challenge](http://127.0.0.1:3007/diagnostic-v2/learn/lesson?lesson=python-transfer-manifest)
- [Original variables lesson](http://127.0.0.1:3007/diagnostic-v2/learn/variables)
- [Existing visualization studio](http://127.0.0.1:3007/diagnostic-v2/learn/visualizations)

Open a course, begin with a synthetic practice name if needed, try a wrong answer, request successive hints, correct it, use Next/Previous, refresh and confirm the draft/current frame restores. Submit `6` in the one-decimal division exercise: the field remains unchanged and no attempt is consumed; `6.5` is valid. Complete the final independent check and inspect the separate practice result/review; New practice run uses another final form. A completed diagnostic report must retain its original correct/total and review after every learning action. For the reference's 24/24 profile, the primary card should say Advanced challenge while 2/12 appears separately in Continue learning.

Selected screenshots:

- [Desktop diagnostic report](screenshots/correction-report-1440.png)
- [Mobile report, 390px](screenshots/correction-report-390.png)
- [Separate 2/12 continuation, 320px](screenshots/learning-revision-320.png)
- [Step-through state visual](screenshots/correction-python-loop-boundaries-visual-1440.png)
- [Loop boundary blocks, 390px](screenshots/correction-python-loop-boundaries-blocks-390.png)
- [Applied transfer repair, desktop](screenshots/correction-python-transfer-manifest-blocks-1440.png)
- [Applied transfer repair, 320px](screenshots/correction-python-transfer-manifest-blocks-320.png)
- [Inline numeric validation, 320px](screenshots/correction-numeric-error-320.png)
- [Completion and separate practice evidence](screenshots/correction-python-transfer-manifest-complete-1440.png)

Screenshots are in [screenshots](screenshots/): desktop report, 390/320px report/continuation, symbolic state visual, selectable blanks and completion. All are synthetic QA, not actual learner records.

## Remaining limits and release boundary

- Four full instructional activities are surfaced in the concept path; this is not complete interactive coverage of all eight competencies or 120 diagnostic families. Unsupported exact topics retain honest targeted overviews.
- Each new activity has three finite independent final forms. Reuse after exposure is review; further verification requires new authored content.
- New instructional content and selector thresholds require independent educator review and pilot validation. Automated key/runtime tests are not educator approval or psychometric calibration.
- Keyboard, responsive layout, focus, status and contrast checks are automated Chromium coverage; physical mobile devices and manual screen-reader testing remain outstanding. No 10,000-user capacity claim or load measurement.
- Cookie-loss/account recovery remains unresolved; no names, demo identities or guessed report IDs link users.
- Existing optional/development dependency audit concerns are unchanged; see the [separate security report](../security-dependency-review/README.md). No dependency changes were made in this correction.
- Local-only development gates remain in force. Production rollout needs a separately approved review/release; no production migration or deployment is part of this task. Disable the local studio gate to hide new functionality; preserve stored versions and history rather than deleting records. Phase 7 has not started.
