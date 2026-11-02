You are upgrading SkillSetu from a promising diagnostic prototype into a substantially more credible, premium, placement-readiness product.

Repository:
staymotivated24rr-bot/paste_skillsetu_v1

Production deployment:
https://pasteskillsetuv1.vercel.app

Current production architecture:
- Next.js App Router
- React
- TypeScript
- Prisma
- Neon PostgreSQL
- Vercel
- Existing roles:
  1. Data Analyst
  2. Python Developer
  3. Java Developer
- Existing student journey:
  role selection → workplace diagnostic → skill map → personalized learning plan → lessons/practice → reassessment → readiness report
- Existing fictional placement dashboard/cohorts
- Existing CI/tests must remain green
- Existing production data and completed learner history must not be destroyed

==================================================
MISSION
==================================================

Transform SkillSetu around this product principle:

“Do not ask learners what they know. Put them into realistic work situations and discover what they can actually do.”

The current product has a strong diagnose → repair → verify loop, but the diagnostic still relies too heavily on recognition-style multiple-choice decisions.

The next version must make the diagnosis harder to fake, more evidence-based, more transparent, more useful to a placement candidate, and much more premium visually.

Do NOT spend this cycle primarily adding more roles.

The existing three roles are enough.

Fully upgrade Python Developer first while creating reusable shared architecture that Data Analyst and Java Developer can later adopt.

==================================================
NON-NEGOTIABLE WORKING RULES
==================================================

1. Inspect the entire current main branch before implementation:
   - architecture
   - Prisma schema/migrations
   - Neon integration
   - APIs
   - role model
   - assessment authoring
   - scoring engine
   - learning/mastery engine
   - report logic
   - placement dashboard
   - UI
   - tests
   - CI
   - Vercel assumptions

2. Also inspect the live production experience where practical.

3. Ask me ONE consolidated clarification batch only if there is a genuine founder decision that blocks implementation.

4. If no blocking founder decision exists, start implementation without waiting.

5. For non-blocking ambiguity:
   - choose a safe reversible default
   - document it in docs/DECISIONS.md
   - add unresolved non-blockers to docs/PENDING_QUESTIONS.md
   - continue autonomously

6. Do not stop after every milestone to ask for permission.

7. Work on a dedicated branch.

8. Preserve:
   - Data Analyst content/history
   - Python Developer history
   - Java Developer history
   - existing completed attempts
   - existing learner progress
   - role separation

9. Database changes must use additive Prisma migrations.

10. Do not rewrite already-applied production migrations.

11. Do not reset, drop, or recreate the production Neon database.

12. Never run arbitrary untrusted learner code directly on Vercel/Node server processes.

13. Never expose DATABASE_URL, environment secrets, answer keys, scoring keys, or privileged database information to the browser.

14. Do not fabricate:
   - employability validation
   - hiring outcomes
   - employer approval
   - statistically validated proficiency
   - guaranteed readiness

15. Readiness remains a prototype indicator.

16. Do not add voice, 3D avatars, or expensive AI-agent infrastructure in this milestone.

17. Build the assessment credibility layer first.

18. After every meaningful implementation phase run:
   - npm run typecheck
   - npm run lint
   - npm test
   - npm run build
   - relevant Playwright tests

19. Fix regressions before continuing.

20. At the end:
   - push the branch
   - create a PR into main
   - do not merge automatically unless explicitly instructed

==================================================
PRIORITY MODEL
==================================================

Use:

P0 = prevents the product from credibly measuring skill
P1 = major product-value improvement
P2 = important quality/scale improvement
P3 = polish

Implement P0 completely before spending substantial effort on lower-priority polish.

==================================================
P0 — AUTHENTIC PYTHON DEVELOPER DIAGNOSTIC
==================================================

Fully upgrade the Python Developer diagnostic.

Do not remove the current workplace-simulation concept.

Instead, evolve the assessment model so a scenario can contain multiple authentic task types.

Support at minimum:

1. DECISION TASK
Current structured workplace decision style.

