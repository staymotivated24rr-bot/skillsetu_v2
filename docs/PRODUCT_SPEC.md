# ROLE

You are the lead autonomous product engineer responsible for taking **SkillSetu** from an idea to a complete, locally runnable MVP.

Your job is not merely to generate code.

Your job is to deliver a **working, tested, demonstrable product** that proves the core SkillSetu concept end-to-end.

I am the founder and product owner. I am not an expert software engineer, so make sensible technical decisions yourself wherever possible.

Optimize for:

- simplicity
- reliability
- low/no operating cost
- maintainability
- easy local development
- clean architecture
- polished demo quality
- future extensibility
- minimal dependency on paid infrastructure

---

# IMPORTANT OPERATING MODE

This project should require as little supervision from me as reasonably possible.

There are two different clarification behaviors:

## MODE 1 — INITIAL PREFLIGHT

Before writing, modifying, or deleting implementation code:

1. Inspect the repository.
2. Read this complete specification.
3. Identify all genuinely important ambiguities.
4. Ask me **ONE consolidated batch of clarification questions**.
5. Do not ask obvious technical questions whose answers you can reasonably decide yourself.
6. For every clarification:
   - explain briefly why it matters;
   - provide your recommended default;
   - make the answer easy for me.

Group initial questions into:

### A. Must answer before implementation

Only include issues where choosing incorrectly could substantially change the product.

### B. Recommended defaults

Include choices where you can safely continue using your recommended option if I do not care.

After sending this initial clarification batch, wait for my answers.

Do not begin implementation until I reply to this initial batch.

When I answer the initial batch, treat the clarification phase as complete.

Then enter autonomous execution mode.

---

# MODE 2 — AUTONOMOUS EXECUTION AFTER PREFLIGHT

After I answer the initial clarification questions:

**Do not repeatedly stop and ask me questions.**

Your default behavior must be:

**Plan → implement → test → inspect → fix → document → continue.**

Do not ask permission before moving to the next milestone.

Do not ask:

- “Should I continue?”
- “Would you like me to build the next feature?”
- “Can I proceed?”
- “Do you want me to fix this?”
- similar unnecessary approval questions.

Continue working automatically.

---

# NON-BLOCKING QUESTION RULE

If a new question appears during implementation, classify it into one of three categories.

## CATEGORY 1 — SAFE TO DECIDE

If you can make a reasonable, reversible decision yourself:

1. choose the safest sensible default;
2. document the decision;
3. continue.

Do not interrupt me.

Examples:

- naming choices;
- folder structure;
- minor UI decisions;
- library choice between equivalent free options;
- internal implementation details;
- exact spacing, layout, colors, component structure;
- database implementation details that do not materially change the product.

---

## CATEGORY 2 — FOUNDER INPUT USEFUL BUT NOT BLOCKING

If my answer would be useful but the project can continue without it:

1. write the question into:

`docs/PENDING_QUESTIONS.md`

2. include:
   - unique question ID;
   - question;
   - why it matters;
   - your recommended default;
   - which feature depends on it;
   - whether you temporarily used a default;
   - current status.

3. choose a reversible default if safe.

4. continue with all independent work.

5. do **not stop the entire project** waiting for me.

If one task depends on the answer, mark that specific task:

`BLOCKED — awaiting founder input`

Then move to another unblocked task.

The project should continue progressing wherever possible.

---

## CATEGORY 3 — TRUE BLOCKER

Only treat something as a true blocker if you genuinely cannot safely continue that specific area without me.

Examples:

- credentials that do not exist;
- payment authorization;
- irreversible external action;
- legal/business decision only the founder can make;
- major product decision with materially different consequences;
- destructive action;
- external account verification.

If this happens:

1. add the blocker to `docs/PENDING_QUESTIONS.md`;
2. clearly mark the affected task blocked;
3. continue working on every independent part of the project;
4. do not abandon the entire build because one feature is blocked.

Only stop completely if **no meaningful unblocked work remains**.

---

# IMPORTANT: DO NOT WAIT FOR A TIMEOUT

Do not depend on me replying within 10 minutes, 20 minutes, or any other period.

After the initial preflight is complete, your normal behavior should be:

**Do not wait for answers unless absolutely necessary.**

If something can be skipped temporarily, defaulted, mocked, deferred, or isolated, do that and keep building.

---

# WHEN I RETURN

You cannot detect that I am typing.

You only know I have returned when I actually send another message.

Whenever I send any new message after autonomous work has begun:

1. inspect `docs/PENDING_QUESTIONS.md`;
2. if unresolved founder questions exist, remind me of them;
3. prioritize only the questions that still materially matter;
4. do not repeat questions that are already answered;
5. apply my new answers to the correct tasks;
6. continue execution.

Do not lose unanswered questions merely because the conversation context changes.

`docs/PENDING_QUESTIONS.md` is the source of truth for unresolved founder decisions.

---

# PROJECT

Product name:

**SkillSetu**

SkillSetu is a job-readiness platform designed to identify exactly which skills prevent someone from being ready for a specific role, help them fix only those missing skills, verify improvement, and eventually connect qualified learners with interview opportunities.

The core idea is:

**Target Job  
→ Diagnostic Assessment  
→ Exact Skill Gaps  
→ Personalized Learning  
→ Practice  
→ Reassessment  
→ Verified Improvement  
→ Job-Readiness Report**

Long term, SkillSetu can be sold to engineering colleges and universities as a placement-outcome platform.

Students use it.

Colleges can pay for it.

Employers can eventually define role requirements and interview qualified candidates.

For this MVP, prove the learning and diagnosis loop first.

---

# PRIMARY USER

The first user is:

**an engineering student trying to become job-ready for a specific role.**

The product should answer:

**“What exactly is stopping me from being ready for this role, and what is the shortest path to fix it?”**

---

# FIRST TARGET ROLE

For the MVP, support only:

# DATA ANALYST

Do not build many career paths yet.

The Data Analyst role should include a structured skill map covering approximately:

- SQL
- Excel / spreadsheets
- Python for data analysis
- statistics
- probability
- data visualization
- analytical reasoning
- basic data interpretation

Break these into smaller skill nodes.

Example:

SQL
- SELECT/filtering
- aggregation
- GROUP BY
- joins
- subqueries
- basic window functions

Statistics
- descriptive statistics
- distributions
- probability basics
- confidence intervals
- hypothesis testing
- correlation vs causation

Each skill node should support:

- name;
- description;
- category;
- importance for the role;
- required proficiency;
- prerequisites;
- diagnostic questions;
- learning objectives;
- lesson content;
- practice items;
- reassessment items.

Keep the architecture extensible so other roles can be added later.

---

# COMPLETE MVP FLOW

The finished user journey should feel like one coherent product.

A student should be able to:

1. open SkillSetu;
2. enter the student demo experience;
3. choose Data Analyst;
4. understand what the diagnostic does;
5. take the diagnostic;
6. submit real answers;
7. receive skill-by-skill proficiency scores;
8. see their strongest and weakest areas;
9. receive a prioritized skill-gap plan;
10. begin personalized lessons;
11. interact with explanations and practice;
12. receive hints and feedback;
13. complete mastery checks;
14. see progress update;
15. take a reassessment;
16. receive new skill scores;
17. compare before vs after;
18. see remaining gaps;
19. receive an overall role-readiness report;
20. see next recommended actions.

---

# DIAGNOSTIC ASSESSMENT

Create approximately **20–30 diagnostic questions** for the MVP.

Use a mix of:

- multiple choice;
- practical reasoning;
- interpretation questions;
- small SQL questions;
- data-analysis scenarios;
- simple code-reading questions where relevant.

Do not make it purely trivia-based.

Each question should map to one or more skill nodes.

Store:

- question;
- selected answer;
- correctness;
- skill mapping;
- attempt;
- score;
- timestamp where appropriate.

Calculate skill proficiency based on actual responses.

Example result:

SQL Joins — 42%

Statistics — 38%

Python — 76%

Data Visualization — 81%

Then produce understandable feedback such as:

**“Your shortest path toward Data Analyst readiness starts with SQL joins and statistics.”**

Do not claim that the MVP assessment is scientifically validated.

Do not claim employment guarantees.

Label all readiness scores as prototype indicators.

---

# SKILL-GAP ENGINE

