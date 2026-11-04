# Reusable Python visualizations — Phase 5

Implemented locally on `codex/python-learning-visualizations`, 3 November 2026. This adds reusable instructional interactions to the existing Learning Studio; it does not replace the lesson engine or diagnostic.

Route: **http://127.0.0.1:3007/diagnostic-v2/learn/visualizations**. Both existing lesson runners link to the visualization studio, which links back to the full variables lesson and reviewed guided Python practice.

## Four original authored models

All traces use content version `1.0.0-draft.1`. They are explicitly labeled **deterministic authored simulations, not output from executing Python**.

| Stable trace ID | Reusable interaction | Teaching focus |
| --- | --- | --- |
| trace-rebinding | Variable state tracer | Assignment, saved values and rebinding; final values saved=8, score=13 |
| trace-list-alias | List/reference/mutation visualizer | Shared list A, mutation through an alias, shallow copy B and independent append |
| trace-loop-total | Loop iteration visualizer | Running total, repeated header/body steps, exclusive range stop and exhaustion |
| trace-function-return | Function call/return visualizer | Definition vs call, parameters and locals, pending return and caller assignment |

Each uses the same exported `PythonTraceVisualizer`, public frame contract, bounded cursor/replay state and server projection. The renderer handles variables, references/objects, iteration indicators, call frames and output as optional state regions. Code lines are numbered; the last modeled line has a visible highlight and `aria-current="step"`. Initial state has no highlighted executed line.

Next/Previous are manual. Predictions gate an unrevealed transition; both matching and differing predictions reveal an instructional explanation. Previously revealed states can be reviewed without another attempt. Reset clears revealed future frames, selection, feedback and errors, aborts an in-flight request and rejects late responses using a generation guard. Replay starts from step zero and requires predictions again. There is no autoplay, flashing or motion-dependent meaning.

Native buttons/radios provide Tab, Enter/Space and arrow-key access. Live explanations announce state changes. Layout switches from two columns to one; code, values and output retain whitespace and wrap at small widths. Controls have visible focus and touch-sized targets. Reduced-motion rules disable animation/transition inside the workspace. Existing Orbit is reused in the studio shell.

## Contracts and reuse

- `src/lib/learning-studio/trace-types.ts`: key-free public trace/frame/prediction/reply types.
- `trace-content.ts`: private, original versioned authored models and prediction contracts.
- `trace-model.ts`: bounded schema/invariant validation, one-frame public projection, prediction evaluation and version checks. It contains no Python interpreter or learner-code execution.
- `trace-state.ts`: pure client cursor, selection, reveal acceptance, previous/next review and reset functions.
- `src/components/python-trace-visualizer.tsx`: reusable renderer and cancellation-safe fetch lifecycle.
- `python-trace-visualizer.module.css`: scoped responsive, focus and reduced-motion styling.
- `python-visualization-studio.tsx`: catalog/session shell using existing learning session conventions and Orbit.
- `src/app/diagnostic-v2/learn/visualizations/page.tsx`: local-gated entry; only whitelisted catalog metadata is serialized.

To author another trace, add a new stable ID/version to the private catalog, define code lines and bounded frames, validate reference/variable consistency and attach prediction contracts to target frames. Never change an immutable published lesson/bank to add it. The studio catalog is derived from whitelisted IDs, kinds and titles. A future lesson adapter can obtain a `PublicPythonTrace` from `trace-open` and render `<PythonTraceVisualizer key={trace.id + '@' + trace.version} trace={trace} />`; private content modules must never be imported into a client component.

## API and answer privacy

The existing `/api/diagnostic-v2/learning` route now accepts two strict actions after its existing Origin/Host, content type, streaming size, local feature and diagnostic-session checks:

```json
{"action":"trace-open","traceId":"trace-rebinding"}
```

```json
{"action":"trace-next","traceId":"trace-rebinding","version":"1.0.0-draft.1","index":1,"selected":0}
```

`trace-open` returns step zero. `trace-next` returns one requested authored state; a challenge requires an in-range selected option. A wrong prediction supplies feedback and lets learning continue. Invalid/missing choices, invalid indices, unknown IDs, version mismatch, extra fields and code payloads are rejected. Public projections contain the current state, full instructional code and the next prompt/options, **not** private correct-option indices, future frames, authored keys or private feedback. Feedback is returned after a valid prediction attempt.

The trace API is a stateless instructional projection, not a secure assessment progression protocol. A modified client can request authored states; no completion, independent proficiency or mastery claim is based on these requests. The UI enforces sequential predict/reveal, but this is not proctoring or authenticated execution evidence.