Used when judgement/decision-making is genuinely what should be measured.

2. CODE COMPLETION / CODE EDIT
The learner modifies or completes a short Python function.

Examples:
- validation logic
- dictionary/list processing
- error handling
- API response handling
- refactoring
- function decomposition

Evaluate actual behavior.

3. BUG FIX
Show short broken Python code.

The learner must identify and repair the bug.

4. SHORT ANSWER
The learner explains:
- why something failed
- what assumption is unsafe
- what requirement should be clarified
- why a design is preferable
- how to communicate a limitation

For this milestone use deterministic rubric-based evaluation.

Do not pretend this is AI grading.

Possible deterministic rubric mechanics:
- concept groups
- required idea groups
- bounded phrase/concept matching
- explicit rubric dimensions
- normalization
- maximum/minimum length
- partial-credit rules

Display that short-answer grading is rubric-based.

5. ORDERED STEPS
Learner orders:
- debugging steps
- incident-response steps
- API validation steps
- deployment checks
- test strategy

6. TRANSFER TASK
Use a new context that measures whether the learner can apply a repaired concept somewhere different.

==================================================
PYTHON SKILLS TO MEASURE
==================================================

Keep the existing skill structure unless there is a strong reason to normalize it.

The upgraded Python diagnostic must collect real evidence for:

- values / branches / loops
- functions and scope
- lists / dictionaries / sets
- iteration and comprehensions
- modules / packages / environments
- classes / OOP / composition
- exceptions / defensive programming
- files / JSON / CSV
- debugging
- testing
- HTTP / REST / JSON contracts
- SQL / parameterized queries
- readability / refactoring
- problem solving / complexity
- requirement clarification
- technical communication
- backend validation / service boundaries

A learner must NOT be able to achieve a strong readiness score simply by identifying the most professional-sounding multiple-choice option.

==================================================
P0 — SAFE PYTHON EXECUTION ARCHITECTURE
==================================================

Implement Python coding tasks safely.

Preferred MVP direction:
- browser-side Python execution
- Pyodide or another browser sandbox
- execute inside a Web Worker
- lazy-load only when a coding task is opened
- enforce execution timeout
- terminate/recreate worker after timeout
- isolate execution from React state
- no server filesystem
- no production database access
- no production environment variables
- no unrestricted browser-network capability exposed through the task harness

IMPORTANT SECURITY REALITY:

Tests shipped to the browser cannot be treated as truly secret from a determined user.

Therefore:
- do not make false claims that browser-side tests are cryptographically hidden
- do not expose correct solution code
- do not expose scoring answer keys through public APIs
- use non-displayed evaluation cases for normal UX
- document that browser execution is appropriate for prototype learning/diagnosis, not high-stakes anti-cheating certification
- true high-stakes hidden execution can later use a properly isolated remote sandbox

Do NOT introduce unsafe server-side eval, child_process execution of learner code, arbitrary containers, or production-server code execution merely to achieve “hidden tests.”

==================================================
P0 — EVIDENCE QUALITY
==================================================

The current product sometimes reaches a skill conclusion from too little evidence.

Fix this.

For important Python skills, provide at least 4 independent evidence opportunities wherever reasonable.

Prefer 5–6 evidence opportunities for high-importance skills such as:
- debugging
- testing
- reasoning
- exceptions
- functions
- data structures
- backend validation

Evidence must not simply duplicate the same question with different wording.

Vary:
- scenario
- task type
- context
- level of independence
- transfer requirement

Where appropriate, one task may map to multiple skills, but avoid over-mapping everything.

Persist enough metadata to understand evidence quality.

Each evidence item should be able to represent:
- skill ID
- weight
- task type
- scenario
- assessment bank
- assessment version

==================================================
P0 — CONFIDENCE / EVIDENCE STRENGTH
==================================================

Do not present a skill with one evidence point as equally reliable as a skill with six diverse evidence points.

Add an explainable confidence/evidence-strength model.

Use restrained labels such as:

- Limited evidence
- Moderate evidence
- Stronger evidence