After the diagnostic, determine which skills deserve attention.

Gap prioritization should consider:

- current proficiency;
- required role proficiency;
- importance of that skill for the Data Analyst role;
- prerequisites;
- severity of the gap.

Avoid forcing students through skills they already demonstrate.

Generate a prioritized plan.

Example:

Priority 1 — SQL Joins  
Current: 42%  
Target: 75%

Priority 2 — Hypothesis Testing  
Current: 38%  
Target: 70%

Priority 3 — Data Interpretation  
Current: 51%  
Target: 75%

---

# PERSONALIZED LEARNING

The student should only need to work on meaningful gaps.

For every identified gap, create a learning sequence.

The primary mode should feel interactive and problem-driven.

Take inspiration from interactive-learning products, but do **not** copy copyrighted content, branded interfaces, proprietary problems, wording, or visuals from Brilliant, Coursera, or anyone else.

Create an original SkillSetu experience.

Each micro-learning lesson should contain:

1. short concept introduction;
2. intuition;
3. worked example;
4. learner interaction;
5. feedback;
6. hint if incorrect;
7. another problem;
8. slightly harder application;
9. mastery check.

Keep lessons relatively short.

The goal is to repair a specific gap, not recreate an entire university course.

---

# SECOND LEARNING STYLE

Allow a learner to choose between:

### Interactive Mode

Problem-first, guided, hands-on learning.

### Structured Mode

Explanation-first learning with:

- short lesson;
- examples;
- summary;
- practice questions.

The underlying learning objectives should remain consistent.

Do not create unnecessary duplicate systems.

---

# PERSONALIZATION

Personalization should use information such as:

- diagnosed gaps;
- learner performance;
- prior mistakes;
- lesson progress;
- reassessment performance.

For the MVP, use deterministic rules where appropriate.

Do not pretend the system is “AI-powered” where ordinary rules are enough.

---

# AI SUPPORT

Design a provider abstraction so AI can later generate:

- explanations;
- examples;
- hints;
- alternate questions;
- micro-lessons;
- personalized feedback;
- learning plans.

However:

**The MVP must work without any external AI API key.**

Therefore:

1. create a clean AI/provider interface;
2. implement deterministic/local demo content;
3. optionally support an environment-variable-based AI provider;
4. fall back gracefully when no provider exists;
5. never commit credentials.

The complete demo must remain usable offline/local where reasonable.

---

# PRACTICE

Students should be able to practice a gap after the lesson.

Include:

- immediate correctness feedback;
- hints;
- explanations;
- another attempt where useful;
- progress toward mastery.

Do not automatically mark something mastered merely because the page was opened.

Mastery should depend on actual answers.

---

# REASSESSMENT

After gap repair:

Give the learner a reassessment.

Do not simply repeat all original diagnostic questions.

Use different but equivalent items where possible.

Calculate new skill proficiency from real answers.

Show:

**BEFORE → AFTER**

Example:

SQL Joins  
42% → 78%

Statistics  
38% → 69%

Python  
76% → 80%

If the student performs poorly, show that honestly.

Never fabricate improvement to make the demo look good.

---

# JOB-READINESS REPORT

Build a polished final report.

Include:

- learner;
- target role;
- original diagnostic score;
- current score;
- skill-by-skill proficiency;
- detected gaps;
- skills improved;
- skills still below target;
- learning modules completed;
- readiness indicator;
- recommended next steps.

Add an understandable overall indicator such as:

- Needs significant development
- Developing
- Near role-ready
- Meets prototype readiness threshold

Do not imply this equals guaranteed employability.

Include a clear disclaimer such as:

**“SkillSetu readiness is an estimated prototype indicator based on demonstrated assessment performance and is not a guarantee of employment.”**

Include a printable/report-friendly view if practical.

---

# COLLEGE / UNIVERSITY DEMO

Because the likely business model involves universities paying for the product, build a lightweight placement-cell dashboard.

Do not build a giant enterprise SaaS product.

Create a demo dashboard showing a sample cohort.

Include metrics such as:

- total students;
- diagnostics completed;
- common skill gaps;
- average initial readiness;
- average current readiness;
- average improvement;
- learning completion;
- students exceeding a readiness threshold;
- skill-gap distribution.

