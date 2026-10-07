# Security

How the KAABiL website protects itself, how to check it, and what the server operator still has to do.
Last reviewed October 2026.

## What a visitor can and cannot do

Public visitors can only **read** pages. Every public route answers `GET`/`HEAD`; any other method gets
`405`. Nothing a visitor sends is written anywhere, and the search box filters in the browser without
reflecting the query into the page.

Opening the browser's developer tools ("Inspect") only changes the visitor's own copy of the page. The
server never trusts the browser: every write is checked again on the server for a valid session, the
CSRF token, the request origin and the content rules below.

## Protections in place

| Threat | Protection | Where |
|---|---|---|
| SQL injection | Every query uses bound `?` parameters; no SQL is built from input. Record IDs, collections and routes are also validated against strict patterns. | `src/store.mjs`, `src/content.mjs` |
| Cross-site scripting (XSS) | All text is HTML-escaped. Rich text is rebuilt from a small allowlist of tags; scripts, event handlers, `style`, SVG, iframes, forms and `javascript:`/`data:` URLs are removed, unclosed tags are closed, and IDs used by the site or studio cannot be reused (DOM clobbering). A strict Content Security Policy blocks inline and third-party scripts even if markup slipped through. | `src/security.mjs`, `src/app.mjs` |
| Cross-site request forgery | Every write needs the session cookie, a per-session CSRF token header and a matching `Origin`. Cookies are `HttpOnly`, `SameSite=Strict`, and `Secure` over HTTPS. | `src/app.mjs` |
| Password guessing | scrypt-hashed passwords (14+ characters), constant-time comparison, the same work for unknown accounts, and 10 attempts per 15 minutes per IP address and per account. | `src/security.mjs`, `src/store.mjs` |
| Session theft / fixation | Random 256-bit tokens stored only as hashes, 8-hour expiry, a new session on every sign-in, revoked on sign-out and on password reset. | `src/store.mjs` |
| Malicious uploads | Only PNG, JPEG, GIF and WebP up to 10 MB and 40 megapixels. Files must match their signature and decode; names are generated; still images are re-encoded, which removes EXIF/GPS metadata; files are served with `nosniff` and a sandbox CSP. SVG and documents are refused. | `src/uploads.mjs` |
| Path traversal / file disclosure | Static files come from an explicit allowlist; uploads must match a strict name pattern. Source code, the database, `.env` and seed data are never served. | `src/app.mjs` |
| Clickjacking | `frame-ancestors 'none'` and `X-Frame-Options: DENY`. | `src/app.mjs` |
| Oversized or slow requests | 1 MB JSON limit, 10 MB upload limit, header size and request timeouts; refused bodies close the connection. | `src/uploads.mjs`, `src/server.mjs` |
| Mass assignment | The server copies only known content fields; unknown fields and collections are rejected. | `src/app.mjs`, `src/content.mjs` |
| Information leaks | Errors return a generic message without stack traces; no server technology header; `/admin` and `/uploads/` are excluded in `robots.txt` and marked `noindex`. | `src/app.mjs` |
| Container escape / tampering | Runs as the unprivileged `node` user with a read-only filesystem, no Linux capabilities, `no-new-privileges`, and limits on processes, memory and CPU. Only the data volume is writable. | `Dockerfile`, `compose.yaml` |

Response headers on every page: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`,
`Cross-Origin-Resource-Policy`, and `Strict-Transport-Security` when `APP_ORIGIN` uses HTTPS.

## Checking it

```sh
npm test                                   # includes test/security.test.mjs
EDITOR_EMAIL=... EDITOR_PASSWORD=... node scripts/security-probe.mjs http://localhost:3000
```

`scripts/security-probe.mjs` attacks a running copy from the outside: SQL injection, stored XSS in every
field, CSRF, path traversal, hostile uploads, oversized bodies, forged sessions and header injection. Use a
disposable editor account on a local or staging copy, not production. The same probe runs against the real
Docker image on every push (`.github/workflows/docker.yml`).

If it reports that sign-in is rate limited, the brute-force protection is working: wait 15 minutes.

## Operator checklist (things code cannot do)

1. **Serve only over HTTPS** through the university reverse proxy, with `NODE_ENV=production` and
   `APP_ORIGIN=https://…`. Production refuses to start with an `http://` origin.
2. **Per-client rate limiting at the proxy.** Behind a proxy every visitor shares the proxy's address, so
   the app's per-IP sign-in limit becomes a shared limit. Add request limits at the proxy too.
3. **Keep the published port on loopback** (`127.0.0.1:3000`, as in `compose.yaml`).
4. **Rotate the old mail-service credential.** The original site exposed it in public JavaScript; it is
   not used here, but it should be revoked at the mail service.
5. **One account per editor**, strong passwords, and remove accounts when people leave
   (reset to a random password with `manage.mjs create-user`).
6. **Back up** the database and uploads (see [operations](operations.md)); keep backups private, as they
   contain password hashes.
7. **Update dependencies and the base image** regularly: `npm audit`, then rebuild with
   `docker compose build --pull`.

## Known limits

- Every editor can publish and delete. There are no reviewer roles, MFA or university SSO yet.
- Images may load from any HTTPS host (`img-src https:`) because the lab's original media lives on the
  university image server. Narrow this once all media is uploaded locally.
- The rich-text sanitizer is purpose-built and tested, not a full HTML parser. Editors are trusted
  accounts; the CSP is the second line of defence.
