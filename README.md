# KAABiL / USU Bioinfo — version 2 preview

A separate redesign of the uploaded `usubioinfo/bioinfo` website. Includes server-rendered public pages, a structured content editor, SQLite storage, revisions, draft previews, image uploads, and Docker deployment. The supplied source remains unchanged in `../bioinfo-source/bioinfo-master` in the development workspace.

This is a **custom lightweight CMS**, not Payload. It runs on Node 24 with Sharp for validated image decoding and responsive variants. It is a review build, not a production security certification. The original site, tool applications, and production server have not been modified.

## Maintainer documentation

- [Architecture and data flow](docs/architecture.md)
- [Operations, updates, backups and restoration](docs/operations.md)
- [Migration report](docs/migration-report.json)
- [Verification record](docs/verification.md)

## Start locally

Install Node.js 24 or later, then run from this directory:

```sh
npm ci
npm start
```

Open `http://localhost:3000`. The server binds to loopback by default. Seed content imports only when a new database is created; restarts do not overwrite editorial changes.

To view the static export without running a server:

```sh
npm run preview:export
```

Open `preview/index.html`. Navigation is rewritten for local files. This export has no editor backend. Remote images can load from their original server; unavailable images have a visual fallback. Static exports must be regenerated after content changes.

## Create an editor account

There is no default password or public registration. On Bash:

```sh
read -r -s -p 'New editor password (14+ characters): ' BIOINFO_EDITOR_PASSWORD
printf '\n'
printf '%s' "$BIOINFO_EDITOR_PASSWORD" | node scripts/manage.mjs create-user editor@your-university.edu
unset BIOINFO_EDITOR_PASSWORD
```

Visit `http://localhost:3000/admin`. Accounts are individual; each currently has full editorial permissions. Repeating `create-user` resets that account's password and revokes its sessions. Passwords are salted and hashed with scrypt; no password is stored in source code.

Choose a collection, add or edit an entry, upload images, and save. Drafts stay out of public pages; Preview shows the draft to the signed-in editor. Choose Published and save to update the website immediately, with no Docker rebuild. Revisions allow loading an earlier version and saving it as a new revision. Simultaneous edits produce a conflict rather than silently overwriting another editor's work.

Images uploaded to this site are public assets once their URL is known, even when used by a draft. Do not upload private documents. PNG/JPEG/GIF/WebP up to 10 MB are accepted; SVG and arbitrary document uploads are excluded.

## Docker preview

```sh
docker compose up --build -d
```

Open `http://localhost:3000`. The Compose port is bound to the host's loopback interface. Persistent database, revisions, accounts, and uploads live in the `bioinfo_data` named volume.

Create an editor using the same silent password input:

```sh
read -r -s -p 'New editor password (14+ characters): ' BIOINFO_EDITOR_PASSWORD
printf '\n'
printf '%s' "$BIOINFO_EDITOR_PASSWORD" | docker compose exec -T website node scripts/manage.mjs create-user editor@your-university.edu
unset BIOINFO_EDITOR_PASSWORD
```

Changing application code:

```sh
docker compose up --build -d
```

This retains the named volume. **Do not use `docker compose down -v`** unless intentionally deleting the entire site's persisted data.

For a public university preview domain, put the service behind your existing HTTPS reverse proxy. Set `NODE_ENV=production` and `APP_ORIGIN=https://your-exact-preview-domain` in `.env`. Production startup requires HTTPS in APP_ORIGIN; sessions then use Secure cookies. Set PORT and APP_ORIGIN consistently for local previews. TLS termination, university SSO, email delivery, and production routing are deployment integrations, not configured in this archive.

The login limiter uses the socket IP, not arbitrary forwarded headers. Behind a reverse proxy, users may share that limiter. Configure per-client rate limiting at the trusted proxy before wider use. Avoid running multiple replicas against one SQLite volume; move to a managed relational database if concurrent load requires scaling out.

## Command-line content and backups