Avoid claims of scientific confidence intervals.

Confidence can consider:

- total evidence count
- diversity of task types
- number of distinct scenarios
- transfer evidence
- independence of evidence

Example:

A skill with:
- 1 MCQ action
should display:
“Limited evidence — treat this as a tentative signal.”

A skill with:
- multiple scenarios
- code task
- debugging decision
- transfer task
may display stronger evidence.

Expose on skill cards and reports:

- score
- target
- evidence count
- evidence types
- confidence/evidence-strength label

==================================================
P0 — SCORING STABILITY AND TRANSPARENCY
==================================================

Improve scoring so it is understandable.

A raw assessment accuracy percentage must not simply become the skill-readiness percentage.

Use the existing weighted skill system where appropriate, but make the logic explicit and testable.

Requirements:

- score only submitted evidence
- maintain skill-specific evidence
- respect weights
- prevent one low-evidence action from producing a misleading strong conclusion
- practice answers must not directly change diagnostic proficiency
- completed lesson mastery must remain separate from assessed proficiency
- reassessment can:
  - improve
  - remain flat
  - decline

Do not artificially reward module completion.

==================================================
P0 — EXPLAIN SCORE CONTRADICTIONS
==================================================

A learner can improve overall while revealing more below-target skills.

This is mathematically possible but confusing.

Add a prominent:

“Why did my result change?”

section after reassessment.

It must explain, using actual learner data:

- overall readiness change
- improved skills
- declining skills
- unchanged skills
- newly discovered weak evidence
- newly discovered gaps
- low-confidence signals
- why total gaps may increase even when overall readiness rises

Example style:

“You improved overall from 54% to 63%. The reassessment also gave us new evidence in SQL and testing, where your current performance was below target. That increased the number of identified gaps even though your overall score improved.”

Do not use canned text when actual computed information is available.

==================================================
P1 — DEEPER LEARNING REPAIR LOOP
==================================================

The current four-question lessons are useful but too shallow to become the learner’s main preparation tool.

Upgrade the Python learning loop.

Each important Python gap should have:

1. concise concept explanation
2. intuition
3. worked example
4. guided problem
5. independent problem
6. harder application problem
7. mini workplace task
8. transfer challenge
9. mastery result
10. reassessment recommendation

Retain:
- Structured mode
- Interactive mode
- hints
- retry behavior
- honest first-response mastery logic

Practice mastery must remain separate from assessment proficiency.

The student can master the learning module while their readiness remains unchanged until fresh reassessment evidence exists.

==================================================
P1 — PERSONALIZED ACTION PLAN
==================================================

After diagnosis, do much more than display:

“Skill = 40%.”

For each prioritized gap show:

- skill
- current evidence score
- target
- confidence/evidence strength
- why the gap matters for the selected role
- what the learner appears to struggle with
- prerequisite
- recommended lesson
- recommended practice
- interview-style question
- small workplace/project task
- estimated effort

Create a data-driven 7-day repair plan.

The plan should adapt to:
- gap priority
- prerequisites
- estimated effort
- evidence strength
- completed modules

Example style:

Day 1:
Functions and validation
- 20-minute concept repair
- 2 guided exercises
- 1 independent task

Day 2:
Exceptions
...

Do not imply that seven days guarantees employment.

==================================================
P1 — ADAPTIVE VIRTUAL STAKEHOLDER
==================================================

Upgrade the workplace simulation into a more adaptive text-based manager/client interaction.

Do NOT add voice/avatar yet.

Create a reusable branching simulation engine.

The stakeholder should react to learner decisions.

Examples:

Strong clarification:
→ stakeholder reveals useful requirement detail

Weak clarification:
→ stakeholder warns that the core requirement is still unclear

Unsafe assumption:
→ stakeholder introduces a consequence/risk

Strong solution:
→ stakeholder introduces a harder constraint

Weak debugging choice:
→ stakeholder gives new failure evidence

The next interaction must not always be identical regardless of the learner’s previous action.

