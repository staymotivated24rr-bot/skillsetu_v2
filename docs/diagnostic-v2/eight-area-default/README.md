# Eight competencies are eight diagnostic areas

The founder requested that the visible diagnostic follow the imported competencies instead of presenting them through six older areas. The normal local `/diagnostic-v2` entry now selects the eight-area draft in the explicitly configured development server.

1. Python Fundamentals
2. Collections & Mutation
3. Functions & Recursion
4. Object-Oriented Python
5. DSA Using Python
6. Debugging & Exceptions
7. Testing & Validation
8. Practical Python Coding

There is no eight-to-six compression or cross-area score transfer. New eight-area runs use the already implemented 24/24/30 policy and three-per-area coverage. The six-area 18/24/30 assessment is retained for historical attempts and explicit legacy inspection.

The intro count, names and task range derive from public presentation metadata checked against both authored banks. Once an attempt exists, its own snapshot-derived competency names, count and policy drive the UI. Learning-map wording uses the actual count; report cards already use the saved report findings. A historical six-area bookmark displays six areas and explicitly explains that a new diagnostic uses eight. It never relabels, regrades or changes old results.

## Local runtime

Local server: `http://localhost:3002/diagnostic-v2`, bound only to 127.0.0.1 and using the disposable audit database. The founder's request authorizes this local development default; it does not approve the questions for public learner use. The draft banner remains visible.

Startup shell configuration:

```powershell
$env:DIAGNOSTIC_STARTER_V3_PREVIEW='true'
$env:DIAGNOSTIC_DRAFT_ENV='local'
$env:DIAGNOSTIC_STARTER_V3_DEFAULT='true'
node --env-file=.env.audit node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3002
```

Stop an existing verified local server on that port before restarting. The ordinary URL now opens eight areas without a preview query. `?preview=legacy` explicitly opens the six-area entry. Existing `?run=...` bookmarks retain their original competencies. Refresh the open page to receive the new local build.

Tracked `.env.example` defaults remain disabled. The default-selection helper requires all local draft checks, a loopback DB, the extra opt-in flag and no VERCEL environment. A hosted deployment cannot be enabled by this default flag alone. No production data, migration, bank content, answer keys or published snapshots changed in this follow-up.

Earlier starter-v3 provenance records the previous disabled local runtime. This follow-up supersedes only that local runtime selection; expert approval and real-learner pilots remain outstanding.

## Verification

- Full unit/integration suite: **158/158**, 15 files, **77.54 s**.
- Repository lint, TypeScript and production build: passed. Build explicitly skipped migration and seed.
- Two relevant browser journeys: **2/2**, **12.9 s**. Verified the normal URL's eight names, policy, refresh/resume, eight-area completion/report, and preserved six-area bookmark/resume.
- Additional screenshot-only rerun: **1/1**, **5.1 s**.
- Desktop introduction and mobile question screenshots were visually inspected in `previews/`.
- Earlier comprehensive 15-browser and 306-code-key results remain documented in `../starter-v3/TEST_RESULTS.md`; those full suites were not rerun in this display/default-only follow-up. Authored bank and grading/selection content did not change.

No deployment, merge, push, public enablement or production parity claim. Independent approval is still required for the draft questions.
