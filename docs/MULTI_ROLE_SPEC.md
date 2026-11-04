You are the lead autonomous product engineer responsible for extending the existing SkillSetu MVP inside this repository.

IMPORTANT:
- Use the existing repository.
- Preserve all working Data Analyst functionality.
- Do NOT rebuild the project from scratch.
- Add exactly TWO new target roles:
  1. Python Developer
  2. Java Developer
- Do not add any other new roles in this task.

Your job is not to merely write code or produce a plan.

Your job is to deliver a WORKING, TESTED, POLISHED MULTI-ROLE SkillSetu MVP where a student can choose:

- Data Analyst
- Python Developer
- Java Developer

and complete the same full SkillSetu journey for each role:

TARGET ROLE
→ REAL-WORLD INTERACTIVE DIAGNOSTIC
→ EXACT SKILL GAPS
→ PERSONALIZED LEARNING PATH
→ INTERACTIVE / STRUCTURED LEARNING
→ PRACTICE
→ REASSESSMENT
→ BEFORE / AFTER
→ JOB-READINESS REPORT


==================================================
PHASE 0 — ASK QUESTIONS BEFORE CODING
==================================================

Before modifying implementation code:

1. Inspect the entire repository.
2. Understand the current Data Analyst implementation.
3. Read:
   - AGENTS.md
   - docs/PRODUCT_SPEC.md
   - docs/EXECUTION_PLAN.md
   - docs/STATUS.md
   - docs/PENDING_QUESTIONS.md
   - docs/DECISIONS.md
   - README.md
4. Inspect:
   - role model
   - skill graph
   - simulation engine
   - scoring
   - gap prioritization
   - learning content
   - reassessment
   - readiness reports
   - placement dashboard
   - tests
5. Identify all genuinely blocking founder questions for adding Python Developer and Java Developer.

Ask me ALL needed questions in ONE consolidated message.

Do NOT ask questions that can be decided safely by engineering judgment.

For each question:
- explain why it matters;
- give your recommended default;
- make it easy to answer.

Group questions into:

A. Must answer before implementation
B. Recommended defaults

WAIT for my reply before coding.

After I answer that ONE clarification batch:

ENTER AUTONOMOUS EXECUTION MODE.


==================================================
AUTONOMOUS EXECUTION AFTER I ANSWER
==================================================

After I answer the initial questions:

DO NOT repeatedly ask me for permission.

Your loop is:

PLAN
→ IMPLEMENT
→ TEST
→ INSPECT
→ FIX
→ DOCUMENT
→ CONTINUE

Do not ask:
- Should I continue?
- Can I proceed?
- Should I build the next role?
- Do you want me to fix this?
- Do you approve the next milestone?

Continue automatically.


==================================================
IF I AM ASLEEP / UNAVAILABLE
==================================================

If a question appears later:

CATEGORY 1 — SAFE TO DECIDE
Choose a sensible reversible default.
Document it.
Continue.

CATEGORY 2 — FOUNDER INPUT USEFUL BUT NOT BLOCKING
Add it to:

docs/PENDING_QUESTIONS.md

Include:
- ID
- question
- why it matters
- recommended default
- affected feature
- temporary assumption
- status

Use a safe default if possible and keep working elsewhere.

CATEGORY 3 — TRUE BLOCKER
If a feature genuinely cannot continue without founder input:
- record the blocker;
- mark only that task blocked;
- continue every independent task.

Do not stop the entire project unless no meaningful unblocked work remains.

Do NOT use timeouts such as 10 or 20 minutes.
Do not wait if safe independent work exists.


==================================================
WHEN I RETURN
==================================================

Whenever I send a new message after work has started:

1. Check docs/PENDING_QUESTIONS.md.
2. Surface unresolved founder questions that still matter.
3. Do not repeat resolved questions.
4. Apply my answers.
5. Continue execution.


==================================================
CORE PRODUCT PRINCIPLE
==================================================

SkillSetu should answer:

“What exactly is stopping this learner from being ready for this specific job, and what is the shortest path to fix it?”