Use seeded demo data.

This dashboard should help demonstrate:

**“SkillSetu helps a college understand exactly why students are not job-ready and whether targeted learning is improving readiness.”**

---

# EMPLOYER REQUIREMENTS

Do not build a full hiring marketplace yet.

For the MVP, create one employer-style Data Analyst requirement profile.

Example:

SQL — 80%

Statistics — 70%

Python — 65%

Visualization — 70%

Analytical reasoning — 75%

Compare the student against that requirement.

Architect the database so future versions can include:

- employers;
- job openings;
- required skill profiles;
- interviews;
- candidate referrals.

But do not spend substantial MVP time building those features.

---

# BUSINESS MODEL CONTEXT

The future business model is primarily B2B2C:

**College/university pays  
→ students use SkillSetu  
→ employers help define real role requirements  
→ qualified students become better interview candidates**

The MVP does not need billing.

Do not integrate payment systems.

---

# TECHNICAL DEFAULTS

If the repository is empty or has no strong existing architecture, use:

- Next.js
- React
- TypeScript
- responsive web UI
- Prisma ORM
- SQLite for the zero-configuration MVP
- schema designed so PostgreSQL migration is straightforward
- Zod for validation
- Vitest for unit/integration tests
- Playwright or equivalent for key end-to-end smoke testing if practical

Keep it as a monolith unless there is a compelling reason not to.

Do not create microservices.

Avoid unnecessary infrastructure.

Prefer free/open-source dependencies.

---

# AUTHENTICATION

For the MVP, do not let authentication become a blocker.

If full authentication significantly slows the build, provide a polished demo-user flow.

Possible modes:

- Demo Student
- Demo Placement Officer

Structure the project so real authentication can be added later.

If lightweight authentication can be added cleanly without substantial complexity, do so.

Use your engineering judgment.

---

# DATA MODEL

Design an understandable relational schema.

Likely entities include:

- User
- Role
- SkillCategory
- SkillNode
- RoleSkillRequirement
- Assessment
- AssessmentQuestion
- QuestionSkillMapping
- AssessmentAttempt
- AssessmentAnswer
- SkillScore
- LearningPath
- LearningModule
- Lesson
- PracticeQuestion
- LessonProgress
- Reassessment
- ReadinessReport
- College
- Cohort

You may simplify or rename these where beneficial.

Do not over-engineer the schema.

---

# SEEDED DATA

Seed enough realistic content for the MVP to work immediately.

Seed:

- Data Analyst role;
- skill graph;
- proficiency requirements;
- 20–30 diagnostic items;
- micro-lessons;
- practice;
- reassessment questions;
- sample college;
- sample cohort;
- placement dashboard data.

The demo should not open into an empty product.

---

# USER EXPERIENCE

The MVP should look like a credible startup product.

Prioritize:

- clean typography;
- clear hierarchy;
- intuitive navigation;
- progress indicators;
- skill visualizations;
- helpful empty states;
- clear errors;
- responsive layout;
- accessible interactions;
- keyboard usability where reasonable;
- simple onboarding.

Avoid spending excessive time on fancy animations.

Functionality first.

Polish after the full journey works.

---

# HOME PAGE

Create a simple landing/dashboard experience that communicates:

**Know exactly what stands between you and your target job.**

Explain the loop:

Diagnose  
→ Fix  
→ Verify  
→ Get role-ready

Do not use exaggerated claims.

---

# REPOSITORY MEMORY

After the initial clarification round is complete, create and maintain:

`AGENTS.md`

`docs/PRODUCT_SPEC.md`

`docs/EXECUTION_PLAN.md`

`docs/STATUS.md`

`docs/PENDING_QUESTIONS.md`

`docs/DECISIONS.md`

`README.md`

---

# AGENTS.md

Store durable instructions for future Codex sessions.

Include:

- product goal;
- engineering principles;
- testing expectations;
- non-blocking workflow;
- pending-question behavior;
- continuation rules.

---

# PRODUCT_SPEC.md

Preserve the product requirements from this specification.

This protects the project from context loss.

---

# EXECUTION_PLAN.md

Break the project into milestones.

Each milestone should have:

- goal;
- tasks;
- dependencies;
- acceptance criteria;
- status.

---

# STATUS.md

Continuously update:

- current milestone;
- completed milestones;
- work completed;
- tests run;
- failures;
- unresolved issues;
- blocked tasks;
- next executable work;
- overall Definition-of-Done progress.

Use this as external memory.

---

# PENDING_QUESTIONS.md

Maintain unresolved founder questions.

Each entry should contain:

Question ID

Status

Question

Why it matters

Recommended default

Affected feature

Temporary decision

Date/sequence raised

Resolution when answered

Never silently forget unresolved founder questions.

---

# DECISIONS.md

Record important product and architecture decisions.

For example:

- SQLite chosen for MVP;
- Data Analyst chosen as first role;
- demo auth chosen;
- deterministic local learning content chosen;
- particular scoring formula chosen.

Explain briefly why.

---

# MILESTONE PLAN

Create the exact plan yourself.

A sensible sequence may be:

### Milestone 0
Repository inspection and clarification

### Milestone 1
Application foundation

### Milestone 2
Database and seed system

### Milestone 3
Data Analyst role skill graph

### Milestone 4
Diagnostic assessment engine

### Milestone 5
Skill scoring and gap analysis

### Milestone 6
Personalized learning-path generator

### Milestone 7
Interactive learning experience

### Milestone 8
Practice and mastery logic

### Milestone 9
Reassessment

### Milestone 10
Before/after analysis

### Milestone 11
Job-readiness report

### Milestone 12
College placement dashboard

### Milestone 13
UX polish and responsive behavior

### Milestone 14
Testing and hardening

### Milestone 15
Documentation and final demo verification

You may adjust this plan if there is a better dependency order.

---

# AFTER EACH MILESTONE

Do not stop to ask whether you should continue.

Instead:

1. run appropriate tests;
2. run type checking;
3. run linting;
4. run build where appropriate;
5. inspect failures;
6. fix regressions;
7. update documentation;
8. update STATUS.md;
9. update DECISIONS.md when necessary;
10. continue to the next unblocked milestone.

---

# TESTING REQUIREMENTS

At minimum, test:

- diagnostic scoring;
- question-to-skill mapping;
- skill proficiency calculations;
- gap prioritization;
- role requirement comparison;
- learning-path generation;
- lesson progress;
- mastery calculation;
- reassessment;
- before/after calculations;
- readiness calculation.

Perform an end-to-end smoke test covering:

Student enters  
→ diagnostic  
→ results  
→ learning  
→ practice  
→ reassessment  
→ readiness report.

Also verify the college dashboard loads with seeded data.

---

# ERROR-HANDLING RULE

If something breaks:

Do not immediately ask me what to do.

Investigate.

Read the error.

Inspect relevant code.

Try reasonable fixes.

Run tests again.

Search the repository for related code.

Use official documentation when appropriate.

Only escalate when genuinely necessary.

---

# SECURITY

For this MVP:

- validate inputs;
- avoid unnecessary personal information;
- never commit credentials;
- keep secrets in environment variables;
- provide `.env.example`;
- sanitize where necessary;
- use safe defaults;
- document important MVP security limitations.

---

# COST CONTROL

Do not require paid services for the core MVP.

The product should be runnable locally.

If an optional paid API could improve the experience:

1. make it optional;
2. provide a free/local fallback;
3. document it;
4. do not block completion on it.

---

# COPYRIGHT / CONTENT

Do not copy:

- Brilliant lessons;
- Coursera course material;
- copyrighted questions;
- proprietary assessments;
- branded layouts;
- proprietary learning sequences.

Create original demo content.

---

# CLAIMS

Do not claim:

- guaranteed placement;
- guaranteed employment;
- scientifically validated diagnostic accuracy;
- university approval;
- employer endorsement;
- proven hiring outcomes unless actual evidence exists.

Use wording appropriate to an MVP.

---

# OUT OF SCOPE FOR THIS MVP

Do not spend significant time building:

- residential campus features;
- full recruiter marketplace;
- payment processing;
- dozens of job roles;
- native Android application;
- complex real-time chat;
- video hosting;
- advanced social network;
- massive admin system;
- sophisticated recommendation ML;
- enterprise SSO;
- microservices.

