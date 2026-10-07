/**
 * End-to-end editor workflow against a running site: sign in, create a draft, confirm it is private,
 * preview it, publish it, upload an image, change Homepage settings, check revisions, delete.
 * Leaves no content behind (the test story is deleted; homepage settings are restored).
 *
 *   npm i --no-save playwright && npx playwright install chromium
 *   EDITOR_EMAIL=... EDITOR_PASSWORD=... node scripts/cms-e2e.cjs
 *
 * Optional: BASE_URL (default http://localhost:3000), CHROMIUM_PATH, PLAYWRIGHT_PATH.
 * Note: the Homepage announcement and latest-updates mode are reset to empty / automatic at the end.
 */
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
// 1x1 PNG, enough for the upload endpoint to accept and process.
const IMAGE = join(tmpdir(), 'kaabil-e2e.png');
writeFileSync(IMAGE, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base=process.env.BASE_URL || 'http://localhost:3000';
const EMAIL=process.env.EDITOR_EMAIL, PASSWORD=process.env.EDITOR_PASSWORD;
if(!EMAIL||!PASSWORD){console.error('Set EDITOR_EMAIL and EDITOR_PASSWORD (a disposable editor account).');process.exit(2);}
const TITLE='E2E Lab Story '+Date.now();
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
(async()=>{
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {});
  const ctx = await b.newContext({viewport:{width:1440,height:900}});
  const p = await ctx.newPage();
  p.on('pageerror',e=>console.log('pageerror',e.message));
  const pub = async path => (await (await ctx.request.get(base+path)).text());
  await p.goto(base+'/admin');
  await p.fill('input[type=email]',EMAIL); await p.fill('input[type=password]',PASSWORD);
  await p.click('#login-form button[type=submit]'); await p.waitForSelector('#collections [data-collection]');
  ok(true,'signed in');
  await p.click('[data-collection=news]'); await p.click('#new-record'); await p.waitForSelector('#field-title');
  await p.fill('#field-title',TITLE);
  await p.fill('#field-summary','A story created by the automated editor test.');
  await p.fill('#field-category','Science');
  await p.fill('#field-publishDate','2026-10-06');
  await p.selectOption('#field-status','draft');
  await p.click('#save-record'); await p.waitForTimeout(1200);
  const route = await p.inputValue('#field-route');
  ok(route.startsWith('/news/'),'draft saved with route '+route);
  ok(!(await pub('/news')).includes(TITLE),'draft hidden from /news');
  ok((await ctx.request.get(base+route)).status()===404,'draft route returns 404 publicly');
  const previewHref = await p.getAttribute('#preview-record','href');
  ok((await pub(previewHref)).includes(TITLE),'editor preview shows draft');
  await p.selectOption('#field-status','published');
  await p.click('#save-record'); await p.waitForTimeout(1200);
  ok((await pub('/news')).includes(TITLE),'published story on /news');
  ok((await pub(route)).includes(TITLE),'published story detail page');
  ok((await pub('/')).includes(TITLE),'published story in homepage latest');
  // image upload
  const file = await p.$('#record-editor input[type=file]');
  if (file) { await file.setInputFiles(IMAGE); await p.waitForTimeout(2500); }
  const img = await p.inputValue('#field-image').catch(()=> '');
  ok(/\/uploads\//.test(img),'image uploaded: '+img);
  await p.click('#save-record'); await p.waitForTimeout(1200);
  ok((await pub(route)).includes(img.split('?')[0]),'story page uses uploaded image');
  // revisions
  await p.click('.revision-panel summary'); await p.waitForTimeout(500);
  const revs = await p.$$eval('#revisions .revision, #revisions li, #revisions article', n=>n.length);
  ok(revs>=3,'revision history has '+revs+' entries');
  // homepage settings
  await p.click('#back-list'); await p.waitForTimeout(400);
  await p.click('[data-collection=settings]'); await p.waitForTimeout(400);
  await p.click('.list-edit-btn[data-edit="settings:home"]'); await p.waitForSelector('#field-announcement');
  await p.fill('#field-announcement','E2E announcement: applications open');
  await p.selectOption('#field-feedMode','hidden');
  await p.click('#save-record'); await p.waitForTimeout(1200);
  let home = await pub('/');
  ok(home.includes('E2E announcement: applications open'),'announcement appears on site');
  ok(!home.includes(TITLE),'latest-updates hidden when feed mode is hidden');
  await p.fill('#field-announcement','');
  await p.selectOption('#field-feedMode','automatic');
  await p.click('#save-record'); await p.waitForTimeout(1200);
  home = await pub('/');
  ok(!home.includes('E2E announcement') && home.includes(TITLE),'settings reverted, story back in latest');
  // delete
  await p.click('#back-list'); await p.click('[data-collection=news]'); await p.waitForTimeout(300);
  await p.fill('#record-search',TITLE); await p.waitForTimeout(300);
  await p.click('.list-edit-btn >> nth=0'); await p.waitForSelector('#delete-record');
  await p.click('#delete-record'); await p.click('#confirm-delete'); await p.waitForTimeout(1200);
  ok((await ctx.request.get(base+route)).status()===404,'deleted story is gone');
  
  await b.close();
})();
