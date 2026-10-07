# Operating and updating Bioinfo v2

## Everyday editorial work

1. Open `/admin` and sign in.
2. Choose News, Events, Publications, People, Research, Tools, or Site pages.
3. Fill in fields; use the formatting toolbar and image upload controls.
4. Save as Draft and inspect Preview.
5. Choose Published and save. Public pages update on their next request.

Saving as Draft removes the entry from dynamic public pages. An old static preview stays a snapshot until you regenerate and redeploy it. The exporter now replaces its complete managed output so old HTML cannot survive unpublishing or route renaming.

A conflict message means another edit was saved first. Reload that record before applying your change again. Revision history can load an earlier version; saving creates a new revision, so the audit history remains intact.

## Configuration

| Variable | Default | Use |
|---|---|---|
| `PORT` | `3000` | HTTP listener / Compose host port |
| `HOST` | `127.0.0.1` locally; `0.0.0.0` in Docker | Bind address |
| `APP_ORIGIN` | `http://localhost:3000` | Exact browser origin used for CSRF and cookie security; include the actual port |
| `DATA_DIR` | `./data`; `/app/data` in Docker | Persistent database and uploads |
| `NODE_ENV` | development through preview Compose | Use `production` behind your HTTPS proxy; startup then requires an HTTPS APP_ORIGIN |

Compose `.env` settings are separate from arbitrary environment variables in a shell. Copy `.env.example` to `.env` for Compose. A plain `npm start` does not load `.env` automatically; export required environment variables in that shell or use your service manager.

## First server installation

1. Place the project on a **separate preview branch/directory** on your server.
2. Configure a preview domain and HTTPS reverse proxy upstream to the loopback port.
3. Set `APP_ORIGIN` to that exact HTTPS domain and `NODE_ENV=production`.
4. Run `docker compose up --build -d`.
5. Create an editor account using the silent password/standard-input command in the README.
6. Check `docker compose ps`, then request `/healthz` and open the site/editor in a browser.
7. Check source conflicts and image availability before pointing the production domain at it.

The container runs as UID 1000, drops Linux capabilities, and keeps the root filesystem read-only. The `bioinfo_data` volume is writable. If a host bind mount replaces the named volume, its ownership must allow UID 1000 to write; do not solve this by running the app as root.

## Code deployment

```sh
git pull --ff-only
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 website
```

Back up first. Keep the previous code/image and data backup available for rollback. A content edit needs no `git pull`, rebuild, or restart. Deployment keeps the named volume. Database seeding is one-time; new seed records require an explicit import into an already initialized site.

The source ZIP did not contain Git history. The delivered v2 branch is independent; do not merge it into the current production branch without inspecting the replacement diff and server routing. The external tools keep their assigned hosts/paths and should continue to run independently.

## Backup

A full backup contains **SQLite + uploaded files + deployment configuration**. Never commit backups or `.env` to Git.

For local Node operation:

```sh
node scripts/manage.mjs backup /safe/backups/bioinfo-2026-10-02.sqlite
cp -a data/uploads /safe/backups/uploads-2026-10-02
```

Choose a new output path each time. SQLite's `VACUUM INTO` creates a consistent database snapshot while the app is running. For a coordinated backup including uploaded files, pause editorial changes during the database/image copy. Retain previous backups and verify restoration in a separate test directory.

For Docker, create a database snapshot inside the persistent volume, copy it out with `docker compose cp`, and copy the uploads directory too. Keep snapshot paths outside the public uploads directory. Remove private temporary snapshots after checking your external backup copy.

## Restore / rollback

1. Stop the app/container and retain the existing database and uploads as a separate rollback copy.
2. Restore the backup as `DATA_DIR/content.sqlite` and restore its matching uploads.
3. Remove only the stale `content.sqlite-wal` / `content.sqlite-shm` sidecars associated with the replaced database, while the app is stopped.
4. Check file ownership and start the app.
5. Check content counts, a publication, an uploaded image, login, and an edit on the restored copy.
6. If rolling back application code, use the matching prior commit/image. This version introduces no destructive schema migrations.

