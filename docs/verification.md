# Verification

How to check the site before merging or deploying, and what was last verified.

## Checks to run

| Check | Command | What it covers |
|---|---|---|
| Unit and integration tests | `npm test` (Node 22: `node --test test/*.test.mjs`) | Routes, auth, sessions, CSRF/origin, uploads, media library, revisions, drafts, sanitizer, headers, content updates, research pages |
| Static export | `npm run preview:export`, then delete `preview/` | Every public route renders; stale routes removed |
| Editor workflow (browser) | `EDITOR_EMAIL=… EDITOR_PASSWORD=… node scripts/cms-e2e.cjs` | Sign-in, draft privacy, preview, publish, upload, homepage settings, revisions, delete |
| Attack probe | `EDITOR_EMAIL=… EDITOR_PASSWORD=… node scripts/security-probe.mjs` | SQLi, XSS, CSRF, traversal, upload abuse, headers, session handling |
| Docker | `.github/workflows/docker.yml` (runs on pull requests) | Image build, non-root read-only container, health, persistence, security probe |
| Layout | Render changed pages at 1440 px and 390 px | No horizontal overflow, no JavaScript errors |

Use a disposable editor account for the browser checks (`scripts/manage.mjs create-user`), never a
production one. Sign-in is limited to 10 attempts per 15 minutes per IP.

## Last verified (October 2026, cleanup pass)

See the pull request description for the exact results of the latest run.

## Known limits

- External tool availability is shown live on the Tools page (kaabil.net uptime monitor); HTTP success
  does not prove a tool works.
- Source event dates conflict for Spring SRS 2026 and PSC Showcase 2026; the listing value is displayed.
- Chromium was tested at desktop and mobile sizes; Safari and Firefox were not.
- The GitHub Pages preview is a static snapshot without the editor.
