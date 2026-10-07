# Verification record

Verified on 2026-10-03 after network and process access became available.

## Automated and browser checks

- `npm test`: 38 Node tests passed. Covers authentication, sessions, CSRF/origin checks, parameterized database access, uploads, revisions, concurrent saves, drafts, publication, backups, content rendering, member relationships and date-range ordering.
- `python -m unittest discover -s test -p 'test_*.py'`: 3 migration tests passed.
- `python scripts/browser-check.py`: 33 page checks at 1440, 768 and 390 pixels passed, including tool search, empty search state, mobile navigation and JavaScript errors.
- `python scripts/browser-check.py --all`: 252 checks across all 126 routes at 1440 and 320 pixels passed. No horizontal overflow or JavaScript errors. Checks original guide redirects too.
- `python scripts/browser-cms-check.py`: real browser login, member creation, labeled work links, publication/tool selections, photo upload, draft privacy, preview, publishing, current-to-alumni move, mobile editor layout and logout passed. Uses a temporary database/account; no QA account or invented member remains in project data.
- `python scripts/audit-content.py`: 288 migrated records match a fresh migration; original structured tool/member/news/event/research objects match; 3,316 source files checksummed. 126 static pages have zero broken local file or fragment links.
- Representative accessibility audit: nine pages returned zero axe WCAG A/AA violations. Keyboard menus, image expansion/focus return, reduced motion and JavaScript-disabled profile navigation passed.
- Extended CMS workflow passed: ordered homepage curation, image crop previews/library, shared footer/contact settings, director repeatable rows and vacancy publication.
- Sharp decoding, EXIF orientation, protected media deletion and draft director migration have regression coverage. Edited legacy drafts remain unpublished and intentionally removed images stay removed.
- Browser screenshots inspected for desktop and mobile homepage layout. Broken remote images were deliberately simulated to verify placeholders.

## Docker

- Image built successfully with Node 24.
- Container ran with a read-only root filesystem, no added capabilities, no-new-privileges, persistent data volume and loopback port mapping.
- `/healthz` responded successfully; Docker reported healthy.
- All 291 records (288 originals and 3 editorial settings) were present before and after container restart.
- Compose configuration validation passed.

## Fixes discovered during verification

- Narrow-phone header overflow at 320 pixels: allow the lab name to wrap beside the menu.
- Dates containing ranges sorted below older events: sort by the first day while retaining the original displayed date.
- Arrow glyphs absent in the installed font: primary link arrows now use inline SVG.
- Earlier independent review fixes cover stale exported pages, conference metadata, relative legacy links, tool URL validation, editable alumni membership, guide redirects and reserved routes.

## Known limits and source issues

- External tool links: 17 of 36 returned successful HTTP responses; 19 returned server errors or redirect loops. Every assigned destination is unchanged. See [availability report](external-tool-availability.md). HTTP success does not verify tool functionality.
- Source event dates conflict for Spring SRS 2026 and PSC Showcase 2026. Both source values remain in the migration report; the listing value drives display pending editorial correction.
- Six original research detail bodies are empty; no research claims were invented to fill them.
- Large Box media packages have not been imported. 116 original images are cached and optimized locally; four unavailable images retain replaceable fallbacks.
- The hosted review is a static snapshot. The working SQLite CMS requires the supplied Node/Docker application; it is not a backend on static hosting.
- These checks do not certify exhaustive security or compatibility across every browser. Chromium desktop/tablet/mobile was tested; Safari and Firefox were not.
- The original Express/Nunjucks application was inspected, not launched. Its source remains untouched.