The assessment must prioritize:

REALISTIC JOB PERFORMANCE

not textbook recall.

Each role should feel like a simulated workplace experience.


==================================================
EXISTING ROLE
==================================================

Preserve and improve where necessary:

DATA ANALYST

Do not break:
- its skill graph;
- diagnostic;
- learning;
- reassessment;
- readiness report;
- placement dashboard;
- tests;
- seeded demo behavior.


==================================================
NEW ROLE 1 — PYTHON DEVELOPER
==================================================

Build a complete Python Developer role track.

Target:
Entry-level / junior Python Developer.

The role should measure practical job readiness, not just syntax knowledge.


==================================================
PYTHON DEVELOPER SKILL GRAPH
==================================================

Create approximately 15–18 useful skill nodes.

Recommended areas:

PYTHON FUNDAMENTALS
- variables and types
- control flow
- loops
- functions
- scope
- comprehensions

DATA STRUCTURES
- lists
- tuples
- dictionaries
- sets
- iteration patterns

PROGRAM STRUCTURE
- modules
- imports
- packages
- virtual environments awareness

OBJECT-ORIENTED PROGRAMMING
- classes
- objects
- methods
- inheritance
- composition
- encapsulation basics

ERROR HANDLING
- exceptions
- try/except/finally
- defensive programming

FILES / DATA
- file I/O
- JSON
- CSV basics

DEBUGGING
- reading tracebacks
- locating logic bugs
- fixing edge cases

TESTING
- basic unit testing
- assertions
- test cases
- happy path vs edge cases

APIS / WEB DATA
- HTTP basics
- REST
- JSON payloads
- request/response interpretation

DATABASE INTERACTION
- basic SQL integration
- parameterized queries
- reading query results

CODE QUALITY
- naming
- readability
- separation of concerns
- simple refactoring

PROBLEM SOLVING
- decomposing requirements
- choosing appropriate data structures
- reasoning about complexity at a basic level

WORKPLACE SKILLS
- requirement clarification
- explaining implementation decisions
- communicating bugs / tradeoffs

You may refine or combine nodes if that produces a cleaner skill graph.

Each node should have:
- id
- name
- category
- description
- target proficiency
- importance
- prerequisites


==================================================
PYTHON REAL-WORLD DIAGNOSTIC
==================================================

Create at least 3 realistic workplace simulations.

Target approximately 24 meaningful scored interactions in total.

The student should feel like they are working with:
- a manager;
- teammate;
- client;
- QA engineer;
- product owner;
- or another realistic stakeholder.

Do NOT make the main experience a 24-question syntax quiz.


==================================================
SUGGESTED PYTHON SCENARIO 1
==================================================

BROKEN ORDER PROCESSOR

A fictional manager says:

“Our Python order-processing script crashes on some customer records and sometimes creates duplicate outputs. Can you investigate?”

Possible interactions:
- clarify expected behavior;
- inspect a traceback;
- identify None / missing field handling;
- choose a safer dictionary access strategy;
- detect a duplicate-processing bug;
- reason about loops;
- refactor into functions;
- add exception handling;
- decide what to log;
- explain the fix to the manager.

Skills may include:
- debugging
- dictionaries
- functions
- exceptions
- reasoning
- communication


==================================================
SUGGESTED PYTHON SCENARIO 2
==================================================

THIRD-PARTY API INTEGRATION

Stakeholder:

“We need customer status from an external API. Sometimes the service returns errors or incomplete JSON.”

Learner may need to:
- clarify requirements;
- interpret HTTP response codes;
- inspect JSON;
- handle missing keys;
- retry or fail gracefully;
- avoid crashing;
- transform response data;
- validate inputs;
- explain fallback behavior.

Skills:
- APIs
- JSON
- exceptions
- defensive programming
- data structures
- requirement clarification


==================================================
SUGGESTED PYTHON SCENARIO 3
==================================================

REFRACTOR A MESSY SCRIPT

A teammate gives a 100-line-style conceptual script that:
- mixes file I/O;
- validation;
- business logic;
- output formatting;
- duplicate code.

