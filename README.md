# KAABiL website — version 2

The new website for the **Kaundal Artificial Intelligence & Advanced Bioinformatics Lab (KAABiL)** at Utah
State University, with a built-in content editor ("Content Studio").

It replaces the original site ([`usubioinfo/bioinfo`](https://github.com/usubioinfo/bioinfo): Express +
Nunjucks, edited in VS Code and published with `bxz update` on the HPC). All 288 records from that site were
migrated: news, events, people, publications, tools, research areas and pages.

| | |
|---|---|
| **Stack** | Node.js 24 (no framework), SQLite (`node:sqlite`), Sharp for images, plain HTML/CSS/JS |
| **Editing** | Sign in at `/admin`, edit, publish — changes are live immediately, no rebuild |
| **Runs on** | Docker / Docker Compose (intended for the lab server), or plain `npm start` |
| **Preview** | Static snapshot on GitHub Pages: <https://mr-parth24.github.io/bioinfo-v2/> (deploys from `main`) |
| **Status** | Redesign, CMS, security hardening and Docker setup complete; not yet deployed on the lab server |

---

## Contents

1. [Quick start](#quick-start)
2. [Editing the website (Content Studio)](#editing-the-website-content-studio)
3. [Images: old and new](#images-old-and-new)
4. [GitHub workflow and the Pages preview](#github-workflow-and-the-pages-preview)
5. [Deploying on the lab server (Docker)](#deploying-on-the-lab-server-docker)
6. [What the site contains](#what-the-site-contains)
7. [Project structure](#project-structure)
8. [Design system](#design-system)
9. [Security](#security)
10. [Testing and checks](#testing-and-checks)
11. [Backups and command-line tools](#backups-and-command-line-tools)
12. [Known issues and next steps](#known-issues-and-next-steps)
13. [History of this version](#history-of-this-version)

---

## Quick start

Needs **Node.js 24+**. (On Node 22.13+ the site runs, but use `node --test test/*.test.mjs` instead of `npm test`.)

```sh
npm ci            # install
npm start         # http://localhost:3000  (editor: http://localhost:3000/admin)
npm test          # 48 tests, about 5 seconds
```

The first start creates `data/content.sqlite`, imports `content/seed.json` once, and fills in the
editorial content from `content/content-updates.json` (see [Content updates](#content-updates)).
Restarts never overwrite edits.

Create an editor account (there is no default password and no public sign-up):

```sh
read -r -s -p 'New editor password (14+ characters): ' PW; printf '\n'
printf '%s' "$PW" | node scripts/manage.mjs create-user you@usu.edu; unset PW
```

Running the same command again resets that account's password and signs it out everywhere.

**With Docker instead:**

```sh
docker compose up --build -d
printf '%s' "$PW" | docker compose exec -T website node scripts/manage.mjs create-user you@usu.edu
```

---

## Editing the website (Content Studio)

Go to `/admin` and sign in. The left sidebar lists the content types:

| Studio section | What it controls |
|---|---|
| News, Events, Publications | Articles, event pages with galleries, papers / conferences / editorials |
| Research Areas | The six research pages: text, image, linked tools and publications |
| Tools & Databases | The tools directory: name, description, category, screenshot, link |
| Opportunities | Open positions (shown on Opportunities, Contact and the homepage) |
| People Directory | Members: role, **People page group**, department, years, photo, **profile links** (Scholar, ORCID, LinkedIn, GitHub, website), education/experience rows, related publications and tools |
| Site Pages | About, lab overview, contact page text, research program text |
| Homepage & Director | Homepage headline, photo, buttons, announcement bar, latest-updates mode (automatic / selected / hidden), event and opportunity panels; footer contact details and links; Dr. Kaundal's profile (biography, education, appointments, awards, links) |

How editing works:

- **Draft vs Published.** Drafts are private; *Live Preview* shows a draft to signed-in editors only.
  Choose *Published* and save to put it on the site immediately.
- **Revisions.** Every save is kept; any earlier version can be restored.
- **Conflicts.** If two people edit the same entry, the second save is refused instead of silently
  overwriting.
- **Rich text** has formatting buttons; pasted HTML is cleaned (scripts, styles and unsafe links removed).

What is **not** editable in the studio (change it in code): menu labels, section page titles/intros
("Tools & databases", "News"…), homepage section headings, the authorship-key meanings, layout and colours.
The full list is in [`docs/architecture.md`](docs/architecture.md#what-editors-can-change-in-the-content-studio).

### Old way vs new way

| Task | Original site | Version 2 |
|---|---|---|
| Change news, people, events… | Edit `.njk` in VS Code → push → HPC `sudo su dock_user` → `bxz update bioinformatics` | Sign in at `/admin` → edit → Published → save |
| Add a photo | Copy to `/opt/webassets/…`, type the Raikou URL into the code | Drag the photo onto the entry |
| Change design or code | Push → `bxz update` | `git pull && docker compose up --build -d` (content kept) |

---

## Images: old and new

- **Existing photos** are links to the Raikou image server (`https://bioinfocore.usu.edu/raikou/…`), loaded
  straight from there as before. 120 of them also have compressed local copies in `public/media/`
  (mapped by `public/asset-map.json`), which show even if Raikou is down. **Keep Raikou running.**
- **New photos uploaded in the studio** are validated (PNG/JPEG/GIF/WebP, ≤ 10 MB), stripped of
  EXIF/GPS metadata, resized into 320/640/1200 px WebP versions, stored in `data/uploads/` (the
  `bioinfo_data` Docker volume) and served by the site at `/uploads/…`. Nothing goes to Raikou.
- You can still paste any image URL (e.g. a Raikou link) into an entry's *Image URL* field.
- *Media Assets* in the studio lists uploads and where each is used; an image in use cannot be deleted.

There is no separate image database to set up: the SQLite file stores the image addresses, the volume
stores the files.

---

## GitHub workflow and the Pages preview

```
work branch  ──push──▶  pull request  ──merge──▶  main  ──▶  GitHub Pages redeploys (~1 min)
```

- **`main`** is what the live preview shows. Pages deploys **only from `main`**
  (`.github/workflows/pages.yml`; Settings → Pages → Source must be **GitHub Actions**).
- Work happens on a branch (Claude sessions use `claude/website-update-help-r254ix`), then a pull request
  is merged into `main`.
- Every push runs `npm test`; the Pages build also runs the static export.
- **`.github/workflows/docker.yml`** builds the real Docker image on every push, checks it runs as a
  non-root user with a read-only filesystem, renders the main pages, runs the security probe against it
  and checks that content survives a rebuild.

**The Pages site is a static snapshot.** It is built from the committed `data/content.sqlite` and
`data/uploads/` when they exist, otherwise from `content/seed.json` + `content/content-updates.json`.
It has no editor. Build the same snapshot locally with `npm run preview:export` and open `preview/index.html`.

To publish local CMS edits to Pages:

1. Stop the server (Ctrl+C), then run `npm run manage checkpoint`. SQLite keeps recent edits in
   `content.sqlite-wal`; this folds them into `content.sqlite`.
2. Commit `data/content.sqlite` and `data/uploads/`, and merge to `main`.

Never commit `content.sqlite-wal` / `-shm` (they are git-ignored). A stale WAL committed next to a newer
database makes it read as corrupt ("database disk image is malformed") and the Pages build fails.

---

## Deploying on the lab server (Docker)

Full steps, backups and rollback: [`docs/operations.md`](docs/operations.md).

1. Put the project on the server and create `.env`:
   ```sh
   NODE_ENV=production
   APP_ORIGIN=https://<the public domain>   # must be https in production
   PORT=3000
   ```
2. `docker compose up --build -d`, then create editor accounts (see Quick start).
3. Put the university **HTTPS reverse proxy** in front of `127.0.0.1:3000`. To reuse the old container's
   network address (`docker-br0`, `172.20.0.2`, from `dockerbuilderprod.sh`), use the
   `compose.override.yaml` shown in `docs/operations.md`.
4. Updating code later: `git pull --ff-only && docker compose up --build -d`.
   **Never run `docker compose down -v`** — `-v` deletes the database and uploads.

The container runs as the unprivileged `node` user, with a read-only filesystem, no Linux capabilities,
`no-new-privileges`, and memory/CPU/process limits (`compose.yaml`). Only the `bioinfo_data` volume is
writable. Health check: `GET /healthz`.

---

## What the site contains

| Route | Page |
|---|---|
| `/` | Hero, lab-at-a-glance counts, research areas, latest news + event + opportunity, tool categories, recent papers, director, join band |
| `/research`, `/research/<area>` | Program overview; each area has written content, numbers, a tools table and its publications |
| `/people`, `/people/alumni`, `/people/<name>`, `/people/rakesh` | Directory grouped by Staff / PhD / Master's / Undergraduates…; rich profiles; director profile |
| `/publications` (+ `/conferences`, `/editorials`) | Grouped by year; search, year-range chips, author-role badges with highlight/filter, DOI and copy-citation |
| `/tools` | 36 tools, colour-coded by category, with screenshots, descriptions, filter chips and hover glow |
| `/news`, `/events` | News in General / Science / Media sections with tabs; events grouped by year |
| `/about`, `/about/overview`, `/contact`, `/opportunities`, `/search` | About, contact, openings, site search |
| `/admin` | Content Studio (not indexed by search engines) |

Content counts: 55 news, 18 events, 22 people, 6 research areas, 36 tools, 54 papers, 85 conference
presentations, 4 editorials, 8 site pages — 126 public routes.

---

## Project structure

```
src/
  server.mjs         Node HTTP server: seeding, content updates, graceful shutdown
  app.mjs            Request router, security headers, auth, CSRF, editor API, asset allowlist
  render.mjs         Page templates + router (research, people, publications, tools, news, events, …)
  presentation.mjs   Shared building blocks: icons, images, page header, navigation, header, footer,
                     homepage, director profile, opportunities, category colours (toneFor)
  admin-render.mjs   Studio shell (app bar, sidebar, editor form)
  content.mjs        Content schema: FIELDS, COLLECTION_FIELDS, SETTINGS_FIELDS, validateRecord()
  editorial.mjs      Settings defaults, date handling, homepage selection, content updates
  security.mjs       Password hashing, URL checks, HTML escaping, rich-text sanitizer
  store.mjs          SQLite: records, revisions, users, sessions, rate limits, media, metadata
  uploads.mjs        Upload validation, re-encoding, responsive variants
public/
  site.css           The whole public design (tokens at the top)
  site.js            Menus, filters, news tabs, author-role highlight, glow, image viewer, motion
  admin.css / admin.js   Content Studio
  fonts/             Inter + Source Serif 4 (self-hosted; the CSP forbids external fonts)
  media/, asset-map.json  Local copies of original images
content/
  seed.json              The 288 migrated records (archival; imported once into a new database)
  editorial.json         Homepage, site and director settings (added once)
  content-updates.json   Research area text, related tools/papers, tool descriptions (fills empty fields once)
scripts/
  manage.mjs             create-user, inventory, export, import, backup
  export-preview.mjs     Static snapshot for GitHub Pages
  cms-e2e.cjs            Browser test of the whole editor workflow
  security-probe.mjs     Attacks a running copy (SQLi, XSS, CSRF, traversal, uploads…)
  migrate.py, *.py       Original migration and older browser checks
test/                    Node tests (*.test.mjs) and the Python migration test
docs/                    Architecture, operations, security, redesign plan, migration report
.github/workflows/       pages.yml (preview deploy), docker.yml (image build + security check)
```

### Content updates

`content/content-updates.json` holds editorial text written after the migration. At startup
`applyContentUpdates()` copies each value **only into empty fields**, once per database (a marker is
stored), so editors' changes — including deliberately emptied fields — are never overwritten. To ship new
default content, add a new update set rather than editing `seed.json`.

---

## Design system

Research-institute style rather than a startup landing page (rules in
[`docs/redesign-plan.md`](docs/redesign-plan.md)):

- **Type:** Source Serif 4 headings, Inter body. **Colour:** USU navy + KAABiL crimson accent, warm
  neutrals; per-category tones for tools (`toneFor()` in `presentation.mjs`, `[data-tone]` in CSS).
- **Components:** page header with breadcrumbs, cards, chips, tabs, timelines, data tables, `.glow`
  (gradient border that follows the pointer).
- **Motion:** reveal on scroll, count-up numbers, view transitions — all disabled for
  `prefers-reduced-motion`.
- **Accessibility:** one `<h1>` per page, alt text, keyboard-operable menus, WCAG 2 AA contrast
  (checked with axe).
- **CSP rule:** no inline `style="…"` attributes and no `data:` images — put styling in `site.css`; set
  dynamic values from JavaScript through the CSSOM (`el.style.setProperty`).

---

## Security

Summary (details and the operator checklist: [`docs/security.md`](docs/security.md)):

- SQL injection: every query uses bound parameters.
- XSS: all output escaped; rich text rebuilt from an allowlist; strict Content-Security-Policy.
- CSRF: session cookie + per-session token + origin check; cookies `HttpOnly`, `SameSite=Strict`,
  `Secure` over HTTPS.
- Sign-in: scrypt passwords (14+ chars), 10 attempts / 15 min per IP and per account.
- Uploads: signature check + decode + re-encode (drops EXIF/GPS), sandboxed serving.
- Headers: CSP, HSTS (HTTPS), X-Frame-Options, nosniff, COOP/CORP, Permissions-Policy, `robots.txt`.
- Container: non-root, read-only, no capabilities, resource limits.

Known limits: every editor can publish and delete (no roles, MFA or SSO yet).

---

## Testing and checks

```sh
npm test                                   # 48 Node tests: routes, auth, CSRF, drafts, uploads,
                                           # revisions, sanitizer, headers, content updates, research pages
npm run preview:export                     # builds all 126 routes into preview/
python -m unittest discover -s test -p 'test_*.py'   # migration test (Python 3.12+)
```

Against a running site, with a **disposable** editor account (not production):

```sh
npm i --no-save playwright && npx playwright install chromium
EDITOR_EMAIL=… EDITOR_PASSWORD=… node scripts/cms-e2e.cjs          # 15 editor-workflow checks
EDITOR_EMAIL=… EDITOR_PASSWORD=… node scripts/security-probe.mjs   # 63 attack checks
```

If the probe says sign-in is rate-limited, wait 15 minutes — that is the brute-force protection.

---

## Backups and command-line tools

```sh
node scripts/manage.mjs inventory                       # record counts
node scripts/manage.mjs checkpoint                      # fold the WAL into content.sqlite (before a commit)
node scripts/manage.mjs backup  /safe/content.sqlite    # database (content, accounts, revisions)
node scripts/manage.mjs export  /safe/content.json      # content as JSON
node scripts/manage.mjs import  /safe/revised.json      # validated, atomic import
```

A full backup is the SQLite backup **plus** `data/uploads/` (in Docker: the `bioinfo_data` volume).
Backups contain password hashes — keep them private. Restore steps: [`docs/operations.md`](docs/operations.md).

---

## Known issues and next steps

- **Not yet on the lab server.** Docker setup is verified in CI; deployment needs the server, HTTPS proxy
  and DNS (see Deploying).
- **Content to review:** research-area text was written from the lab's tools, paper titles and news —
  have the lab check the wording. Newer papers (2023–2025) have no authorship marks. One person's
  category reads "Ungraduate". Event dates conflict in the source for Spring SRS 2026 and PSC Showcase.
- **People relations are empty:** no member has publications, tools, education or links attached yet;
  profiles show those sections once editors add them.
- **Images:** many galleries still load from Raikou; a one-time import of Raikou images into local storage
  could be added (must run on the server).
- **Security follow-ups:** revoke the mail-service credential the old site exposed; add rate limiting at
  the proxy; consider editor roles / SSO.
- **Leftover scratch files** in the repo root (`homepage_test.html`, `news.html`, `update-*.cjs`) are from
  before the redesign and are obsolete — the `update-*.cjs` scripts patch old templates and must not be run.

---

## History of this version

October 2026, in order:

1. Bug fixes in the first v2 (invisible homepage section, CSP-blocked slideshow, layout issues).
2. GitHub Pages preview workflow.
3. Full redesign: new templates and stylesheet, navigation, homepage wired to every homepage setting,
   all section and detail pages, Content Studio chrome; fixed saving after an image upload.
4. Accessibility pass (axe) and the browser editor-workflow test.
5. Security hardening, attack probe, Docker CI check.
6. Publications: year-range chips, author-role badges with highlight and filter.
7. People: grouped directory, rich profiles with links, education/experience, publications and tools.
8. Research areas: written content, tools tables, related publications; tool descriptions.
9. Tools: colour-coded categories, framed screenshots, hover glow.

More detail: `git log`, [`docs/redesign-plan.md`](docs/redesign-plan.md),
[`docs/architecture.md`](docs/architecture.md), [`docs/progress.md`](docs/progress.md).
