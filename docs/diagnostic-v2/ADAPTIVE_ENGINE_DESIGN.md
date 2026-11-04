# Explainable rules engine 1.0.0

Implementation: `src/lib/diagnostic/{types,engine,python-bank,service}.ts`. Pure selection/grade/report functions do not query the database, run learner code, use randomness or depend on a provider. Engine version and content version are separate. Current Python bank: `python-adaptive-1.0.0`.

## Evidence model

A question measures one primary competency, includes a 1/2/3 authored difficulty, interaction type, original prompt/code/context, explicit accepted answer(s) or exact sequence, likely misconception tag, hint, explanation, accessibility label, estimated seconds and question version. Competencies declare subskills, prerequisite IDs and existing SkillSetu skill/module IDs. New banks can use different competencies with the same selector. Publication validates bank lengths, identifiers, task keys, coverage and acyclic prerequisites; invalid authored banks cannot start a run.

A response stores original normalized answer, correct boolean, assisted flag, position, timestamp and the selection rationale that led to it. These are observational labels, not item-calibrated probabilities. Hints cannot be “un-used”. No lesson, reward or prior attempt contributes proficiency credit. Previous completed report can route the first reassessment task toward an unresolved competency; the new evidence starts empty.

## Selection policy (ordered)

1. Reject duplicate/unknown evidence IDs. At maximum length, stop with explicit unresolved-evidence language.
2. After minimum length, stop early only if every mandatory competency has three responses and a consistent preliminary finding.
3. At/after target length, stop once coverage is complete and every unresolved competency has at least five unaided investigations. Otherwise continue to the cap. Target is not a forced stop.
4. Filter all previously answered IDs out of the bank.
5. Compute coverage deficit = sum(max(0, three minus count)). When remaining cap equals the deficit, select an uncovered competency; this reservation prevents one difficult topic consuming the whole run.
6. After an incorrect dependent task, investigate an under-covered prerequisite if one has an unasked question. A prerequisite probe investigates a hypothesis; it does not assign blame or credit.
7. Otherwise, stay on the previous competency until its minimum three responses are collected. A correct response asks for deeper verification; an incorrect one seeks an easier, different item.
8. Otherwise rank competencies by under-coverage first, unresolved evidence second, response count third; authored order breaks ties. Settled competencies yield to unresolved ones. If unresolved topics exhaust their content, unused settled-topic items can fill the minimum; no unsupported proficiency claim is added.
9. Within the selected competency, desired difficulty is two initially; after an unaided correct response, previous difficulty +1, and after incorrect or assisted work, previous difficulty -1, clamped to 1–3. Rank by distance to desired difficulty, unseen interaction type, then stable question ID. Requested difficulty may be unavailable; rationale records requested level and prior count and the chosen question preserves its actual level.
10. Return one question ID and a human-readable rationale. Persist both in the same transaction as the preceding response.

The Python bank has six competencies × six authored items (two at each level), so it supplies 36 items for an 18–30 response run. Strong paths challenge further with a workflow and applied fragment; weak paths use a foundational decision and trace. Paths are actually different question sequences. Coverage reservation and deterministic mixed trajectories are tested, including 120 seeded response patterns.

## Descriptive findings

Unaided means no process hint used. It does not establish proctoring or absence of outside help.

- **Demonstrated strength:** at least three unaided responses, at least two interaction types, all unaided responses correct, including at least two at difficulty ≥2. It is explicitly preliminary.
- **Likely gap:** at least three unaided responses across at least two types, at most one correct. A misconception tag is an authored hypothesis, not a model-derived diagnosis.
- **Insufficient evidence:** every other case. Includes hints, sparse evidence, foundation-only success and inconsistent performance.

Raw counts, unaided count, unaided correct count and type diversity appear in the report. No percentage implies psychometric precision. These intentionally conservative authored rules need practitioner/pilot review; they are not confidence intervals, standardized cut scores or calibrated mastery estimates.

## Grading policy

Predictions and bounded code completions use exact, trimmed authored strings with explicit accepted alternatives; case and internal whitespace remain significant. Decisions compare an in-range index. Ordering requires a complete unique permutation and exact authored workflow order. No partial credit in this pilot. Invalid modality, unknown fields, duplicate step IDs and excessive input are rejected. “Unsure” is valid text evidence with no match. Equivalent unlisted code fragments can be rejected: this limitation is disclosed and needs content review/appeals before broad use. The system never evals, shells out, imports or executes this answer text.

Immediate feedback states only whether the response matched this task. Detailed explanations and misconception hypotheses are held until completion to reduce coaching. Feedback and fixed-bank exposure can still change later performance; alternate forms and field validation are required before stronger claims.

## Preservation and reporting

Start registers immutable content in existing AssessmentBank with its digest. A conflicting payload under the same bank ID fails closed; use a new ID/version. Each run also stores the bank snapshot, SHA-256 digest and engine version. Read/submit verifies integrity and requires a supported engine version; future engine releases must retain a version dispatcher before upgrading live pilot runs. No silent regrading.

A row lock serializes responses, hint updates and draft writes. Answer insertion, next selection, current-question update and final report snapshot commit atomically. Exact duplicate answer payloads are idempotent, even for the final response; a changed answer is rejected. Final reports are serialized at completion. Learning order traverses prerequisites before weak/uncertain dependents; a demonstrated prerequisite is not redundantly assigned. Reassessment never averages away a weaker new result or overwrites history.
