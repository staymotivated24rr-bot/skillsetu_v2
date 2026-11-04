# Stage the versioned 360-question Python diagnostic behind a local-only gate

The existing diagnostic has six competencies and cannot directly consume the supplied eight-area V3 bank or distinguish malformed numeric input from a scored answer. Add a separate immutable draft import and adapter, numeric decimal-string contracts, balanced eight-area coverage, repeated-evidence difficulty adjustment, family exclusion and cautious option-hypothesis tracking. Keep the existing bank and design as the default, retain historical snapshots and completed-only answer review, and add personalized recommendations with short practice starters.

The new bank uses 24/24/30 because eight competencies require at least three observations each. Five separately versioned engineering clarifications address ambiguous source stems/options; the original JSON is retained. All 360 items remain unapproved and the feature stays off by default. Local preview requires explicit flags plus a loopback database; hosted Vercel environments fail closed. No migration is needed.

Validation and remaining risks are recorded in README.md and TEST_RESULTS.md. Subject-matter review, real-learner pilots and measured rollout remain release gates. No production data change, remote push/PR, merge or deployment is part of this local task.