Reset editor passwords if restoring an old backup whose account access is no longer current. Backups include session data; restoring old sessions is another reason to reset accounts after a recovery event.

## Diagnostics

| Symptom | Check |
|---|---|
| Server cannot bind / `Operation not permitted` | Execution environment permissions; changing site code does not grant socket access. |
| Login/save origin error | Browser URL must match `APP_ORIGIN` including scheme/host/port. Do not disable CSRF checks. |
| Login rate limit | Wait 15 minutes. The app ignores arbitrary forwarded IP headers; configure trusted proxy rate limiting for larger teams. |
| New seed edits do not show up | The database was already initialized. Use the editor or deliberate import. |
| Images show a fallback | Check source media-host access or uploaded-file volume. Do not replace missing photos with invented lab photos. |
| Tool opens an error page | Verify the preserved external destination on its own host; the directory does not execute the scientific application. |
| Static preview still shows an older edit | Re-export and redeploy the snapshot. The dynamic Docker application reads current data directly. |
| Static export refuses a directory | Use an empty directory or an existing managed preview. This protects unrelated files from replacement. |
| Port already occupied | Set a free PORT and matching APP_ORIGIN; update proxy routing. |

## Pre-launch checks

- `npm test` and the migration tests pass.
- Review the two 2026 event date conflicts and currency of historical biography/statistics text.
- Review desktop/tablet/mobile views, long titles, filters, keyboard navigation, empty results and missing images.
- Test draft→preview→publish→draft and restart persistence on the actual deployed app.
- Verify the image volume and a complete backup/restore in a separate environment.
- Rotate the original browser-exposed mail-service credential at its service.
- Confirm university domain, branding, accessibility and account-access requirements with the responsible team.
- Review tool links on their original hosts; do not change tool runtime deployments during the website cutover.

This checklist is about concrete pending integrations in this project, not a claim that tests alone make a public service secure.

## Member profiles and alumni

Open Content Studio → People → Add new. Enter the name, role, biography, research interests, and optional joining/finishing years. Choose Current or Alumni under Lab membership; this controls the respective public directories. Imported records fall back to their original category until an editor saves an explicit membership choice.

Use the dissertation title and URL fields for a thesis or institutional repository record. Add other work with separate Label and URL fields. Select publications and tools from the searchable lists: these reference the existing content entries, so changes to a publication title or tool destination propagate to the profile. Related drafts remain hidden publicly. Relationships are editorial selections; the site does not infer authorship or invent dissertation links.

Upload a photo or leave it blank for the initials placeholder. Save as Draft and use Preview; choose Published when ready. The same record remains in place when a member becomes an alumnus, retaining their biography, work, dissertation, and profile URL. No template editing is required.

## Homepage, footer, director and image editing

Open **Homepage, footer & director** in Content Studio. The homepage supports automatic latest updates, explicitly ordered selected entries, hidden modules, announcements, hero image/text and link buttons. Individual news/event/publication records can be excluded without unpublishing. Event and vacancy panels can use automatic, selected or hidden mode; expired vacancies stay out of active panels. Selected drafts stay private and the editor warns about them.

The shared site record updates footer text, address, contact information, affiliations and resource links. The director record has add/remove/reorder rows for education, appointments and awards. The historic director page entry routes to the dedicated editor.

**Opportunities** supports published openings, deadlines, open/closed status and application links. New events use start/end dates; historical display-date wording remains available. Dates control upcoming/past placement and are displayed on details.

The image panel shows placement crops, desktop/mobile preview widths, cover/contain fit and horizontal/vertical focal controls. Click the preview or use sliders. Upload or choose from the searchable media library. Remove detaches an image; Replace changes the current placement. Saved originals/variants are kept while referenced by records or revisions. Only unused uploads show permanent deletion. Galleries support upload, reusable selection and per-image removal.

When Docker builds behind this environment's HTTPS proxy, supply its trusted CA as a build secret: `docker build --secret id=build_ca,src=/path/to/trusted-proxy-ca.crt -t bioinfo-v2 .`. It is used only during installation, not copied into the image. Normal networks can use the ordinary build without that secret. Do not disable TLS validation.