Branching must remain:
- deterministic
- authored
- testable
- versionable

No external LLM is required.

==================================================
P1 — MULTIPLE ASSESSMENT BANKS
==================================================

Reduce memorization.

For Python Developer create at minimum:

BASELINE:
- 2 equivalent diagnostic variants

REASSESSMENT:
- 3 equivalent reassessment variants

Requirements:

- learner should not immediately receive the same bank
- selection is role-specific
- store the chosen bank
- store assessment version
- preserve comparability as reasonably as possible
- do not silently mutate historical attempt meaning
- avoid trivially identical question rewrites

Different banks should test equivalent skills through meaningfully different contexts.

==================================================
P1 — ASSESSMENT VERSIONING
==================================================

Implement explicit versioning.

Persist for every assessment attempt:

- role
- assessment kind
- bank ID
- assessment version
- content version
- timestamp

Historical reports must use the version actually completed.

If authored content changes later, old results must remain interpretable.

Use additive Prisma migrations.

==================================================
P1 — TRANSFER VALIDATION
==================================================

Add real transfer evidence.

Example:

If initial diagnostic tests:
inventory API error handling

a transfer task can use:
payment webhook handling
log ingestion
reservation processing
customer import

The learner should apply the same principle in a different context.

Clearly label:

“Transfer evidence”

in the report where relevant.

==================================================
P1 — PREMIUM DARK UI REDESIGN
==================================================

Redesign the entire application into a dark-first, minimal, premium product.

This is a required product outcome, not optional polish.

The interface should feel like a serious modern developer/productivity SaaS used by engineering students and placement teams.

TARGET FEEL:

- dark
- minimal
- premium
- calm
- focused
- professional
- technical
- high-trust
- modern
- evidence-oriented

PREMIUM DOES NOT MEAN FLASHY.

Avoid:
- gaming aesthetics
- excessive neon
- rainbow gradients
- glowing borders everywhere
- giant decorative graphics
- excessive glassmorphism
- clutter
- cartoon visuals
- dashboard-template look
- unnecessary animation
- excessive icons

Prefer:
- near-black / charcoal surfaces
- subtle elevation
- restrained borders
- soft off-white text
- muted grays
- one restrained emerald/teal accent aligned with SkillSetu branding
- excellent typography
- disciplined spacing
- strong hierarchy

==================================================
DESIGN SYSTEM
==================================================

Create reusable semantic design tokens/CSS variables for:

- application background
- secondary background
- elevated/card surface
- hover surface
- active surface
- primary text
- secondary text
- muted text
- border
- strong border
- accent
- accent hover
- success
- warning
- danger
- info
- focus ring
- disabled state

Do not scatter raw colors throughout components.

Dark mode is the default and primary production design.

Do not simply invert the old light theme.

Maintain accessible contrast.

==================================================
TYPOGRAPHY
==================================================

Typography should carry much of the premium quality.

Create consistent hierarchy for:

- page headings
- section headings
- card headings
- task headings
- body copy
- metadata
- labels
- badges
- analytics values
- code
- report metrics

Use restrained font sizes.

Do not use oversized marketing text inside the application workspace.

Use:
- comfortable line height
- sensible content width
- consistent weights
- readable code typography

==================================================
LAYOUT / SPACING
==================================================

Create a disciplined spacing scale.

Improve:

- card padding
- vertical rhythm
- content width
- section spacing
- responsive spacing
- alignment

Avoid stretching every panel edge-to-edge on wide monitors.

Use dark negative space intentionally.

==================================================
SIDEBAR / NAVIGATION
==================================================

Redesign the sidebar into a compact premium navigation system.

Student:

- My workspace
- Workplace diagnostic
- My skill map
- Learning plan
- Readiness report

Teams:

- Placement dashboard

Requirements:

- subtle active state
- clean icons
- restrained hover
- integrated role selector
- clear current role
- keyboard accessible

On mobile:
- clean drawer/sheet
- no horizontal overflow
- accessible close/open behavior
- clear focus management

