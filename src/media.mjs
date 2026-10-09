/**
 * The Content Studio media library: one list of every image the site knows about, wherever it lives,
 * labelled by where it is used.
 *
 *   upload  files editors uploaded (data/uploads, the persistent volume)
 *   local   compressed copies of original Raikou images shipped with the code (public/media)
 *           and other built-in artwork (/assets/media/…)
 *   remote  images still loaded from another server (mostly the Raikou image server)
 *
 * Usage is computed in one pass over the records, so the library stays fast as content grows.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { validateRecord, InputError } from './content.mjs';
import { safeUrl } from './security.mjs';
import { saveImageBytes, MAX_UPLOAD } from './uploads.mjs';

const SECTION = { people: 'People', news: 'News', events: 'Events', tools: 'Tools', research: 'Research', publications: 'Publications', pages: 'Pages', opportunities: 'Opportunities' };
const SETTINGS_SECTION = { 'settings:home': 'Homepage', 'settings:director': 'Director', 'settings:site': 'Site' };
export const sectionOf = record => SETTINGS_SECTION[record.id] || SECTION[record.collection] || record.collection;
/** Remote images that the server may copy into its own storage. Nothing else is fetched. */
export const IMPORT_PREFIX = 'https://bioinfocore.usu.edu/raikou/';

/** Images the templates use directly (not through an entry), so they never show as unused. */
const BUILT_IN = [['/image/bioinfo/kbllogo.png', 'Header logo'], ['/image/raw/bioinfo/profile/RK_2.jpg', 'Director photo fallback']];
const isImageUrl = url => typeof url === 'string' && /^(https?:\/\/|\/)/.test(url) && !/^\/\//.test(url);
/** Every image reference in a record: field name and URL. Rich text contributes its <img src>. */
function references(record) {
  const out = [];
  const add = (field, url) => { if (isImageUrl(url)) out.push([field, url]); };
  add('image', record.image);
  for (const url of record.gallery || []) add('gallery', url);
  for (const v of record.imageVariants || []) add('image', v?.url);
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && value.includes('<img')) for (const m of value.matchAll(/<img[^>]+src="([^"]+)"/g)) add(key, m[1].replaceAll('&amp;', '&'));
  }
  return out;
}

const baseOf = url => url.replace(/(-(?:320|640|1200))?\.(png|jpg|gif|webp)$/, '');
const fileUrl = name => '/uploads/' + name;

/** Builds the library. `assetManifest` maps original Raikou URLs to their local copies. */
export function mediaLibrary(store, assetManifest, dataDir) {
  const records = store.list();
  const usage = new Map();
  const use = (url, entry) => { if (!usage.has(url)) usage.set(url, []); usage.get(url).push(entry); };
  for (const record of records) {
    for (const [field, url] of references(record)) {
      const key = url.startsWith('/uploads/') ? baseOf(url) : url;
      use(key, { id: record.id, title: record.title, collection: record.collection, section: sectionOf(record), field, status: record.status });
    }
  }
  const revisionText = store.revisionText();
  const items = [];
  const seen = new Set();

  // 1. Uploads: everything on disk, enriched with what was recorded at upload time.
  const known = new Map(store.mediaFiles().map(f => [f.url, f]));
  let names = [];
  try { names = readdirSync(join(dataDir, 'uploads')); } catch {}
  for (const name of names.filter(n => /^[a-f0-9-]{36}\.(png|jpg|gif|webp)$/.test(n))) {
    const url = fileUrl(name), base = baseOf(url), meta = known.get(url) || {};
    let bytes = meta.bytes, createdAt = meta.createdAt;
    if (!bytes || !createdAt) { try { const s = statSync(join(dataDir, 'uploads', name)); bytes ||= s.size; createdAt ||= s.mtime.toISOString(); } catch {} }
    const variants = meta.variants || names.filter(n => n.startsWith(name.replace(/\.[a-z]+$/, '') + '-')).map(n => ({ url: fileUrl(n), width: Number(n.match(/-(\d+)\.webp$/)?.[1]) })).sort((a, b) => a.width - b.width);
    items.push({ kind: 'upload', url, thumb: variants[0]?.url || url, width: meta.width, height: meta.height, bytes, createdAt, variants, usage: usage.get(base) || [], inRevisions: revisionText.includes(base) });
    seen.add(base);
  }
  // 2. Local copies of original Raikou images, and built-in artwork.
  const localFor = new Map();
  for (const [source, v] of Object.entries(assetManifest)) {
    if (!v.url) continue;
    localFor.set(source, v.url);
    const builtIn = BUILT_IN.find(([suffix]) => source.endsWith(suffix));
    items.push({ kind: 'local', url: v.url, thumb: v.url, source, width: v.width, height: v.height, usage: [...(builtIn ? [{ id: null, title: builtIn[1], section: 'Site' }] : []), ...(usage.get(source) || []), ...(usage.get(v.url) || [])] });
    seen.add(source); seen.add(v.url);
  }
  // 3. Everything else that content points at: built-in /assets images and remote URLs.
  for (const [url, uses] of usage) {
    if (seen.has(url) || url.startsWith('/uploads/')) continue;
    const local = url.startsWith('/');
    items.push({ kind: local ? 'local' : 'remote', url, thumb: url, usage: uses, importable: url.startsWith(IMPORT_PREFIX) });
  }
  for (const item of items) item.sections = [...new Set(item.usage.map(u => u.section))];
  return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || a.url.localeCompare(b.url));
}

