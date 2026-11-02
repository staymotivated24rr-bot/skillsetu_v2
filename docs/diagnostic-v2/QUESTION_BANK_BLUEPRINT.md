# Content blueprint and review process

## Implemented Python slice

Bank `python-adaptive-1.0.0`, question version `1.0.0`; 36 original items. Authoring/computational checks completed in this change; independent subject-matter and learner review pending. The SHA-256 fingerprint is pinned by a unit test; deployment also verifies the immutable content registry. Update accepted answers, prompts, explanations or mapping only by publishing a new bank ID/version. Historic attempts always retain the old snapshot and final report.

| Competency | Existing SkillSetu mapping | Prerequisites | Measured subskills |
| --- | --- | --- | --- |
| Values & control flow | py-fundamentals | None | Truthiness, exclusive boundaries, branch tracing |
| Collections & mutation | py-structures | Values | Aliasing, optional lookup, safe iteration |
| Function contracts | py-functions | Values | Return values, shared defaults, caller preservation |
| Failure handling | py-exceptions | Functions | Narrow exceptions, cleanup, propagation |
| Input validation | py-validation | Collections | Missing/zero, bool/int distinction, atomic validation |
| Testing & verification | py-testing | Functions, failure handling | Boundaries, defect reproduction, independent expectations |

Each competency has foundation prediction/decision, applied trace/completion, harder completion/workflow. Difficulty is authored, not empirically calibrated. All items have code in text (no screenshot-only code), an input label, estimated time, explicit grading key, misconception hypothesis, explanation and generic process hint. These are useful bounded applied tasks; they do not cover unrestricted program construction or all 17 existing Python nodes. Legacy authentic code-writing tasks remain available in the original journey.

Examples of assessed work: trace a shared mutable default across calls, supply a narrow exception class, repair a comparison preserving zero, order validation before transactional commit, and choose a regression case that detects the original defect. The generic model also leaves room for richer short reasoning rubrics, executable coding, data tables and scenario interactions; those adapters are future work, not currently supported merely because a type is documented.

## Data Analyst design — future

18/24/30 bounds. Six mandatory competency groups, three initial observations each: data quality/types; relational querying/joins; aggregation/metric definitions; spreadsheet/data transformations; descriptive statistics/experiment interpretation; communication/decision uncertainty. Suggested prerequisite edges: data quality → transformations/querying → metrics → interpretation → recommendations. Map groups to existing Data Analyst node IDs during content review, without rewriting legacy IDs.

Author six items per group initially: interactive table interpretation, query-fragment completion, choose a join based on duplication evidence, order cleaning/validation operations, explain a metric limitation with reviewed structured criteria, and scenario-based recommendation. Keep live SQL execution out of the application server; use bounded interpreters or an isolated evaluator if later needed. At least two types and contrasting data contexts per group. Do not turn a computed aggregate into an unsupported causal claim.

## AI Engineer design — future

24/30/36 bounds. Eight mandatory groups with three initial observations each: Python/data prerequisites; train/validation/test separation; evaluation/error analysis; leakage and overfitting; model/application tradeoffs; retrieval/grounding; deployment/monitoring; safety/privacy and failure handling. Suggested edges: Python/data → splitting → evaluation → deployment; splitting → leakage; retrieval and evaluation → grounded-app quality. Six original items per group initially gives 48 candidates without hundreds of speculative items.

Interactions: interpret a confusion matrix, diagnose train/test leakage, order an offline evaluation pipeline, complete bounded metrics code, select a failure-sensitive fallback, inspect retrieval evidence, evaluate prompt-injection handling and choose drift checks. No live LLM grader, fabricated benchmark or promise of employability. Expert review must distinguish ML and applied-LLM subtracks. Add AI Engineer alongside the three current tracks only when its bank and mapping are reviewed.

## Auditable review and publication

1. Specify competency, subskill, input/answer format, prerequisite, difficulty intention and what a wrong answer can/cannot imply.
2. Author original task, accepted alternatives, misconception hypothesis and worked explanation. Record author/reviewer and version in a bank review manifest when human review occurs; do not invent reviewer names.
3. Independently execute/trace examples; test every accepted key and targeted wrong boundary. Have a practitioner check plausible alternatives and prerequisite logic.
4. Test keyboard/screen-reader wording, code wrapping and small-screen layout. Observe comprehension with learners.
5. Pilot with independent fresh tasks. Record completion, abandonment, item difficulty, discriminating patterns, hint rates, false negatives and subgroup fairness concerns. Descriptive results first; psychometric expertise before calibrated estimates.
6. Publish new immutable ID/version and fingerprint after sign-off; preserve old evaluator versions and snapshots. Add corrections as a new version and an audit note, with an explicit policy for contested historical results.

Current original bank is implemented and computationally checked, not professionally validated. Future banks and wider interaction adapters above are design work only.