==================================================
WORKSPACE
==================================================

The main workspace should answer immediately:

1. Which role am I preparing for?
2. Where am I in the SkillSetu journey?
3. What should I do next?
4. What has changed since my last assessment?

Use a clear journey:

Diagnose → Repair gaps → Verify → Readiness

The next recommended action should be visually dominant.

==================================================
DIAGNOSTIC UI
==================================================

The diagnostic should feel like a work simulation, not a quiz.

Improve:

- stakeholder identity
- stakeholder role
- fictional company
- scenario brief
- task phase
- scenario progress
- overall assessment progress
- estimated remaining time
- relevant context/data
- learner response area

Display one primary task at a time.

Reduce distractions.

==================================================
VIRTUAL STAKEHOLDER UI
==================================================

Create a premium workplace-conversation interface.

Do not make it look like WhatsApp/social messaging.

Use:

- stakeholder identity
- role
- compact conversation blocks
- revealed constraints
- learner actions
- contextual states

Optional status labels:

- Requirement clarified
- New constraint revealed
- Risk identified
- Evidence received

Keep it professional.

==================================================
CODE TASK UI
==================================================

Make coding tasks one of the highest-quality parts of the product.

Desktop layout can include:

LEFT:
Task/problem/context

CENTER:
Code editor

BOTTOM or RIGHT:
Run results/tests

Include:

- starter code
- Reset
- Run
- timeout/loading
- execution error
- syntax/runtime error
- number of evaluation cases passed/failed
- retry

Do not expose expected final answer.

Use a polished dark developer-tool visual style.

Do not attempt a broken tiny code-editor experience on a narrow phone.

On small mobile screens show:

“This coding task is best completed on a larger screen.”

Allow the learner to continue non-code tasks if appropriate.

==================================================
SKILL MAP
==================================================

Make the Skill Map one of SkillSetu’s strongest screens.

Each skill must clearly communicate:

- skill name
- score
- role target
- evidence count
- evidence types
- confidence/evidence strength
- state

Suggested states:

- Strong
- Developing
- Priority gap
- Limited evidence

Do not rely only on color.

==================================================
LEARNING PLAN UI
==================================================

Make the learning plan a prioritized roadmap, not a grid of equally weighted cards.

For each priority display:

- priority number
- skill
- score
- target
- confidence
- why it matters
- prerequisite
- estimated effort
- next lesson
- next task
- status

Priority #1 should be obvious.

The learner should know what to do within five seconds.

==================================================
LESSON UI
==================================================

Create a focused learning environment.

Polish:

- Structured mode
- Interactive mode
- worked examples
- code
- hints
- guided problems
- independent problems
- transfer challenge
- mastery progress
- retries

Avoid generic course-platform styling.

==================================================
READINESS REPORT UI
==================================================

Create a premium analytics/report experience.

The first screen should summarize:

- role
- latest readiness
- baseline readiness
- change
- measured skills
- total evidence
- evidence confidence
- modules mastered

Then:

- strongest evidence
- key gaps
- improved skills
- declining skills
- unchanged skills
- newly discovered gaps
- limited-evidence skills
- next recommended action

Charts must serve decision-making.

Do not add decorative charts simply for visual appeal.

==================================================
PRINT / PDF REPORT
==================================================

Keep the application dark.

However, optimize printed readiness reports for paper/PDF.

A clean light/white print layout is acceptable and preferred if it improves readability.

Ensure:

- correct page breaks
- no clipped tables
- no dark wasted ink backgrounds
- professional placement-facing output
- consistent metrics

==================================================
PLACEMENT DASHBOARD UI
==================================================

Create a premium B2B analytics experience.

Do not turn it into a generic admin dashboard.

Prioritize:

- cohort readiness
- strongest skills
- weakest skills
- gap distribution
- evidence-confidence distribution
- incomplete diagnostics
- learners ready for reassessment
- improvement distribution
- completion state

Clearly label fictional/demo cohort data.

Do not silently mix real anonymous demo users with fictional cohort analytics.