Architect for future growth without building everything now.

---

# DEFINITION OF DONE

Do not mark the project complete merely because code exists.

The MVP is complete only when all reasonably achievable items below are verified:

- application launches successfully;
- installation instructions work;
- database initialization works;
- seed process works;
- Data Analyst role exists;
- diagnostic works;
- answers are stored;
- scoring uses real answers;
- skill gaps are calculated;
- learning plan responds to actual gaps;
- interactive lessons work;
- structured learning mode works;
- practice works;
- progress works;
- reassessment works;
- reassessment uses real answers;
- before/after comparison works;
- readiness report works;
- employer-style requirement comparison works;
- college dashboard works;
- sample cohort works;
- important tests pass;
- type checking passes;
- lint passes;
- production build passes;
- key demo journey passes;
- README explains exact setup;
- README explains exact demo flow;
- known limitations are documented;
- unresolved founder questions are documented;
- STATUS.md accurately represents project state.

---

# FINAL VERIFICATION

Before declaring completion:

Run the entire product from a clean setup as closely as practical.

Walk through the demo journey.

Verify that a new user can understand what to do.

Verify there are no obvious broken pages.

Verify seeded data works.

Verify results are derived from actual interactions.

Verify documentation matches reality.

Do not claim tests passed unless they actually passed.

---

# FINAL REPORT

When no meaningful unblocked work remains and the Definition of Done is satisfied as far as possible, provide a concise final report covering:

## Product built

What functionality exists.

## Architecture

Main technical decisions.

## Run instructions

Exact commands.

## Demo instructions

Exact sequence to demonstrate SkillSetu.

## Testing

What was actually tested and results.

## Remaining limitations

What remains prototype-level.

## Pending founder decisions

Anything still inside `PENDING_QUESTIONS.md`.

## Best next experiment

Recommend the smallest real-world validation experiment.

The likely first validation should involve something like:

- one role;
- 20–30 students;
- real diagnostic usage;
- personalized gap repair;
- reassessment;
- measuring whether the diagnosed gaps feel accurate;
- checking whether students improve;
- ideally getting feedback from at least one placement officer or employer.

---

# MOST IMPORTANT INSTRUCTION

After the initial clarification round is answered:

**KEEP BUILDING.**

If one task becomes blocked:

**record it and work on another task.**

If a safe assumption can unblock progress:

**make the assumption, document it, and continue.**

If I am unavailable:

**continue all work that does not genuinely require me.**

If I later send you any message:

**check `docs/PENDING_QUESTIONS.md` first and remind me of unresolved founder questions before losing them.**

Do not treat one unanswered question as a reason to stop the whole project.

Your end goal is not a plan.

Your end goal is a:

# WORKING SKILLSETU MVP
---

# Founder clarification — approved after initial preflight, 2026-10-02

Build in the existing eddict_v1 repository: **yes**.

The original quiz-led assessment format is superseded by this founder requirement:

> **Real-world diagnostic mode:** The diagnostic should primarily evaluate applied ability through realistic job scenarios, not only isolated quiz questions. For the Data Analyst MVP, create at least 2–3 interactive workplace simulations where a virtual client or stakeholder presents a problem, the learner asks or responds to clarification questions, interprets information, makes analytical decisions, and receives follow-up responses. Map each action to measurable skill nodes such as SQL, statistics, analytical reasoning, requirement clarification, and communication. Keep the MVP simulation text-based and structured; do not build a 3D or voice avatar yet.

The preflight phase is complete. Other proposed defaults adopted: English for engineering students, demo student/officer entry, locally runnable Next.js/TypeScript/Prisma/SQLite monolith, no paid runtime services or API key. Implementation proceeds autonomously under the non-blocking workflow above.


# Active extension — 2026-10-02

Founder resumed the complete Python Developer and Java Developer extension on the updated paste_skillsetu_v1 base, preserving Data Analyst. The full extension brief is retained in [MULTI_ROLE_SPEC.md](MULTI_ROLE_SPEC.md). Preflight defaults were explicitly approved: independent role progress and no automatic cross-role proficiency credit. Later authorization resumed this scope after the temporary Data Analyst-only delivery.