## Identity and persistence

The existing validated V2 cookie is reused. An explicit practice-name entry creates a V2 session through the existing enter action when needed. Legacy demo identity is not read, merged or credited. Trace opening/revealing writes no assessment or learning evidence, plan, mastery, answer or progress records. Exploration is deliberately ephemeral and resets on refresh; existing full lessons retain their independent validated persistence/resume behavior. No schema migration, second application database or competing learning service was added.

## Execution boundary

These authored visualizations do not execute Python at all. There is no arbitrary code input or execution action in their API. Real Python remains exclusively in the existing reviewed opaque-origin iframe/Web Worker system, using pinned local Pyodide assets. Sandbox source, CSP/network restrictions, timeouts, worker lifecycle and TaskResponse implementation are preserved by hash.

Browser regressions compare the four models with actual Python reference values **inside that sandbox only**. They also exercise the actual guided runner's five-second infinite-loop timeout and iframe removal on navigation/cancellation. The existing sandbox regression retains unsafe import/file/environment/network rejection and recovery checks. No learner code is executed in Node, Next.js routes, shell or PostgreSQL.

## Isolation and verification

The previous isolated cluster was stopped at the start of verification. It was restarted on loopback port 15434 without reset or reseed. A repeated run then exposed a prior Phase 4 fixture that had added a global synthetic skill/lesson, breaking the seed-count test on subsequent runs. That fixture now uses existing seeded metadata and explicitly prepares its isolated seed. No old fixture or learner record was deleted.

Final verification uses a new disposable **skillsetu_visualizations_test** database on that same isolated cluster. The previous `skillsetu_variables_test`, isolated development store and original application/diagnostic stores remain intact. Existing checked-in migrations and fictional seeds were applied only to disposable test storage. The preview uses the existing `skillsetu_studio_dev` store; no production/shared storage is used.

The first browser run issued invalid-input checks before the practice-name request committed its session cookie, receiving the expected unauthenticated 401 rather than the later 422. The test now waits for the workspace before authenticated validation checks. This was a test timing correction; session checks were not weakened.

Final results/build/source hashes are recorded in `VERIFICATION.json`. New suites are `tests/python-traces.test.ts` and `e2e/python-visualizations.spec.ts`. The earlier pathway service test has the fixture-only repeatability repair described above. Lint, TypeScript, guarded production compilation, all unit/integration tests and relevant browser journeys are run against the isolated environment. The build uses the unchanged generated Prisma client with database writes disabled by the existing build-setup guard; Windows DLL locking from other servers remains the previously documented regeneration limitation.

| Verification | Final result |
| --- | --- |
| Full unit/integration | PASS: 225/225, 26 files, 112.99 seconds |
| Repeated seed/migration and trace-contract check | PASS: 7/7, 21.07 seconds; no extra global lesson fixture |
| Combined Chromium regression | PASS: 29/29, 3.8 minutes, no skips |
| Final six visualization cases after presentation review | PASS: 6/6, 43.3 seconds |
| Lint / TypeScript | PASS after final changes |
| Guarded production compilation | PASS; build `UODOQoz0tw40BcCJVfbmU` |
| Desktop / 390px / 320px | All four traces completed, reviewed and reset; no horizontal overflow |
| Actual browser Python | Four reference-value comparisons, five-second timeout, navigation cancellation and existing sandbox security regression pass |
| Protected assessment/sandbox/schema/lesson contracts | 39 files unchanged by hash, plus unchanged sandbox API hash |
| Existing report PDF | Five A4 pages rendered and visually inspected |

The final presentation-only review set a light native-control scheme, a visibly distinct selected-option background/border, and generic iteration/reference labels. The final six-case rerun exercises that compiled renderer; the combined 29-case run preceded these small presentation changes. The full suite is not claimed to cover every repository browser file, physical mobile devices, exhaustive assistive technologies or measured load.

## Limits and handoff

Only these four authored examples are supported. This is not a general-purpose Python debugger, instrumenter or memory-address inspector. Trace labels and function values are symbolic teaching representations. A future live-code visualization must go through the reviewed sandbox and a separate instrumentation review, with no external learner-code network access.

Content and instruction need independent educator review before public rollout. Browser accessibility checks do not replace assistive-technology and real-device review. No load/capacity claim is made. Dependencies and assessment grading/banks are unchanged; earlier optional/development security findings remain documented separately. No push, PR, merge or production deployment was performed.

Screenshots in `screenshots/` show synthetic instructional state only, including reference maps and predict-before-return call frames at desktop and mobile widths.
