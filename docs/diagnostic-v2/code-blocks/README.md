# Selectable code blocks and deferred results — 31 October 2026

The supplied 22-page Screenshot (91).pdf was rendered and visually inspected in full. Its relevant interaction is an editable region embedded in code, a context-specific choice palette, navigation between editable regions, and a reset action. This implementation uses that interaction pattern with original SkillSetu workplace content and branding. The reference's correctness banners, explanatory chat and runtime output are not copied: the founder explicitly requested results only at completion. No third-party artwork, questions, code or branding is included in the product.

## Learner experience

A new diagnostic begins with a code-block task. Click or tap an outlined blank inside the code to choose the active region, then choose its code chip. The selected chip appears in the original line. Previous/next blank, clear blank and start over work without submitting. Native buttons support keyboard and touch. Each palette is labeled for its active blank; focus and active selection are visible. Multi-blank answers must be complete before submission; an explicit unsure response is available. Partial block selections save and restore through the existing draft/local-storage path.

The post-submit screen is now a neutral receipt with the same copy, color state and thinking companion for either outcome. There is no correct/incorrect banner, grade animation or per-response correctness flag in the public API. Selection rationales exposed during the attempt are neutral; detailed adaptive rationales remain stored privately. Worked explanations and outcomes are available only once the report has been sealed at completion. The final evidence review includes the learner's assembled code for block tasks, alongside the existing matched/not-matched labels, assistance status and explanations.

The assessment remains adaptive with the existing 18 minimum / 24 target / 30 maximum policy and three-response competency coverage. Completing all questions means finishing the selected adaptive run, not being forced through the whole 60-item bank. Assistance still does not earn independent assessment credit. All claims remain preliminary.

## Bank, grading and history

New published bank: `python-adaptive-blocks-3.0.1`, engine `rules-3.0.0`. It retains the prior 48 reviewed-v2 items byte-for-byte at the question-object level and adds twelve original code-block items, two per competency. Single-, two- and three-blank tasks cover boundaries, filtering, retries, dictionary absence, aliasing, default arguments, return/mutation contracts, exception scope, cleanup, type/range gates and independent test expectations. Distractors represent specific alternative contracts rather than typography errors.

Every slot publishes its label and available code pieces with opaque stable identifiers. The expected slot-to-piece map remains server-only. A bounded answer payload contains slot/piece IDs, not learner-executed Python. Incomplete, extra-slot, unknown-piece and mixed-control submissions are rejected; unsure is explicit and is not graded as a match. There is no eval, learner interpreter execution or output-based coaching in this component.

No SQL migration is required: snapshots and answer payloads already use JSON strings. Earlier bank files, applied migrations, snapshot rows, completed reports, learner responses and learning progress are not rewritten. Both v1 and v2 snapshot continuation are covered. Public receipt/rationale suppression intentionally applies to active historical forms as well; their stored grading and sealed reports remain unchanged.

A saved active attempt stays on its original bank. The resume screen now includes a bookmark and **Start a new diagnostic (keep this attempt)**. That explicit action creates the current form while preserving the prior attempt. It uses the originating attempt ID under the existing session transaction lock; concurrent retries return the same new run. Foreign originating IDs are rejected. Existing clients without the new optional field retain the previous resume/idempotency behavior.

The initial 3.0.0 candidate was staged only in disposable tests. Author review corrected the cleanup task's Python function context by publishing bank 3.0.1 with a new cleanup item ID/version. The earlier test bank/snapshots were retained rather than mutated or reset. No such candidate was deployed.

## Validation

- Typecheck and repository ESLint passed.
- Full final Vitest run: **134/134 tests, 12/12 files, 58.59 seconds**. Includes every new item's piece grading, malformed contracts, forged payloads, profile bounds, private feedback, delayed reports, restart ownership/idempotency, historical snapshots and all existing integration/migration tests.
- Static Python AST parsing: **120/120 authored slot combinations across 12 items** parsed successfully. This was syntax-only inspection of authored content; no learner code or snippet was executed. Engineering review is not independent educator sign-off.
- Production build passed through the supported npm command with `VERCEL=1`, explicitly skipping migrations/seed. Runtime uses the ignored local `.env.audit` and disposable `skillsetu_audit` database on 127.0.0.1:15432.
- **Eleven distinct Chromium/Edge browser checks passed.** First combined pass: ten passed, one test incorrectly clicked an intentionally disabled reset after clearing the only slot. After correcting that test and adding an assembled-code report assertion, the two affected files passed **7/7 in 1.6 minutes**. The four unchanged compatibility/layout/motion checks had already passed on the same product build. The final success is the combined distinct-check coverage, not a claim of a single eleven-pass invocation.
- New browser sweep exercised all twelve block items, every displayed piece for every slot, every blank navigation boundary, clear/reset, unsure, keyboard activation, partial draft/resume, correct and deliberately mismatched submissions. It checked private stored grades while asserting that public responses expose no correctness or answer key before completion. Tests alternate desktop 1440x1000 and mobile 390x844; actual animation/reduced-motion and the existing 320/1024 layouts also pass.
- Correct and incorrect submissions use identical neutral receipts. Natural strong/struggling runs reach complete reports. The end-only evidence review displays assembled code without placeholder markers. Starting a fresh form and reopening the saved attempt preserves its original draft.
- Desktop, mobile, neutral-receipt and final-review screenshots were visually inspected and are retained under previews/.

An initial immutable-response test used arbitrary text for a block item, so validation rejected it before the intended immutable-response check; the test was changed to a valid unsure payload and the full suite then passed. No grading rule was weakened. An initial local helper export used the wrong relative import; that authoring helper was corrected before syntax inspection. These harness errors did not change learner data.

## Operation and remaining review

Local preview: http://localhost:3002/diagnostic-v2. Refresh an existing tab; resume the old attempt or explicitly start the current form while keeping it bookmarked. Build/source hashes and the published version are recorded in BUILD_PROVENANCE.json. Production deployment/commit parity was not inspected; no behavior is attributed to the live Vercel build. No push, merge, deployment, production database operation or schema reset occurred.

The earlier interaction audit describes reviewed-v2 and its former feedback policy; it is historical evidence, not a claim about this new form. Its known legacy boundary/localization/scratch-state issues and generic lesson fallback are outside this focused change. The new block composer derives selection from the saved answer itself and has its own resume tests. Remaining gates are independent educator review of new keys/distractors, a learner usability pilot and a full screen-reader review. No load-capacity claim is made.
## Rollout and rollback notes

Before any deployment, obtain educator review and a small learner usability pilot, then verify the intended deployment's commit and bank ID. Keep readers for rules 1, 2 and 3 enabled. To roll back new starts, stop routing fresh sessions to the new form while retaining the rules-3 reader and immutable bank row for in-flight block attempts; a blind reversion to a reader that only knows rules 1/2 would require recovery for those attempts. No migration reversal, history deletion or bank-content rewrite is appropriate. This task stops at local implementation and verification.