The learner should identify:
- what should become functions;
- appropriate data structures;
- variable naming problems;
- testable units;
- edge cases;
- simple refactoring strategy.

Skills:
- functions
- code quality
- testing
- file handling
- reasoning
- communication


==================================================
PYTHON DIAGNOSTIC INTERACTION TYPES
==================================================

Use realistic tasks such as:

- choose the next debugging step;
- interpret a traceback;
- identify a bug;
- select the best code fix;
- complete a small code fragment;
- reason about program output;
- select the correct data structure;
- identify poor exception handling;
- interpret API output;
- identify edge cases;
- choose a unit test;
- refactor a function;
- explain implementation tradeoffs;
- respond to a stakeholder follow-up.

Free-form coding is NOT required for this MVP unless it can be added safely without destabilizing the product.

Structured code interpretation and applied decision-making are acceptable.


==================================================
PYTHON LEARNING
==================================================

Create an original learning module for every Python skill node.

Each module should include:

INTERACTIVE MODE
1. short intuition
2. small code example
3. learner interaction
4. immediate feedback
5. hint
6. retry
7. slightly harder task
8. mastery check

STRUCTURED MODE
1. explanation
2. example
3. key points
4. practice
5. mastery check

Do not copy external courses.

Keep learning focused on diagnosed gaps only.


==================================================
PYTHON REASSESSMENT
==================================================

Create at least 3 alternate Python workplace scenarios.

They must test the same underlying abilities using new situations.

Do not reuse the exact original cases.

Examples:
- log file processor
- inventory API
- small automation service
- data import utility
- backend validation bug
- CSV transformation pipeline

Show before → after honestly.


==================================================
PYTHON EMPLOYER PROFILE
==================================================

Create one fictional junior Python Developer requirement profile.

Use appropriate thresholds for skills such as:
- fundamentals
- functions
- data structures
- OOP
- debugging
- exceptions
- testing
- APIs
- code quality
- problem solving
- communication

Do not imply real employer endorsement.


==================================================
NEW ROLE 2 — JAVA DEVELOPER
==================================================

Build a complete Java Developer role track.

Target:
Entry-level / junior Java Developer.

The diagnostic should measure practical software-development readiness, not memorization of syntax.


==================================================
JAVA DEVELOPER SKILL GRAPH
==================================================

Create approximately 15–18 useful skill nodes.

Recommended areas:

JAVA FUNDAMENTALS
- variables and primitive/reference types
- control flow
- loops
- methods
- method parameters / returns

OBJECT-ORIENTED PROGRAMMING
- classes
- objects
- constructors
- encapsulation
- inheritance
- interfaces
- polymorphism
- composition

COLLECTIONS
- List
- Set
- Map
- iteration
- choosing appropriate collection types

EXCEPTIONS
- checked / unchecked awareness
- try/catch/finally
- custom errors at a basic level
- error propagation

GENERICS
- basic type-safe collection usage
- generic method/class understanding

STRINGS / IMMUTABILITY
- String behavior
- equality
- common string operations

FILE / DATA HANDLING
- basic file I/O
- parsing structured input
- JSON conceptual interaction

DEBUGGING
- stack traces
- NullPointerException
- off-by-one errors
- logic bugs
- state bugs

TESTING
- basic JUnit-style reasoning
- assertions
- edge cases
- isolation

DATABASE / SQL
- basic JDBC-style concepts
- parameterized queries
- mapping results

APIS / BACKEND BASICS
- request / response flow
- REST concepts
- validation
- service / repository separation awareness

CODE QUALITY
- naming
- cohesion
- separation of concerns
- avoiding duplication
- basic refactoring

BUILD / PROJECT AWARENESS
- packages
- imports
- Maven / Gradle awareness
- dependencies at a conceptual level

PROBLEM SOLVING
- requirement decomposition
- data structure choice
- basic algorithmic reasoning

WORKPLACE SKILLS
- requirement clarification
- explaining design decisions
- communicating defects / tradeoffs

