# Diagnostic v2 — milestone contract

Goal: help a learner determine what they can demonstrate, which concepts need attention and what to learn next. This pilot is an isolated, preliminary Python diagnostic, not a hiring score or validated certification.

## Delivered boundary

`/diagnostic-v2` and `/api/diagnostic-v2` require server environment `DIAGNOSTIC_V2_ENABLED=true`. Default is off; the original Data Analyst, Python and Java journeys remain intact. Pilot identity is separate from the legacy demo. No automatic deployment, production data migration or merge is part of this change.

The learner enters a nickname, receives a mid-level first task, answers using a code trace, bounded code fragment, ordering or decision control, receives neutral match/no-match feedback, and gets an actually selected next item. Required coverage, repeated evidence and length rules govern completion. A reload resumes the current server-selected task. Submitted answers, drafts, hint usage, selection rationale and reports persist. A new diagnostic never rewrites the prior report. The latest owned run loads by default; a `?run=<id>` bookmark reads an older owned run.

Reports show role, measured competencies, counts, unaided matches, task diversity, preliminary strengths, likely gaps, uncertainty, prerequisite relationships, learning order and original existing SkillSetu module introductions. Explanations and possible misconception tags are deferred until completion. Lessons cannot update diagnostic evidence. A fresh diagnostic is available, with explicit small-bank familiarity limits.

## Policies

| Role | Minimum | Target | Maximum | Milestone status |
| --- | ---: | ---: | ---: | --- |
| Python Developer | 18 | 24 | 30 | Implemented for six foundation competencies |
| Data Analyst | 18 | 24 | 30 | Blueprint only; existing track preserved |
| AI Engineer | 24 | 30 | 36 | Blueprint only; no active role registration |
| Java Developer | Existing policy | Existing policy | Existing policy | Existing track preserved |

These lengths are product defaults, not scientific thresholds. Target is a review checkpoint, not a fixed number of questions. A single correct or incorrect answer cannot establish proficiency. All conclusions require repeated unaided evidence across task types. Mixed, assisted or too-easy evidence can remain insufficient at the cap.

## Interaction and acceptance requirements

- Distinct response patterns must yield different question IDs and difficulty trajectories.
- Mandatory competency coverage: at least three responses per competency before normal completion; cap must reserve capacity for uncovered competencies.
- No item repeats within a run; a network retry returns the already stored result.
- Authoritative grading is server-side; no score, correct flag or browser execution transcript is accepted from clients.
- A failed save retains controls/answer and can be retried. A successful save atomically advances or completes.
- Native controls, keyboard selection, focus management, text status, reduced-motion handling and 390px rendering are required.
- Existing historical attempts, immutable banks, role definitions and lesson progress remain valid.

## Explicitly not implemented here

Real public accounts, institutional access, psychometric validation, broad Python proficiency certification, arbitrary Python code grading, AI-generated grading, dashboards/XP/streak rewards for this pilot, new Data Analyst/AI Engineer banks, mobile native apps, production deployment and a measured capacity claim. See NEXT_MILESTONES for release gates and TEST_RESULTS for actual execution evidence.