==================================================
MOTION
==================================================

Use subtle motion only.

Good:
- hover transition
- expand/collapse
- panel transition
- progress update
- success state

Avoid:
- animated backgrounds
- bouncing
- excessive page transitions
- long entrance animations
- flashing/glowing effects

Respect prefers-reduced-motion.

==================================================
RESPONSIVE DESIGN
==================================================

Visually verify at:

- 1440px
- 1024px
- 768px
- 390px

Requirements:

- no horizontal page overflow
- no clipped navigation
- readable cards
- good wrapping
- usable tables
- clear mobile navigation
- readable report
- intentional code-task fallback on small screens

==================================================
ACCESSIBILITY
==================================================

Preserve/improve:

- semantic headings
- labels
- fieldsets
- keyboard navigation
- visible focus
- aria-current
- aria-expanded
- sufficient contrast
- non-color status cues
- screen-reader-friendly progress/status
- reduced motion support

==================================================
P2 — BETTER READINESS REPORT CONTENT
==================================================

Upgrade the report content to include:

- baseline score
- latest reassessment
- change
- skills improved
- skills declined
- unchanged skills
- newly discovered gaps
- evidence count
- evidence types
- confidence
- transfer evidence
- modules completed
- recommended next action

Add:

WHAT THIS RESULT DOES NOT PROVE

Examples:

- does not guarantee interview performance
- does not prove production-level engineering ability
- does not guarantee hiring
- low-evidence signals may change as more evidence is collected

Add:

WHAT SHOULD I DO NEXT?

Give 3–5 concrete learner-specific next actions.

==================================================
P2 — PLACEMENT DASHBOARD FUNCTIONALITY
==================================================

Keep all existing fictional cohorts.

Add meaningful aggregate metrics where feasible:

- readiness distribution
- major skill-gap distribution
- strongest cohort skills
- weakest cohort skills
- evidence-confidence distribution
- diagnostic completion
- reassessment readiness
- module completion
- improvement distribution

Avoid vanity metrics.

==================================================
P2 — CLEAN PRODUCTION ERRORS
==================================================

Perform a real browser walkthrough.

Investigate unexpected:

- 401
- 403
- 404
- 500
- hydration errors
- unhandled promise errors
- console errors

Important:

Expected negative-test API responses should not be confused with normal production-flow errors.

The normal learner journey should not produce unexplained network/console errors.

==================================================
P2 — ROLE ARCHITECTURE
==================================================

Shared architecture improvements should support all roles.

Python Developer receives the complete authentic task implementation now.

Data Analyst and Java Developer may temporarily keep their current decision-task-heavy content if fully upgrading them would substantially expand scope.

However, these shared systems must be generic:

- task model
- assessment versioning
- bank selection
- evidence model
- confidence model
- scoring
- report
- UI shell
- adaptive simulation engine
- storage
- APIs

Document clearly:

SHARED
vs
PYTHON-ONLY CONTENT

==================================================
P2 — SECURITY / PRIVACY
==================================================

Maintain or improve:

- HttpOnly session cookie
- ownership checks
- cross-session isolation
- same-origin protections
- Zod/input validation
- request-size limits
- security headers
- Neon persistence
- Vercel compatibility

Coding-task requirements:

- no arbitrary server execution
- no access to Neon credentials
- no environment-secret exposure
- no server filesystem
- no server shell
- no child_process execution of learner code
- no answer-key APIs
- no solution-code leakage

==================================================
DATABASE / MIGRATION SAFETY
==================================================

Before each schema migration:

- inspect existing schema
- inspect existing migrations
- verify migration is additive
- check production compatibility

Do not modify old applied migrations.

For new assessment-versioning/evidence fields:
- use nullable/default-compatible migration strategy where appropriate
- preserve existing rows

Update seed logic idempotently.

Repeated seed/setup must not destroy learner history.

==================================================
TESTING REQUIREMENTS
==================================================

Create thorough unit, integration, and Playwright coverage.

At minimum prove:

1. A Python learner answering around 50–60% correctly gets meaningful gaps.

2. Gap ordering respects prerequisites.

3. Skills with limited evidence do not appear falsely certain.

4. Confidence/evidence strength changes appropriately when additional diverse evidence exists.

5. A single wrong action cannot create a misleading high-confidence skill conclusion.

6. Python code tasks execute in the browser sandbox.

7. Infinite/long-running learner code times out.

8. Learner code cannot access:
   - DATABASE_URL
   - server filesystem
   - server runtime
   - production database

9. Coding-task expected output is evaluated correctly.

10. Short-answer deterministic rubric supports:
   - full credit
   - partial credit
   - insufficient response

11. Ordered-step task grading works.

12. Adaptive stakeholder branching changes based on previous learner choices.

13. Assessment bank selection is persisted.

14. Assessment version/content version are persisted.

15. Immediate bank reuse is avoided when alternatives exist.

16. Practice mastery does not modify diagnostic proficiency.

17. Reassessment can:
   - improve
   - remain flat
   - decline

18. Overall improvement plus newly discovered gaps produces a clear explanation.

19. Role switching preserves independent progress/history.

20. Refresh/resume works during:
   - decision task
   - code task
   - diagnostic
   - lesson
   - reassessment

21. Data Analyst regression tests remain green.

22. Java Developer regression tests remain green.

23. Placement dashboard works for all roles.

24. Invalid API input is rejected.

25. Public APIs do not return:
   - correct indexes
   - private scoring keys
   - solution code
   - database secrets

26. Readiness PDF renders correctly.

27. Dark UI works at:
   - 1440
   - 1024
   - 768
   - 390

28. No horizontal overflow exists.

29. Keyboard interaction works.

30. Normal student journey has no unexpected browser console errors.

==================================================
LIVE ACCEPTANCE JOURNEY
==================================================

Before declaring completion, run an automated browser journey against the deployed or production-equivalent build.

Use Python Developer.

Create a fresh test learner.

BASELINE:

Complete the entire diagnostic intentionally at approximately 50–60% performance.

Include:

- some correct decision tasks
- some incorrect decisions
- at least one failed coding task
- at least one successful coding task
- at least one weak short-answer response
- at least one strong short-answer response
- ordered-step task
- adaptive stakeholder branch

Verify:

- overall score is reasonable
- score is not simply raw accuracy
- real gaps are generated
- high-performing skills stay out of the repair plan
- evidence counts make sense
- evidence confidence makes sense
- weak evidence is clearly labeled
- learning plan is personalized

Then:

- refresh during the flow
- confirm resume works
- switch role and switch back
- verify histories remain separate

LEARNING:

Open Priority #1.

Use both:
- Structured
- Interactive

Request a hint.

Intentionally fail one practice response.

Retry correctly.

Complete:
- guided problem
- independent problem
- transfer problem
- mini workplace task

Verify:

- module can be mastered
- diagnostic readiness does NOT change just because the lesson was completed

REASSESSMENT:

Use a different reassessment bank.

Perform around 65–75%.

Verify:

- overall result changes honestly
- improved skills are shown
- declining skills are shown
- newly discovered gaps are shown
- evidence-confidence changes are visible
- “Why did my result change?” is correct
- transfer evidence is visible

REPORT:

Verify:
- before/after
- confidence
- evidence
- limitations
- next actions
- printable report

PLACEMENT DASHBOARD:

Verify:
- Data Analyst cohort
- Python Developer cohort
- Java Developer cohort
- fictional/demo label
- useful aggregate metrics

MOBILE:

Test at 390px.

Verify:
- no horizontal overflow
- mobile nav works
- regular assessment tasks are usable
- code task gives intentional larger-screen guidance if needed

==================================================
VISUAL QA
==================================================

Capture and inspect screenshots for:

- landing page
- onboarding
- workspace
- role selector
- Python diagnostic
- stakeholder conversation
- code task
- short-answer task
- skill map
- learning plan
- structured lesson
- interactive lesson
- transfer task
- reassessment
- readiness report
- print report
- placement dashboard
- mobile workspace
- mobile assessment