```sh
node scripts/manage.mjs inventory
node scripts/manage.mjs export /safe/location/content-2026-10-02.json
node scripts/manage.mjs backup /safe/location/content-2026-10-02.sqlite
node scripts/manage.mjs import /safe/location/revised-content.json
```

Export/import uses structured JSON; it is optional for administrators. Regular editors use forms. Imports update matching IDs, retain omitted records, validate data, and commit atomically. Existing outputs are never overwritten by backup/export. Back up before bulk import.

A SQLite backup includes content, accounts, sessions, and revision history. Keep it private. Copy `data/uploads/` as well; content JSON alone is not a full backup. With Compose, run the backup command inside the container and copy both database and uploads out of the volume. Restore with the server stopped: retain the old data as a rollback copy, replace `content.sqlite` with the backup, remove stale WAL/SHM sidecars associated with the replaced database, restore uploads, then start the service. File ownership must allow the container's `node` user (UID 1000) to write to the data directory.

## Source migration

- 36 tools with exact original destinations (only leading/trailing URL whitespace trimmed).
- 55 news records, including two source articles absent from the original listing arrays.
- 18 events, 22 people, and 6 research areas.
- 54 papers, 85 conference presentations, and 4 editorials.
- 8 site/overview/documentation records.
- 288 total real records; three empty conference placeholders retained only in the migration report.
- 126 static routes, including listings and compatibility publication paths.

See `docs/migration-report.json` for source checksums, collection counts, image references, repaired source syntax, and conflicting source fields. Original record fields and detailed event metadata remain attached to their imported records. The original ZIP is the archival authority; the new app does not serve old source files or JavaScript.

Regenerate a migration in a separate review workspace with Python 3.12+:

```sh
python scripts/migrate.py ../bioinfo-source/bioinfo-master
python -m unittest discover -s test -p 'test_*.py'
```

The script does not execute Nunjucks or source JavaScript. Regeneration overwrites `content/seed.json` and the report, not the live SQLite database.

## Known source issues and integration work

- The source lists Spring SRS 2026 on April 6–7, while its detail template says April 8. PSC Showcase lists April 8 while its detail says April 7. Current display uses listing metadata; both original values remain in the report and records. Confirm dates before launch.
- All six research `content.njk` files are empty in the archive. Their titles, existing descriptions, and overview are preserved; no new scientific claims were invented.
- Historical homepage figures and biographies are kept in About/profile content and need editorial review for currency.
- The original contact form exposed a mail-service credential in public JavaScript. That script is not copied into the new app. Rotate/revoke the old credential at its service. The new contact page uses direct email and appointment-request links; it does not claim that an email was sent or book calendar events.
- Tool applications remain on their original hosts. Their addresses are preserved, but remote uptime is not verified while network access is unavailable.
- The Box media bundles were not downloaded. Remote image references are retained. Existing biographies and event galleries may show fallbacks until media access is restored. New uploads work through the editor.
- No live production deployment, domain change, or GitHub merge has occurred. The ZIP has no upstream git history; integrate this project on a dedicated branch after review.

## Verification

```sh
npm test
python -m unittest discover -s test -p 'test_*.py'
npm run preview:export
```

Node tests exercise real SQLite and Request/Response handlers without opening network sockets. They check routes, tool destinations, authentication, CSRF/origin checks, drafts, publishing, conflicts, uploads, revisions and backup restoration. The single-process test flag supports restricted workspaces. Browser and Docker checks have also passed; see `docs/verification.md` for scope and remaining limitations. To exercise the whole editor workflow in a real browser against a running site (draft privacy, preview, publish, image upload, homepage settings, revisions, delete), use a disposable editor account:

```sh
npm i --no-save playwright && npx playwright install chromium
EDITOR_EMAIL=... EDITOR_PASSWORD=... node scripts/cms-e2e.cjs
```

Run `python scripts/browser-check.py --all` for the full responsive route crawl and `python scripts/browser-cms-check.py` for the disposable-account editorial workflow.
