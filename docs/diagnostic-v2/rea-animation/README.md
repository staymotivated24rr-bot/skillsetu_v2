# REA installation and animated diagnostic

## Installed and actually executed
Official package `rea-agents@6.8.0` was verified against morluto/rea package metadata and installed with an isolated `node-win-x64@24.22.1` runtime. REA's version command reports the runtime requirement satisfied. The tool was acquired in a trusted temporary directory, then moved into the ignored `.env.local-runtime/rea-runtime` installation. SkillSetu's dependencies, lockfile, system Node and global PATH were not changed. Install scripts were disabled; verified browser workflows work without native reverse-engineering providers.

Run from this checkout:

```powershell
powershell -NoProfile -File scripts/rea-local.ps1 --version --json
powershell -NoProfile -File scripts/rea-local.ps1 capture-browser-scenario docs/diagnostic-v2/rea-animation/scenarios/question.json --json
```

This uses the actual REA CLI, not a simulated tool or renamed Playwright script. No global Codex MCP registration was changed; no restart is needed for these CLI workflows. Other checkouts need their own reviewed installation. Installation/version/integrity are recorded in INSTALLATION.json.

## Actual evidence
REA captured the authorized disposable local app at http://127.0.0.1:3002/diagnostic-v2 in provider-owned, fresh browser profiles. Intro, question and one-response feedback captures include DOM, accessibility and viewport screenshot artifacts. Cookies/storage contents and network bodies were not requested. Only synthetic QA identities were created. No Brilliant authenticated session, source, private API or subscription was accessed.

EVIDENCE_INDEX.json identifies five successful captures and two successful comparisons. The original evidence JSON and extracted screenshots are retained under evidence/. Comparison inputs use the normalized_result of each original Evidence, as required by the installed CLI. Intro comparison ev_c8513f549f240431c92eaa3bc24f70abce84e0023250f63690a47df310a9e423 reports aligned steps and changed DOM/accessibility/screenshot artifacts. Question comparison ev_9da091fd0211a7a0f55e7913dd145c0015aecb608060fc84c178ac703967efe2 also reports aligned steps and changed artifacts. Feedback capture ev_038e36e5cb440ac3f790071b3a03da0a599269588ce59818f050b3ca1f2ccbad completed every declared step, including a real saved first response.

Observed before: static course outline, no study character, large text/radio/fragment surfaces. Observed after: original Orbit SVG companion, active path node, lesson thinking-space guide and distinct saved-response feedback. This evidence guided the UI priorities: animate source-state transitions, emphasize actual saved progress, preserve clear controls, and keep assessment policy outside the reward layer. REA reports observed browser artifacts, not educational validity or a judgment of design quality. Screenshot differences alone do not prove animation; dedicated browser tests sample computed transforms over time.

## UI changes
Original SkillSetu Orbit companion floats, blinks and reacts to matched/exploratory feedback. Course nodes enter in sequence; selected choices respond; state cards reveal new transitions; a candidate-stop dial follows the learner's control; saved-feedback badges and a brief particle burst celebrate a saved matching task. No invented XP/streak, extra ability credit or hiring score. Motion is disabled with prefers-reduced-motion. Candidate controls and grading keys are unchanged; no learner text is executed. All published banks, engine rules, immutable reports, ownership and assistance flags remain unchanged.

The supplied Brilliant PDF informs broad learning patterns; no Duolingo owl, Brilliant mascot, proprietary questions, code or assets were copied. REA inspected SkillSetu, not third-party internals. Its captures cannot establish Brilliant's animation timing, adaptation or grading.

## Verification and limits
Existing six diagnostic browser journeys passed after the animation changes. Two new desktop/mobile video tests passed after installing Playwright's isolated FFmpeg helper: actual SVG transform changes over a timed sample, matched-feedback animation, reduced-motion cancellation, no overflow, one saved response, no completed report after one response and no fabricated assistance flag. Lint, types, production build and pure engine/contract checks run separately; final full-suite results are appended after completion.

Initial issues corrected: the latest upstream docs mention validate-browser-scenario, absent from installed 6.8.0; no validation success is claimed for it. The CLI's --schema described its outer argument, not nested scenario fields, so the installed schema was inspected. Comparison initially received the outer Evidence envelope and correctly rejected it; normalized captures then succeeded. Video setup initially failed because FFmpeg was absent; the helper was installed and both affected tests reran successfully. No test was skipped to hide those failures.

No production deployment, merge, push or production data change. A clean locked reinstall and formal assistive-technology review remain separate release work. Browser captures are scoped observations, not proof of complete runtime coverage, correctness under all failures, 10,000-user capacity or psychometric validity.

Sources: official [REA repository](https://github.com/morluto/rea), [CLI guide](https://github.com/morluto/rea/blob/main/docs/cli.md), [browser observation](https://github.com/morluto/rea/blob/main/docs/browser-observation.md), [scenario contract](https://github.com/morluto/rea/blob/main/docs/browser-scenario-contract.md). Runtime behavior above was established by executed local commands, not inferred from those pages.

Final verification: all 113 unit/integration tests passed in 55.96 seconds on disposable audit data. Six existing diagnostic browser tests passed with the animated components. Both new motion tests passed after video-helper installation and passed again on the final saved-label build (6.9 seconds), asserting real transform changes and reduced-motion cancellation. Final lint, typecheck and production build pass. No grading/bank/schema/service source files changed. The final single-response badge uses singular wording; the earlier REA feedback capture predates that copy-only correction. Final screenshots/video under previews/ show the corrected build. Installed app dependencies remain the previously tested local versions; a clean locked reinstall is not claimed.