You may refine the exact nodes.


==================================================
JAVA REAL-WORLD DIAGNOSTIC
==================================================

Create at least 3 realistic workplace simulations.

Target approximately 24 meaningful scored interactions total.

Do not make the main experience a static Java quiz.


==================================================
SUGGESTED JAVA SCENARIO 1
==================================================

ORDER SERVICE BUG

A manager says:

“Our order service occasionally throws a NullPointerException and some invalid orders still get processed.”

Learner may need to:
- clarify expected behavior;
- inspect a stack trace;
- identify null handling;
- inspect validation logic;
- choose an appropriate exception strategy;
- refactor responsibilities;
- propose tests;
- communicate the fix.

Skills:
- debugging
- null safety reasoning
- methods
- exceptions
- testing
- communication


==================================================
SUGGESTED JAVA SCENARIO 2
==================================================

COLLECTION / BUSINESS LOGIC PROBLEM

A service must:
- group customers;
- prevent duplicates;
- preserve ordering where required;
- retrieve records efficiently.

Learner chooses between:
- List
- Set
- Map
- nested combinations

Then explains why.

Skills:
- collections
- generics
- reasoning
- code quality


==================================================
SUGGESTED JAVA SCENARIO 3
==================================================

MESSY BACKEND CLASS

A fictional backend class:
- handles HTTP input;
- validation;
- SQL;
- business logic;
- formatting;
- error handling;
all in one place.

Learner should:
- identify responsibilities;
- propose classes / methods;
- understand interface / composition choices;
- identify test seams;
- reason about database safety;
- explain the refactor.

Skills:
- OOP
- interfaces
- composition
- database reasoning
- testing
- code quality
- communication


==================================================
JAVA DIAGNOSTIC INTERACTION TYPES
==================================================

Use realistic tasks such as:

- interpret Java code;
- inspect a stack trace;
- identify NullPointerException cause;
- choose a collection;
- reason about object state;
- select method / class responsibilities;
- interpret inheritance vs composition;
- identify equality issues;
- choose an exception-handling approach;
- inspect SQL interaction;
- choose a unit test;
- identify edge cases;
- refactor design choices;
- explain a decision to a teammate.


==================================================
JAVA LEARNING
==================================================

Create original lessons for each Java skill node.

Support:

INTERACTIVE MODE
- concept
- code example
- interaction
- feedback
- hint
- retry
- harder example
- mastery check

STRUCTURED MODE
- explanation
- example
- summary
- practice
- mastery check


==================================================
JAVA REASSESSMENT
==================================================

Create at least 3 alternate realistic Java workplace simulations.

Possible examples:
- customer service bug
- payment validation service
- inventory backend
- log processor
- REST endpoint failure
- repository refactor

Test the same skills using new contexts.

Do not reuse exact diagnostic cases.


==================================================
JAVA EMPLOYER PROFILE
==================================================

Create one fictional Junior Java Developer requirement profile.

Use suitable thresholds for:
- fundamentals
- methods
- OOP
- collections
- exceptions
- debugging
- testing
- database interaction
- API/backend reasoning
- code quality
- problem solving
- communication


==================================================
ROLE SELECTION UX
==================================================

Update SkillSetu so the student can choose:

1. Data Analyst
2. Python Developer
3. Java Developer

The UI should clearly show:
- role name;
- short description;
- what kind of work the role involves;
- approximate diagnostic duration;
- major skill categories.

The route / state model should be genuinely role-driven.

Do not duplicate the entire application three times.


==================================================
ARCHITECTURE REQUIREMENT
==================================================

Refactor any Data-Analyst-specific assumptions that prevent clean multi-role support.

The system should be driven by role configuration / seeded data.

Aim for architecture like:

Role
→ Skill Nodes
→ Role Requirements
→ Diagnostic Scenarios
→ Learning Modules
→ Reassessment Scenarios
→ Employer Profile

Avoid:
- role-specific conditionals scattered everywhere;
- duplicating scoring engines;
- duplicating report logic;
- duplicating learning UI;
- creating a separate app for each role.