/**
 * Points every current record that uses `from` at `to` instead (image, gallery and rich-text images).
 * Each changed record is saved as a new revision, so the change can be undone per record.
 * When `file` (an upload result) is given, the record's responsive variants follow the new image.
 */
export function replaceEverywhere(store, from, to, actor, file = null) {
  if (!from || !safeUrl(to, { image: true })) throw new InputError('Choose a valid image to use instead.');
  const fromKey = from.startsWith('/uploads/') ? baseOf(from) : from;
  const matches = url => typeof url === 'string' && (url === from || (from.startsWith('/uploads/') && url.startsWith('/uploads/') && baseOf(url) === fromKey));
  let updated = 0;
  for (const record of store.list()) {
    let changed = false;
    const next = { ...record };
    if (matches(next.image)) {
      next.image = to; changed = true;
      next.imageOriginal = file ? file.url : '';
      next.imageVariants = file?.variants || [];
      next.imageWidth = file?.width || 0; next.imageHeight = file?.height || 0;
    }
    if (Array.isArray(next.gallery) && next.gallery.some(matches)) { next.gallery = next.gallery.map(u => matches(u) ? to : u); changed = true; }
    for (const [key, value] of Object.entries(next)) {
      if (typeof value !== 'string' || !value.includes('<img')) continue;
      const replaced = value.replace(/(<img[^>]+src=")([^"]+)(")/g, (whole, a, src, b) => matches(src.replaceAll('&amp;', '&')) ? a + to + b : whole);
      if (replaced !== value) { next[key] = replaced; changed = true; }
    }
    if (!changed) continue;
    const version = next.version; delete next.version; delete next.updatedAt;
    validateRecord(next);
    store.save(next, version, actor);
    updated++;
  }
  return updated;
}

/** Copies one remote image (allowlisted host only) into site storage and switches content to it. */
export async function importRemote(store, url, dataDir, actor, fetcher = fetch) {
  if (typeof url !== 'string' || !url.startsWith(IMPORT_PREFIX) || url.includes('..') || !safeUrl(url, { image: true })) throw new InputError('Only images from the Raikou image server can be copied.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let bytes;
  try {
    const response = await fetcher(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new InputError(`The image server answered ${response.status}.`, 502);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_UPLOAD) throw new InputError('The image is larger than 10 MB.', 413);
    const reader = response.body.getReader(), chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_UPLOAD) { await reader.cancel(); throw new InputError('The image is larger than 10 MB.', 413); }
      chunks.push(Buffer.from(value));
    }
    bytes = Buffer.concat(chunks);
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError('The image server could not be reached from the website server.', 502);
  } finally { clearTimeout(timer); }
  const file = await saveImageBytes(bytes, dataDir);
  store.addMedia({ ...file, source: url });
  const updated = replaceEverywhere(store, url, file.url, actor, file);
  return { file, updated };
}
