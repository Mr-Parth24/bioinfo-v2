# Ledger — docs/superpowers/plans/2026-10-02-bioinfo-v2.md

- Original source extracted and inspected. No external assets retrieved. Original dependencies absent; baseline cannot launch without package installation.
- Ruling: use a separate project from the ZIP (no upstream git history available), preserving original files untouched.
- Ruling: implement a small offline-capable CMS using Node 24 built-ins; reassess a mature CMS before production if broader editorial features become necessary.
- Ruling: proceed with locally authorized work per the user's repeated explicit instructions rather than request additional design confirmations.
- Pre-flight: importer emits seed.records; store consumes records; renderer and editor consume store records. IDs and original metadata remain stable through this boundary.

- Task 1 complete: migration tests 3/3; 288 real records; all 36 tool destinations preserved.
- Task 2 complete: SQLite content, auth/session primitives, revisions and validation covered by tests.
- Task 3 complete: public templates, responsive CSS, filters and portable export implemented. Browser visual QA remains blocked by sandbox permissions.
- Task 4 complete: editor, uploads, CLI, Docker configuration and maintainer guides authored. Docker runtime verification remains outstanding.
- Final review: independent reviewer found six concrete issues. Fixed stale static files, omitted conference metadata, relative tool URL crash, dropped relative article links, immutable alumni grouping behavior, and missing legacy guide redirects. Added a canonical/reserved route guard as well. Seven RED→GREEN regressions; full Node suite 20/20 and migration suite 3/3.
- Ruling: hosted review uses the static snapshot, while the editable Node/SQLite application remains the Docker deliverable. Sites does not run the Node SQLite process.
- Ruling: preserve source event date conflicts for human review rather than fabricate corrections; use listing metadata in public display.
- Final: no deferred minor code-review findings. External media access, browser/Docker execution and production integrations remain explicitly unverified.

## Structured member profiles

Added membership status, roles, years, research interests, dissertation fields, labeled work links, and validated references to publications/tools. Editor uses searchable selections and link form rows. Five tests cover profile rendering, directory moves, validation, draft privacy, and transactional forward-reference imports. Browser verification and hosting remain pending actual permission-enabled execution.

## Full-access verification

Browser page checks and the complete CMS workflow now pass. Docker build, healthy startup, record inventory, and restart persistence verified. Full crawl covers all 123 routes at 1440/320 pixels. Fixed narrow-header overflow and event-range sorting. External tool status recorded separately; assigned destinations retained. See verification.md for current evidence, superseding earlier permission-blocked status.

## 2026-10-03 approved redesign

Implemented the approved identity, multi-page presentation, director profile and contextual links. Preserved all 288 baseline records; added three editorial settings without overwriting existing edits. CMS includes homepage curation, shared contact/footer fields, repeatable director rows, vacancies and image library/crop controls. Independent review fixes protect draft migration and referenced media, invalidate stale image variants, normalize orientation, and display normalized event dates. Final verification: 38 Node tests, 3 migration tests, 252 responsive page checks, extended CMS browser workflow and 9-page accessibility audit passed. Updated private preview deployment succeeded at the existing URL; this static snapshot does not host the Docker CMS.