Reuse:
- diagnostic engine;
- scoring;
- gap prioritization;
- learning engine;
- reassessment;
- report UI;
- employer comparison;
- placement dashboard logic.


==================================================
PLACEMENT OFFICER DASHBOARD
==================================================

Extend the Placement Officer demo so it can show role-specific cohort insight.

Allow viewing:
- Data Analyst cohort
- Python Developer cohort
- Java Developer cohort

Use clearly labelled fictional data.

Metrics should include:
- students assigned to role;
- diagnostics completed;
- common skill gaps;
- readiness averages;
- learning completion;
- improvement;
- students meeting prototype thresholds.

Do not overbuild enterprise administration.


==================================================
SEED DATA
==================================================

Seed enough content to immediately demonstrate all three roles.

For Python Developer:
- skill graph;
- 3 diagnostic simulations;
- ~24 scored interactions;
- lessons;
- practice;
- 3 reassessment simulations;
- employer profile;
- fictional cohort.

For Java Developer:
- skill graph;
- 3 diagnostic simulations;
- ~24 scored interactions;
- lessons;
- practice;
- 3 reassessment simulations;
- employer profile;
- fictional cohort.

Preserve existing Data Analyst data.


==================================================
SCORING
==================================================

Reuse one explainable scoring framework across roles where possible.

Every scored interaction must map to one or more skill nodes.

Scores must come from real submitted answers.

Do not hard-code improvement.

Allow:
- strong
- partial
- weak
- incorrect
where useful.

Keep scoring deterministic for the MVP.


==================================================
GAP PRIORITIZATION
==================================================

For every role, prioritize gaps based on:
- current proficiency;
- role target;
- importance;
- prerequisites;
- severity.

The learning path should include only meaningful gaps.


==================================================
READINESS REPORT
==================================================

For every role, show:

- target role
- baseline score
- current score
- skill-by-skill proficiency
- detected gaps
- improvements
- remaining gaps
- completed learning
- employer requirement comparison
- readiness status
- recommended next action

Use the existing prototype disclaimer.

Never imply guaranteed employment.


==================================================
TESTING
==================================================

Preserve all existing Data Analyst tests.

Add coverage for Python Developer and Java Developer.

At minimum test:

ROLE CONFIGURATION
- all 3 roles load
- correct skills map to correct role
- correct scenarios map to correct role

DIAGNOSTIC
- Python scoring
- Java scoring
- scenario completion
- skill mappings
- persistence

GAP ENGINE
- Python gap prioritization
- Java gap prioritization

LEARNING
- role-specific learning paths
- lesson progress
- mastery

REASSESSMENT
- Python reassessment
- Java reassessment
- before / after calculations
- honest declines

REPORTS
- Python readiness report
- Java readiness report
- employer comparisons

DASHBOARD
- role-specific fictional cohort data

E2E
Run at least one complete automated user journey for:
- Data Analyst
- Python Developer
- Java Developer

Where full browser testing becomes too expensive, prioritize one full flow per role and unit/integration coverage for the rest.


==================================================
MILESTONE PLAN
==================================================

Create the exact execution plan yourself.

A sensible structure:

Milestone 0
Repository inspection + clarification

Milestone 1
Multi-role architecture refactor

Milestone 2
Role selection UX

Milestone 3
Python Developer skill graph

Milestone 4
Python diagnostic simulations

Milestone 5
Python scoring / learning / reassessment / report

Milestone 6
Java Developer skill graph

Milestone 7
Java diagnostic simulations

Milestone 8
Java scoring / learning / reassessment / report

Milestone 9
Placement Officer multi-role dashboard

Milestone 10
Cross-role UX polish

Milestone 11
Tests and regressions

Milestone 12
Documentation / final verification

Adjust order if dependencies suggest a better approach.


==================================================
AFTER EVERY MILESTONE
==================================================

Do not stop for permission.

Run:
- typecheck
- lint
- relevant tests
- build where appropriate

Fix regressions.

