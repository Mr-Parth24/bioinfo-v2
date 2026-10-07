/**
 * Black-box security probe for a running KAABiL site. It behaves like an outside attacker (and like a
 * signed-in editor pasting hostile content) and reports PASS/FAIL for each defence.
 *
 *   EDITOR_EMAIL=... EDITOR_PASSWORD=... node scripts/security-probe.mjs [base-url]
 *
 * Use a disposable editor account on a local or staging copy, never on production: it creates and
 * deletes a test record and uploads small test files. Default base URL: http://localhost:3000.
 */
const base = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const EMAIL = process.env.EDITOR_EMAIL, PASSWORD = process.env.EDITOR_PASSWORD;
if (!EMAIL || !PASSWORD) { console.error('Set EDITOR_EMAIL and EDITOR_PASSWORD (a disposable editor account).'); process.exit(2); }
const origin = new URL(base).origin;
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (!ok) failures++; };
const get = (path, init = {}) => fetch(base + path, { redirect: 'manual', ...init });
const raw = async (path) => {
  // fetch() normalises "../"; send the exact bytes with a raw HTTP request instead.
  const { connect } = await import('node:net');
  const u = new URL(base);
  return new Promise(resolve => {
    const s = connect(Number(u.port || 80), u.hostname, () => s.write(`GET ${path} HTTP/1.1\r\nHost: ${u.host}\r\nConnection: close\r\n\r\n`));
    let data = ''; s.on('data', d => { data += d; }); s.on('end', () => resolve(Number(data.split(' ')[1]) || 0)); s.on('error', () => resolve(0));
  });
};