Inspect specifically for:

- inconsistent spacing
- weak hierarchy
- bad contrast
- clipped text
- poor wrapping
- oversized controls
- cramped controls
- inconsistent borders
- too many colors
- unnecessary empty space
- code-editor usability
- mobile overflow
- awkward tables
- broken print layout

Fix visual regressions before completion.

==================================================
DOCUMENTATION
==================================================

Update:

- README.md
- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- docs/STATUS.md
- docs/PENDING_QUESTIONS.md if needed

Add documentation for:

- task-type architecture
- Python sandbox/security model
- assessment bank/versioning
- evidence/confidence model
- branching simulations
- scoring
- practice vs proficiency
- transfer evidence
- dark design system
- deployment assumptions
- remaining limitations

==================================================
DEFINITION OF DONE
==================================================

Do NOT declare this project complete until:

- Python Developer diagnosis contains authentic task types beyond MCQ
- coding tasks actually execute Python safely client-side
- no arbitrary learner code executes on Vercel server
- short-answer rubric exists
- ordered-step tasks exist
- transfer tasks exist
- adaptive stakeholder branching exists
- important Python skills have substantially more independent evidence
- confidence/evidence strength is visible
- weak evidence is labeled
- scoring is transparent
- score contradictions are explained
- personalized learning plan is substantially deeper
- 7-day repair plan exists
- practice does not artificially increase readiness
- multiple Python baseline banks exist
- multiple Python reassessment banks exist
- assessment bank/version/content version are persisted
- historical attempts remain meaningful
- readiness report includes evidence/confidence/limitations/next actions
- print/PDF report remains professional
- entire production application uses the new dark-first premium design system
- UI is minimal and premium rather than flashy
- code-task interface looks like a professional developer tool
- diagnostic looks like workplace simulation rather than a quiz
- skill map has excellent visual hierarchy
- learning plan makes Priority #1 obvious
- placement dashboard is premium and decision-oriented
- dark theme has accessible contrast
- responsive layouts pass 1440 / 1024 / 768 / 390
- no major horizontal overflow remains
- Data Analyst still works
- Java Developer still works
- Python Developer existing history still works
- role histories remain independent
- Neon production migration remains safe
- Vercel production build works
- typecheck passes
- lint passes
- tests pass
- Playwright passes
- normal-journey browser console/network behavior is clean
- visual screenshots are inspected
- documentation is updated
- PR into main exists

==================================================
DO NOT FAKE COMPLETION
==================================================

If a requested capability cannot be implemented safely in the available environment:

DO NOT:
- weaken security
- run arbitrary code on the production server
- pretend browser tests are impossible to inspect
- fabricate AI grading
- fabricate employer validation
- skip failing tests
- claim an unverified feature works

Instead:

1. implement the safest substantial version
2. document the exact limitation
3. continue all independent work
4. leave the repository tested and stable

==================================================
FINAL RESPONSE
==================================================

At the end provide one structured implementation report containing:

1. Executive summary

2. Product problems fixed

3. Architecture changes

4. Database migrations

5. Python authentic-assessment design

6. Task types implemented

7. Python sandbox design

8. Sandbox security limitations

9. Evidence/confidence model

10. Scoring changes

11. Adaptive stakeholder system

12. Assessment bank/versioning system

13. Learning repair-loop improvements

14. Personalized 7-day plan

15. Transfer-evidence implementation

16. Dark premium UI redesign

17. Accessibility/responsive changes

18. Readiness report improvements

19. Placement dashboard improvements

20. Data Analyst regression status

21. Java Developer regression status

22. Python legacy/history compatibility

23. Security review

24. Test results with exact counts

25. Live browser acceptance-test results

26. Screenshots/artifacts created

27. Remaining limitations

28. Founder decisions still required

29. Production deployment status

30. Pull request link

Continue autonomously until the Definition of Done is satisfied or only genuine founder-blocking decisions remain.
