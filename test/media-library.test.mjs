import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { Store } from '../src/store.mjs';
import { saveImage, removeImage, uploadedImage } from '../src/uploads.mjs';
import { mediaLibrary, replaceEverywhere, importRemote, IMPORT_PREFIX } from '../src/media.mjs';

const png = (color = '#336699', width = 640, height = 400) => sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
const upload = async (dir, store) => { const file = await saveImage(new Request('http://localhost', { method: 'POST', body: await png() }), dir); store.addMedia(file); return file; };
const setup = () => ({ dir: mkdtempSync(join(tmpdir(), 'kaabil-library-')), store: new Store(':memory:') });

test('library lists uploads, local copies and remote images, labelled by where they are used', async () => {
  const { dir, store } = setup();
  try {
    const used = await upload(dir, store), spare = await upload(dir, store);
    const remote = IMPORT_PREFIX + 'image/bioinfo/people/a.jpg';
    store.save({ id: 'people:a', collection: 'people', title: 'A', status: 'published', route: '/people/a', image: used.variants[0].url }, 0, 'test');
    store.save({ id: 'events:e', collection: 'events', title: 'E', status: 'draft', route: '/events/e', gallery: [remote, '/assets/media/x.webp'] }, 0, 'test');
    store.save({ id: 'settings:home', collection: 'settings', title: 'Home', status: 'published', body: '<p><img src="https://example.org/pic.png"></p>' }, 0, 'test');
    const items = mediaLibrary(store, { 'https://raikou/old.png': { url: '/assets/media/old.webp', width: 10, height: 10 } }, dir);
    const find = url => items.find(i => i.url === url);
    assert.deepEqual(find(used.url).sections, ['People'], 'a variant in use counts for the upload');
    assert.equal(find(spare.url).usage.length, 0, 'unused upload has no usage');
    assert.equal(find(remote).kind, 'remote');
    assert.equal(find(remote).importable, true);
    assert.deepEqual(find(remote).sections, ['Events']);
    assert.equal(find('https://example.org/pic.png').importable, false, 'only the Raikou server is importable');
    assert.deepEqual(find('https://example.org/pic.png').sections, ['Homepage'], 'rich-text images are found');
    assert.equal(find('/assets/media/old.webp').kind, 'local');
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('replace everywhere switches image, gallery and rich text, one revision per record', async () => {
  const { dir, store } = setup();
  try {
    const old = await upload(dir, store), next = await upload(dir, store);
    store.save({ id: 'news:n', collection: 'news', title: 'N', status: 'published', route: '/news/n', image: old.url, imageVariants: old.variants, body: `<p><img src="${old.variants[1].url}"></p>` }, 0, 'test');
    store.save({ id: 'events:e', collection: 'events', title: 'E', status: 'published', route: '/events/e', gallery: ['/x.png', old.url] }, 0, 'test');
    assert.equal(replaceEverywhere(store, old.url, next.url, 'editor', next), 2);
    const n = store.get('news:n'), e = store.get('events:e');
    assert.equal(n.image, next.url);
    assert.deepEqual(n.imageVariants, next.variants);
    assert.ok(n.body.includes(next.url) && !n.body.includes(old.url.slice(0, -4)));
    assert.deepEqual(e.gallery, ['/x.png', next.url]);
    assert.equal(store.revisions('news:n').length, 2);
    assert.throws(() => replaceEverywhere(store, next.url, 'javascript:alert(1)', 'editor'), /valid image/);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('remote import accepts only the Raikou server and replaces the remote URL', async () => {
  const { dir, store } = setup();
  try {
    await assert.rejects(() => importRemote(store, 'https://evil.example/a.png', dir, 'editor'), /Raikou/);
    await assert.rejects(() => importRemote(store, 'http://127.0.0.1/a.png', dir, 'editor'), /Raikou/);
    const url = IMPORT_PREFIX + 'image/bioinfo/tools/t.png';
    store.save({ id: 'tools:t', collection: 'tools', title: 'T', status: 'published', link: 'https://kaabil.net/t/', image: url }, 0, 'test');
    const bytes = await png();
    const fetcher = async (target, options) => { assert.equal(target, url); assert.equal(options.redirect, 'error'); return new Response(bytes, { status: 200 }); };
    const { file, updated } = await importRemote(store, url, dir, 'editor', fetcher);
    assert.equal(updated, 1);
    assert.equal(store.get('tools:t').image, file.url);
    assert.ok(await uploadedImage(file.url, dir));
    await assert.rejects(() => importRemote(store, url, dir, 'editor', async () => new Response('nope', { status: 404 })), /answered 404/);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('uploads used only by old revisions are deleted only when confirmed; current use always blocks', async () => {
  const { dir, store } = setup();
  try {
    const file = await upload(dir, store);
    const r = { id: 'news:r', collection: 'news', title: 'R', status: 'draft', route: '/news/r', image: file.url };
    store.save(r, 0, 'test');
    await assert.rejects(() => removeImage(file.url, dir, store, { force: true }), /current content/);
    store.save({ ...r, image: '' }, 1, 'test');
    await assert.rejects(() => removeImage(file.url, dir, store), /revisions/);
    await removeImage(file.url, dir, store, { force: true });
    assert.equal(await uploadedImage(file.url, dir), null);
    assert.equal(await uploadedImage(file.variants[0].url, dir), null);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('stored originals are capped at 2560 px on the long edge', async () => {
  const { dir, store } = setup();
  try {
    const big = await sharp({ create: { width: 4000, height: 1000, channels: 3, background: '#000' } }).jpeg().toBuffer();
    const file = await saveImage(new Request('http://localhost', { method: 'POST', body: big }), dir);
    assert.equal(file.width, 2560);
    assert.equal(file.height, 640);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});
