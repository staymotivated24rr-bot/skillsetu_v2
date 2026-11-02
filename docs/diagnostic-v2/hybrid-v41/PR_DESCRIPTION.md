# Version the eight-area hybrid selector and separate uncertainty from errors

An unsure-only v4.0 attempt can produce likely gaps after 24 responses, and exact distractor labels often cannot connect different families. Fresh draft runs now use v4.1 evidence replay, separate unsure outcomes, independent difficulty streaks, balanced coverage, related-family probes with contrasting evidence and run-ID-seeded tie-breaking. Post-24 investigation can resolve uncertainty or stop honestly at 30. Reports retain difficulty-specific successes/misses and preliminary hypothesis status without a readiness percentage.

Existing engine versions, immutable banks, saved attempts and sealed reports are preserved. The existing transaction, ownership, idempotency, draft/resume and final-only answer-review paths remain in use. No migration is required; the run UUID supplies the seed and engineVersion pins behavior. The new engine remains behind the existing local draft gate.

Validation: 178 unit/integration tests, 16 distinct relevant Chromium/Edge journeys, lint, TypeScript and production build passed. See TEST_RESULTS.md for exact commands, split runs and limits. Educator approval, real-learner calibration, full curriculum/accessibility coverage and measured load remain release gates. This description is prepared locally; no remote push, PR, merge or deployment was performed.