Update:
- docs/STATUS.md
- docs/DECISIONS.md
- docs/EXECUTION_PLAN.md
- docs/PENDING_QUESTIONS.md if needed
- docs/PRODUCT_SPEC.md if implementation details change
- README.md


==================================================
QUALITY RULES
==================================================

Do not:
- break Data Analyst;
- fabricate results;
- claim scientifically validated skill measurement;
- claim guaranteed placement;
- introduce paid services;
- require an external AI key;
- create microservices;
- unnecessarily rewrite working architecture;
- copy external course content;
- add dozens of unrelated features.


==================================================
OUT OF SCOPE
==================================================

Do NOT build in this task:
- AI Engineer role
- ML Engineer role
- Cybersecurity role
- C/C++ role
- JavaScript role
- mobile APK
- payment system
- recruiter marketplace
- voice avatar
- 3D avatar
- full live coding sandbox
- real college authentication
- enterprise SSO
- billing
- residential campus features


==================================================
DEFINITION OF DONE
==================================================

Do not declare completion until:

GENERAL
- app starts;
- database setup works;
- seed works;
- typecheck passes;
- lint passes;
- tests pass;
- production build passes.

DATA ANALYST
- existing journey still works.

PYTHON DEVELOPER
- role selectable;
- complete skill graph exists;
- at least 3 realistic diagnostic simulations exist;
- approximately 24 scored diagnostic interactions exist;
- scoring works;
- gaps work;
- personalized learning works;
- interactive mode works;
- structured mode works;
- practice works;
- reassessment exists with new cases;
- before / after works;
- readiness report works;
- fictional employer comparison works.

JAVA DEVELOPER
- role selectable;
- complete skill graph exists;
- at least 3 realistic diagnostic simulations exist;
- approximately 24 scored diagnostic interactions exist;
- scoring works;
- gaps work;
- personalized learning works;
- interactive mode works;
- structured mode works;
- practice works;
- reassessment exists with new cases;
- before / after works;
- readiness report works;
- fictional employer comparison works.

PLACEMENT DASHBOARD
- supports role-specific fictional Data Analyst, Python Developer and Java Developer cohorts.

ARCHITECTURE
- shared engines are reused;
- role-specific logic is data/config-driven where practical;
- no unnecessary duplicated application stacks.

DOCUMENTATION
- README updated;
- PRODUCT_SPEC updated;
- STATUS updated;
- EXECUTION_PLAN updated;
- DECISIONS updated;
- unresolved founder questions documented.


==================================================
FINAL VERIFICATION
==================================================

Before completion:

1. Launch app.
2. Verify role chooser.
3. Complete or automate a Data Analyst journey.
4. Complete or automate a Python Developer journey.
5. Complete or automate a Java Developer journey.
6. Verify gaps produce different learning paths.
7. Verify reassessments use different cases.
8. Verify reports show correct role data.
9. Verify employer thresholds differ appropriately.
10. Verify Placement Officer dashboard switches roles correctly.
11. Verify responsive layout.
12. Verify no obvious broken routes.
13. Verify all results derive from actual submitted responses.
14. Verify documentation matches reality.


==================================================
FINAL REPORT
==================================================

At the end, provide:

1. What was built
2. Architecture changes
3. Python Developer implementation
4. Java Developer implementation
5. Data Analyst regression status
6. Test results
7. Known limitations
8. Pending founder questions
9. How to demo each role
10. Best next real-world validation experiment


==================================================
MOST IMPORTANT INSTRUCTION
==================================================

FIRST:
ASK ME ONE CONSOLIDATED BATCH OF QUESTIONS.

THEN WAIT.

AFTER I ANSWER:

KEEP BUILDING AUTONOMOUSLY.

If one feature is blocked:
record it and work elsewhere.

If a safe reversible decision is available:
make it, document it, continue.

Do not stop after planning.

Your end goal is:

A WORKING MULTI-ROLE SKILLSETU MVP WITH:

DATA ANALYST
+ PYTHON DEVELOPER
+ JAVA DEVELOPER