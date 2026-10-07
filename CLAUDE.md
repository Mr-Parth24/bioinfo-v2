# Notes for Claude Code sessions

Start with `README.md` (what the project is, how to run, structure) and `docs/architecture.md`.

## Commands
- `npm ci`, `npm start` (http://localhost:3000, editor at /admin), `npm test` (must stay green).
- Node here may be 22: run tests with `node --test test/*.test.mjs` if `--test-isolation` is unsupported.
- `npm run preview:export` builds the static snapshot used by GitHub Pages; delete `preview/` afterwards.
- Editor account for local testing: `printf '%s' '<14+ char password>' | DATA_DIR=<dir> node scripts/manage.mjs create-user you@example.org`.
- Browser checks: Playwright with Chromium; `scripts/cms-e2e.cjs` and `scripts/security-probe.mjs` need a disposable editor account. Sign-in is limited to 10 attempts per 15 minutes per IP.

## Rules
- **CSP:** no inline `style=""` attributes, no inline scripts, no `data:` images, no external fonts/scripts. Styling goes in `public/site.css`; dynamic values via `el.style.setProperty` in `public/site.js`.
- **Escaping:** every value in templates goes through `e()` (escapeHtml); rich text through `sanitizeHtml()` / `richBody()`; URLs through `safeUrl()`.
- **SQL:** only parameterised queries in `src/store.mjs`.
- **Content:** do not edit `content/seed.json` (archival migration). New default text goes in `content/content-updates.json` (fills empty fields once per database). Never invent scientific claims, people data or numbers; derive counts from records.
- **CMS fields:** add a field in `FIELDS` + `COLLECTION_FIELDS` (`src/content.mjs`), validate it, render it, and add a studio label in `public/admin.js` if it is a select.
- **Test contracts:** tool category anchors (`#hpi`, `#cellularloc`, …), exact tool URLs, `publication-list`, routes and legacy redirects, draft privacy.
- **Workflow:** develop on the `claude/…` branch, push, open a PR to `main`; GitHub Pages deploys only from `main`. Check both workflows (`pages.yml`, `docker.yml`) after pushing.
- Before pushing UI changes: run tests, render the changed pages at 1440px and 390px, check for JS errors and horizontal overflow.
