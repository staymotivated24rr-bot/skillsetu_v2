# Python workspace entry — 1 November 2026

The Target role dropdown now displays **Python Diagnostic v2** for the existing `python-developer` identity. The Python workspace card and sidebar entry open `/diagnostic-v2`; the card shows the selected v2 bank's competency count and adaptive range instead of the older workplace-case counts. The competency preview follows that same public display metadata.

Data Analyst and Java keep their existing workplace diagnostics. Internal role IDs, banks, reports, lessons and proficiency separation are unchanged. Earlier Python workplace reports remain reachable through the existing skill-map/report navigation; an in-progress older workplace attempt has its own explicit resume action. Opening v2 does not create a legacy assessment or transfer proficiency. V2 manages its own existing session/resume/report flow.

The entry is shown only when Diagnostic v2 is enabled. The unapproved eight-area presentation is chosen only through the existing local preview/default gate; no hosted release flag changed. The root page renders dynamically so runtime flags are not frozen into build-time navigation.

Verification:

- Full unit/integration suite: **194/194, 19 files, 70.27 s**.
- Desktop/mobile route regressions: **2/2, 8.0 s**, 1440px and 390px. Verified target label, v2 metadata, other-role entries, main link, first question, sidebar link, same-run resume and zero legacy proficiency credit.
- Lint, types and guarded production compilation passed. Build explicitly skipped migration/seed. Existing local diagnostic runtime restored with `npm run dev:diagnostic` on port 3002.
- Inspected [desktop](workspace-desktop.png) and [mobile](workspace-mobile.png) screenshots. Responsive transitions disabled during capture to avoid transient off-canvas drawer frames.

No migration, bank edit, historical regrading, production operation, push or deployment. Tests used synthetic identities; the broader regression suite used the separate test database.
