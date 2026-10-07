import {defaults,ensureEditorial,applyContentUpdates,withContentUpdates} from '../src/editorial.mjs';
/** Build a clean, portable public snapshot. Never leave unpublished pages behind. */
import { readFileSync, mkdirSync, writeFileSync, cpSync, existsSync, mkdtempSync, renameSync, rmSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderPage, baseRoutes, legacyRedirects } from '../src/render.mjs';
import { Store } from '../src/store.mjs';

const marker = '.bioinfo-preview.json';

/**
 * Render only published content into staging, then replace a managed snapshot.
 * Refuse nonempty directories that do not carry our marker. Data/source folders
 * must never be used as output; originals are not copied into the public snapshot.
 */
export function exportPreview({ records, out, uploadsDir }) {
  out = resolve(out);
  if (existsSync(out)) {
    if (lstatSync(out).isSymbolicLink()) throw new Error('Preview output cannot be a symbolic link.');
    if (readdirSync(out).length && !existsSync(join(out, marker))) {
      throw new Error('Output directory is not a managed preview. Choose an empty directory.');
    }
  }
  records = records.concat(defaults.filter(r=>!records.some(x=>x.id===r.id)));
  const candidates = [...new Set([...baseRoutes, ...Object.keys(legacyRedirects), ...records.filter(record=>record.status==='published').map(record => record.route).filter(Boolean)])];
  const rendered = new Map(candidates.map(route => [route, renderPage(route, new URLSearchParams(), records)]));
  const routes = candidates.filter(route => rendered.get(route).status === 200);
  mkdirSync(dirname(out), { recursive: true });
  const staging = mkdtempSync(join(dirname(out), '.bioinfo-preview-stage-'));
  const target = path => join(staging, path === '/' ? 'index.html' : path.slice(1) + '/index.html');
  let previous;
  try {
    cpSync(new URL('../public/', import.meta.url), join(staging, 'assets'), { recursive: true });
    if (uploadsDir && existsSync(uploadsDir)) cpSync(uploadsDir, join(staging, 'uploads'), { recursive: true });
    for (const route of routes) {
      const file = target(route), folder = dirname(file);
      mkdirSync(folder, { recursive: true });
      // The static copy has no editor, so drop the footer sign-in link instead of shipping a dead /admin link.
      const html = rendered.get(route).html.replace(/<a class="footer-admin" href="\/admin">[^<]*<\/a>/, '').replace(/\b(href|src)="(\/[^\"]*)"/g, (whole, attribute, value) => {
        const url = new URL(value.replaceAll('&amp;', '&'), 'https://preview.invalid');
        let path = url.pathname.replace(/\/$/, '') || '/';
        if (path === '/publications' && url.searchParams.has('content')) {
          const mode = url.searchParams.get('content');
          if (mode === 'conf') path = '/publications/conferences';
          if (mode === 'edit') path = '/publications/editorials';
          url.searchParams.delete('content');
        }
        let destination;
        if (routes.includes(path)) destination = target(path);
        else if (path.startsWith('/assets/') || path.startsWith('/uploads/')) destination = join(staging, path.slice(1));
        else return whole;
        return `${attribute}="${relative(folder, destination).split('\\').join('/')}${url.search}${url.hash}"`;
      });
      writeFileSync(file, html);
    }
    writeFileSync(join(staging, marker), JSON.stringify({ generator: 'bioinfo-v2', routes }, null, 2));
    writeFileSync(join(staging, 'README.txt'), 'KAABiL version 2 — static review copy\n\nOpen index.html in a browser. Images use the original remote server when available. This export has no CMS backend; run the Node app to edit and publish content.\n');
    if (existsSync(out)) {
      previous = staging + '-previous';
      renameSync(out, previous);
    }
    try { renameSync(staging, out); }
    catch (error) { if (previous) renameSync(previous, out); throw error; }
    if (previous) rmSync(previous, { recursive: true });
    return { routes, out };
  } finally {
    if (existsSync(staging)) rmSync(staging, { recursive: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dataDir = resolve(process.env.DATA_DIR || 'data');
  const database = join(dataDir, 'content.sqlite');
  let records;
  if (existsSync(database)) {
    const store = new Store(database);
    try {
    const check = store.integrity();
    if (check !== 'ok') throw new Error(`${database} is damaged (${check}). A stale content.sqlite-wal/-shm next to it is the usual cause: delete them only if content.sqlite was checkpointed (npm run manage checkpoint).`);
    ensureEditorial(store); applyContentUpdates(store); records = store.list(); } finally { store.close(); }
  } else {
    records = withContentUpdates(JSON.parse(readFileSync(new URL('../content/seed.json', import.meta.url))).records);
  }
  const result = exportPreview({ records, out: process.argv[2] || 'preview', uploadsDir: join(dataDir, 'uploads') });
  console.log(`Exported ${result.routes.length} routes to ${result.out}`);
}
