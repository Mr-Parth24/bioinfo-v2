# Bioinfo version 2

Build an independent preview from the uploaded bioinfo-master archive. Preserve the original archive and source at ../bioinfo-source; never deploy the old browser scripts or their mail credential. The user's repeated direction to start implementation authorizes local, reversible development of this design.

## Content and routes

Import all real records in the source data files, including publications, editorials, conference presentations, news, events, research, staff and alumni, and tools. Keep original fields and provenance. Preserve tool destinations exactly, trimming accidental surrounding whitespace only. Preserve article bodies and image references; flag conflicting source data for human review rather than inventing facts. Preserve historical URLs or give explicit redirects. No external tool is reimplemented.

## Presentation

An academic editorial design: warm off-white, deep USU-inspired navy, forest green, restrained lime accents and soft gradients. Large typographic hierarchy, generous spacing, fine rules, accessible motion and focus states. No invented awards, data or affiliation changes. Use source branding KAABiL until the user confirms a different name. Mobile navigation, readable research pages, searchable/filterable directories, persistent archive access, and correct external links. Missing images have an intentional fallback.

## Backend and editor

Use Node 24 built-in HTTP, crypto and SQLite. No third-party packages are available offline. This is a small custom CMS, not Payload or a claim of equivalent maturity. Server-render public pages. Store structured records and revisions in SQLite; initial content is versioned JSON. Admin authentication uses salted scrypt hashes, opaque expiring sessions, HttpOnly/SameSite cookies and CSRF/origin checks. No default password or public account creation. Prepared SQL statements, allowlisted rich text, field validation, request size limits, no arbitrary file access, validated image uploads. Edits have optimistic concurrency and draft/published status. Persist uploads and data outside the image. CLI supports user creation, JSON export/import and backup.

## Delivery

Dockerfile and Compose, local start command and tests, content inventory and migration report. Original site remains untouched. No public deployment or merge. The sandbox currently blocks outbound requests and even opening local listening sockets: run handler-level integration tests without sockets and create a static review export. Attempt a local preview only through permitted execution. Do not claim browser/Docker verification unless actually completed.

## Acceptance

Every source collection is represented with count and provenance; every tool URL matches its source; every imported route renders; content round trips through the editor/store; drafts do not leak; anonymous writes fail; malicious HTML/URLs do not execute; concurrent edits cannot silently overwrite; backups restore; public pages have usable mobile layout and reduced-motion support.
