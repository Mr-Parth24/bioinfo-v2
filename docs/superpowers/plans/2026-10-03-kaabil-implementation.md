# KAABiL implementation plan

> **For agentic workers:** Use superpowers:executing-plans task-by-task.

**Goal:** Implement the approved recognizable KAABiL design and routine editorial workflows.
**Architecture:** Keep Node/SQLite and the existing validated record boundary. Add isolated presentation, editorial-settings and media modules; additive initialization must not overwrite existing edits.
**Tech Stack:** Node 24, SQLite, vanilla browser JavaScript/CSS, Sharp for decoded media validation and responsive variants, Docker.
**Spec:** ../specs/2026-10-03-kaabil-redesign.md

## Global constraints
- Preserve 288 source records, IDs, source provenance, tool destinations, and original logo.
- Distinct pages, white/navy/magenta/blue, readable text, keyboard navigation and reduced motion.
- Recurring content updates through CMS, stable layout/security through code.
- Hosted review remains a static snapshot; SQLite CMS runs in Docker.

## Review focus
- Unpublishing selected homepage content never leaks a draft: editorial selection tests.
- Schema additions do not overwrite existing edits: additive initialization test.
- An image used by a revision cannot be permanently removed: media lifecycle test.
- Cropped portraits and uncropped figures keep their intended composition: browser preview tests.
- Unknown/contradictory source dates do not become invented facts: source reconciliation and list tests.

## Tasks
- [x] Editorial schema and defaults: add `src/editorial.mjs`, extend `src/content.mjs`, `src/store.mjs`; validate homepage selections, opportunities, site settings, repeatable profile rows, image controls and relationships. Tests in `test/editorial.test.mjs` assert publication filters, deadlines, selected order and additive migration.
- [x] Identity and layout: add `src/presentation.mjs`, replace shared header/footer/home, update public CSS and JS; use original asset manifest. Verify distinct routes, keyboard menus, narrow widths and retained links.
- [x] Director and contextual content: extract education, appointments, awards and overview from source into additive structured defaults; render all fields and related work. Source text and link reconciliation test.
- [x] Media lifecycle: Sharp decoding and display variants; Store media metadata and usage including revisions; authenticated list/upload/delete endpoints; file path allowlist. Tests cover malformed images, used-image deletion, variants and persistence.
- [x] Editor UI: singleton homepage/settings editing, repeatable profile rows, ordered selected entries, image preview/focal/fit controls and media selection; exercise actual create/edit/publish behavior in Chromium.
- [x] Verify and publish: content audit, unit/integration tests, all-route responsive browser crawl, new CMS workflow, accessibility/keyboard checks, Docker build/run; update docs and publish exact pushed source to the existing private Site.

Execution follows the approved design in the current session. Each task is committed with its verification evidence; final review precedes publication.

Completion evidence is recorded in ../../verification.md. Private review deployment succeeded on 2026-10-03.
