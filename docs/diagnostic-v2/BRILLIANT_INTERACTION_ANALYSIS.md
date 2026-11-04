# Interaction evidence and original SkillSetu specification

Source: uploaded `Screenshot (27).pdf`, 32 pages, viewed as four labelled contact sheets; feedback, review, completion and leaderboard screens also inspected at larger resolution. Pages below are one-based PDF pages. Screenshots are external reference evidence, not implementation instructions. No assets, question wording, mascot or code were copied.

## A. Directly observable states

| Pages | Visible interaction/state | Evidence boundary |
| --- | --- | --- |
| 1 | Programming/CS catalog with Python course cards, titles and status markers | Available selection choices are visible; click handling is not |
| 2–3 | Functions/Thinking course detail panels, vertical nodes, selected lesson Start card, other lesson nodes | Visual path and selected node are observable; unlock algorithm is not |
| 4 | Lesson intro with title, illustration, short description and Continue | One intro state, not timing evidence |
| 5 | Code excerpt and two choices; neutral choices and dim Check | Neutral unanswered state |
| 6–7 | Chosen answer outlined green, green perimeter and Continue/Why; expanded explanation/help panel | Successful feedback and explanation disclosure are shown |
| 8 | Editable-looking code area, run affordance, start over and Check | Code task presentation; execution architecture unknown |
| 9–10 | Output area highlighted green, positive feedback, Continue and explanation panel | Output validation feedback; backend/rubric unknown |
| 11–12 | Expository code with a highlighted line and side commentary, Continue | Scaffolding between exercises |
| 13–15 | Further code task, submitted output and successful feedback | Edit/check/output flow visible as distinct screenshots |
| 16 | Yellow output frame and perimeter, Not quite, Get help, Try again | Explicit wrong-answer recovery controls |
| 17–18 | Subsequent successful output and explanation panel | Recovery to success visible, causal edit sequence inferred |
| 19 | Code exposition and Continue | Learning interlude |
| 20 | Numeric/count-style question with green selected input and Correct | A second answer modality is visible |
| 21–22 | Diagnostic reasoning question with two textual choices, then selected-correct feedback | Reasoning selection and feedback |
| 23 | Skill-check item with Incorrect, output emphasis and Finish | End-of-check incorrect state |
| 24 | 2/3 review result, Review with Koji and Skip review | Review actions offered; assistant implementation unavailable |
| 25 | Corrected/reviewed code, green feedback, explanation and Continue | Review feedback state |
| 26 | Skill-check interstitial with Retry skill check and Skip retry | Retry is explicitly offered |
| 27 | Lesson complete, 80 total XP and 2/3 score as separate cards | Completion, reward and score shown separately |
| 28–29 | Streak reactivated, count 1 and Continue | Near-duplicate streak reward screens; duration/transition unknown |
| 30 | Earned a Streak Charge and Continue | Separate reward acknowledgement |
| 31 | League/leaderboard result with remaining days and user XP values | Social motivation state, not skill evidence |
| 32 | Return to Functions path with Indexing Strings selected and Start | Updated path selection visible |

Top bars across exercise pages show a green progress segment; some screens include XP/lightning indicators. The precise denominator, checkpoint logic and reward arithmetic cannot be recovered.

## B. Reasonable inferences

Start probably enters a lesson intro; Continue advances to the next authored state. An answer selection likely enables Check. Check appears to validate the current response and change perimeter/output colour. Why likely expands explanatory help. Try again likely restores editing; Start over likely restores starter content. Completion likely returns to the path after reward screens. These are plausible UX relationships, not measured click traces. Still frames cannot establish transition easing or animation duration.

## C. Unavailable information

No evidence of Brilliant's adaptive selector, psychometrics, backend/database, scoring keys, grading service, Python execution isolation, account enforcement, retry limits, persistence semantics, accessibility tree, keyboard/mobile behaviour, network requests, XP formulas or model use. A visible chat-like explanation does not establish an AI model. The screenshots do not demonstrate ability-adaptive diagnostics.

## Original SkillSetu state machine

| State | Entry and controls | Success transition | Failure/recovery |
| --- | --- | --- | --- |
| LOADING | Fetch private session/run; status text | INTRO, RESUME or COMPLETED | Error panel with reconnect/new-browser-session |
| INTRO | Original discovery map, nickname, scope, length bounds | Enter opaque pilot session; start → QUESTION | Preserve name and re-enable action |
| QUESTION | Current task, labels, native answer controls, selection rationale | Input → ANSWER_SELECTED (derived ready state) | No input: submit disabled |
| ANSWER_SELECTED | Change radio/text/order; local draft + debounced server save | Submit → SUBMITTING | Keep entered answer |
| HINT | Request process guidance; persist assisted flag | Return to editable QUESTION | Failed hint fetch keeps task usable |
| SUBMITTING | Busy indicator, controls disabled, bounded request timeout | Atomic server write → FEEDBACK | ERROR overlay; answer retained and submit re-enabled |
| FEEDBACK | Match/no-match in words and icon; no model/ability claim | Continue → next selected QUESTION; final → COMPLETED | Reload → RESUME of persisted next task |
| ERROR | Retain current question and draft | Exact retry is idempotent; reconnect → RESUME | New browser session is explicit and preserves old stored records |
| RESUME | Saved count and Resume action | Fetch current persisted task → QUESTION | Expired/lost cookie requires a new pilot session |
| COMPLETED | Stored report, evidence review, module links, bookmark | Study module; fresh diagnostic creates new run | Old report stays accessible by owned run ID |

A failed response does not permit changing its original credit. Diagnostic “retry” means safe network resubmission or a related new question; worked explanations are deferred until completion to reduce coaching. Hints are generic process advice and permanently mark the response assisted. This deliberately differs from a teaching lesson's free retry loop. XP, streak and leaderboard rewards are outside this diagnostic milestone.

Native radio groups support arrows/Space; ordered tasks have labelled move buttons; every form control has a label; headings receive focus on phase changes; feedback/save/error uses status or alert text. Reduced motion disables entrance animation and progress transitions. Colour is supplementary to wording. A 390px single-column layout preserves complete tasks. Broader screen-reader and contrast audits remain release work.