/* ---------- Unauthenticated surface ---------- */
const home = await get('/');
const h = home.headers;
check(/default-src 'self'/.test(h.get('content-security-policy') || '') && /script-src 'self'/.test(h.get('content-security-policy')), 'CSP restricts scripts to this site');
check(!/unsafe-inline|unsafe-eval/.test(h.get('content-security-policy') || ''), 'CSP has no unsafe-inline / unsafe-eval');
check(h.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff');
check(/frame-ancestors 'none'/.test(h.get('content-security-policy') || '') && h.get('x-frame-options') === 'DENY', 'Clickjacking blocked (frame-ancestors / X-Frame-Options)');
check(!!h.get('referrer-policy') && !!h.get('permissions-policy'), 'Referrer-Policy and Permissions-Policy set');
check(h.get('cross-origin-opener-policy') === 'same-origin', 'Cross-Origin-Opener-Policy: same-origin');
check(!h.get('x-powered-by') && !/node|express/i.test(h.get('server') || ''), 'No server technology disclosed');

for (const path of ['/assets/../src/store.mjs', '/assets/..%2fsrc%2fstore.mjs', '/assets/%2e%2e/content/seed.json', '/uploads/../content.sqlite', '/uploads/..%2fcontent.sqlite', '/content/seed.json', '/data/content.sqlite', '/.env', '/package.json', '/src/app.mjs', '/.git/config', '//etc/passwd']) {
  const status = await raw(path);
  check(status >= 300 && status !== 200 && status < 500 || status === 400, `No file disclosure via ${path} (HTTP ${status})`);
}
for (const q of ["/news?q=' OR 1=1 --", "/search?q=%27%3B%20DROP%20TABLE%20records%3B--", "/publications?content=pub'--", "/admin/preview/news%3Ax'%20OR%20'1'%3D'1"]) {
  const r = await get(q);
  check(r.status !== 500, `SQL metacharacters harmless at ${q} (HTTP ${r.status})`);
}
const reflected = await (await get('/search?q=%3Cscript%3Ealert(1)%3C/script%3E')).text();
check(!reflected.includes('<script>alert(1)</script>'), 'Search query is not reflected into HTML');
check((await get('/admin/api/records')).status === 401, 'Editor API requires a session');
check((await get('/admin/api/records', { headers: { cookie: 'bioinfo_session=' + 'a'.repeat(64) } })).status === 401, 'Forged session cookie rejected');
check((await get('/admin/preview/news:anything')).status === 303, 'Draft preview requires a session');
for (const m of ['PUT', 'DELETE', 'PATCH', 'POST']) check([403, 405].includes((await get('/news', { method: m })).status), `${m} on a public page is refused`);
const crlf = await get('/admin/run-local?x=%0d%0aSet-Cookie:%20pwned=1');
check(!crlf.headers.get('set-cookie'), 'No header injection through redirects');
check(!/^https?:\/\/(?!localhost)/.test(crlf.headers.get('location') || ''), 'Legacy redirect stays on this site');

/* ---------- Login defences ---------- */
const login = (email, password, extra = {}) => get('/admin/api/login', { method: 'POST', headers: { 'content-type': 'application/json', origin, ...extra }, body: JSON.stringify({ email, password }) });
check([401, 429].includes((await login("' OR 1=1 --", "' OR '1'='1")).status), 'SQL injection in login is rejected');
check((await login(EMAIL, PASSWORD, { origin: 'https://evil.example' })).status === 403, 'Login from a foreign origin is refused');
const ok = await login(EMAIL, PASSWORD);
if (ok.status === 429) {
  console.log('\nSign-in is rate limited (10 attempts per 15 minutes per address) — that is the brute-force protection working. Wait 15 minutes and run again.');
  process.exit(failures ? 1 : 3);
}
check(ok.status === 200, 'Valid editor can sign in');
const cookieHeader = ok.headers.get('set-cookie') || '';
check(/HttpOnly/i.test(cookieHeader) && /SameSite=Strict/i.test(cookieHeader), 'Session cookie is HttpOnly and SameSite=Strict');
const { csrf } = await ok.json();
const cookie = cookieHeader.split(';')[0];
const api = (path, method, body, headers = {}) => get('/admin/api/' + path, { method, headers: { cookie, origin, 'x-csrf-token': csrf, 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });

/* ---------- CSRF and request limits ---------- */
const draft = { id: 'news:security-probe', collection: 'news', slug: 'security-probe', title: 'Probe', status: 'draft', route: '/news/security-probe' };
check((await api('records', 'POST', { record: draft, version: 0 }, { 'x-csrf-token': 'wrong' })).status === 403, 'Write without the CSRF token is refused');
check((await api('records', 'POST', { record: draft, version: 0 }, { origin: 'https://evil.example' })).status === 403, 'Write from a foreign origin is refused');
check((await get('/admin/api/records', { method: 'POST', headers: { cookie, origin, 'x-csrf-token': csrf, 'content-type': 'application/json' }, body: 'x'.repeat(2 * 1024 * 1024) })).status === 413, 'Oversized request body is refused');
check((await api('revisions?id=' + encodeURIComponent("' OR '1'='1"), 'GET')).status === 200, 'SQL in revision lookup is treated as data');

/* ---------- Stored XSS through every editor field ---------- */
const payload = '<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">a</a><a href="jav&#x09;ascript:alert(1)">b</a><svg onload=alert(1)></svg><iframe src="https://evil.example"></iframe><p style="background:url(javascript:alert(1))" onclick="alert(1)">c</p><form action="https://evil.example"><input name=x></form><math><mi xlink:href="javascript:alert(1)">d</mi></math><div><section><h2 id="site-nav">e';
const hostile = { ...draft, status: 'published', title: '"><script>alert("t")</script>', summary: '"><img src=x onerror=alert("s")>', body: payload, category: '</span><script>alert("c")</script>', location: '<img src=x onerror=alert(1)>' };
const saved = await api('records', 'POST', { record: hostile, version: 0 });
check(saved.status === 200, 'Hostile content is stored (sanitised), not crashing the server');
const page = await (await get('/news/security-probe')).text();
const article = page.slice(page.indexOf('<main'), page.indexOf('</main>'));
check(!/<script>alert/i.test(article), 'No injected <script> on the public page');
// Look inside real tags only: escaped text such as "&lt;img onerror=…&gt;" is harmless.
check(!/<[a-z][^>]*\son\w+\s*=/i.test(article), 'No inline event handlers (onerror, onclick, …)');
check(!/javascript:/i.test(article), 'No javascript: URLs');
const content = article.slice(article.indexOf('article-body'), article.indexOf('back-link')); // editor content only; the site's own icons are SVG
check(!/<(iframe|svg|math|form|input|object|embed)\b/i.test(content), 'No iframe / svg / math / form elements in content');
check(!/\sstyle=/i.test(article), 'No style attributes');
check(!/id="site-nav"/.test(article), 'Content cannot reuse the site’s own element IDs');
const opens = (article.match(/<(div|section)\b/g) || []).length, closes = (article.match(/<\/(div|section)>/g) || []).length;
check(opens === closes, `Unclosed tags in content are balanced (${opens} open / ${closes} close)`);
for (const [field, value] of [['link', 'javascript:alert(1)'], ['image', 'javascript:alert(1)'], ['image', 'data:text/html,<script>alert(1)</script>'], ['route', '/admin/evil'], ['route', '/../../etc'], ['link', '//evil.example']]) {
  const r = await api('records', 'POST', { record: { ...hostile, id: 'news:security-probe-2', route: field === 'route' ? value : '/news/security-probe-2', [field]: value }, version: 0 });
  check(r.status === 400, `Rejected ${field} = ${value}`);
}
const unknown = await api('records', 'POST', { record: { ...draft, id: 'news:security-probe-3', route: '/news/security-probe-3', __proto__: { admin: true }, isAdmin: true, status: 'draft' }, version: 0 });
const stored = unknown.status === 200 ? await unknown.json() : {};
check(!('isAdmin' in stored), 'Unknown fields are dropped (mass assignment)');
if (unknown.status === 200) await api('records', 'DELETE', { id: 'news:security-probe-3' });
check((await api('records', 'POST', { record: { ...draft, id: 'users:admin', collection: 'users' }, version: 0 })).status === 400, 'Cannot write outside known collections');

/* ---------- Uploads ---------- */
const upload = (bytes, type = 'application/octet-stream') => get('/admin/api/uploads', { method: 'POST', headers: { cookie, origin, 'x-csrf-token': csrf, 'content-type': type }, body: bytes });
check((await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), 'image/svg+xml')).status === 400, 'SVG upload refused');
check((await upload(Buffer.from('<html><script>alert(1)</script></html>'), 'image/png')).status === 400, 'HTML disguised as PNG refused');
const pngHeader = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
check((await upload(Buffer.concat([pngHeader, Buffer.from('<script>alert(1)</script>IEND')]), 'image/png')).status === 400, 'PNG/HTML polyglot that does not decode is refused');
check((await upload(Buffer.alloc(11 * 1024 * 1024, 1), 'image/png')).status === 413, 'Upload over 10 MB refused');
const goodPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const up = await upload(goodPng, 'image/png');
if (up.status === 201) {
  const file = await up.json();
  const served = await get(file.url);
  check(/sandbox/.test(served.headers.get('content-security-policy') || '') && served.headers.get('x-content-type-options') === 'nosniff', 'Uploaded files are served sandboxed with nosniff');
  await api('media', 'DELETE', { url: file.url });
} else check(false, 'Valid PNG upload accepted');

/* ---------- Clean up ---------- */
await api('records', 'DELETE', { id: 'news:security-probe' });
await api('logout', 'POST', {});
check((await get('/admin/api/records', { headers: { cookie } })).status === 401, 'Session is invalid after sign-out');
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exitCode = failures ? 1 : 0;
