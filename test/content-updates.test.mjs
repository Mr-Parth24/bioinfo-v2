import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Store} from '../src/store.mjs';
import {applyContentUpdates,withContentUpdates} from '../src/editorial.mjs';
import {renderPage} from '../src/render.mjs';
const seed=JSON.parse(readFileSync(new URL('../content/seed.json',import.meta.url))).records;
const updates=JSON.parse(readFileSync(new URL('../content/content-updates.json',import.meta.url))).records;

test('every reference in the editorial content exists',()=>{
 const ids=new Set(seed.map(r=>r.id));
 for(const [id,fields] of Object.entries(updates)){
  assert.ok(ids.has(id),id);
  for(const ref of [...(fields.toolIds||[]),...(fields.publicationIds||[])])assert.ok(ids.has(ref),`${id} → ${ref}`);
 }
});

test('content updates fill empty fields once and never overwrite editors',()=>{
 const store=new Store(':memory:');store.seed(seed);
 const edited={...store.get('research:hpi'),body:'<p>Editor text</p>'};
 store.save(edited,edited.version,'editor');
 assert.ok(applyContentUpdates(store)>=0);
 assert.equal(store.get('research:hpi').body,'<p>Editor text</p>','editor body kept');
 assert.ok(store.get('research:hpi').toolIds.length,'empty relations filled');
 assert.match(store.get('research:ai').body,/Computational modeling through pattern recognition/,'untouched text gets the latest replacement');
 const cleared={...store.get('research:ai'),body:''};store.save(cleared,cleared.version,'editor');
 assert.equal(applyContentUpdates(store),0,'runs once per database');
 assert.equal(store.get('research:ai').body,'','a deliberately emptied field stays empty');
 store.close();
});

test('research area pages show the area’s tools and publications',()=>{
 const records=withContentUpdates(seed);
 const html=renderPage('/research/hpi',new URLSearchParams(),records).html;
 assert.match(html,/Tools &amp; databases/);
 assert.ok(html.includes('href="https://kaabil.net/hupoxnet/"'));
 assert.match(html,/data-table/);
 assert.match(renderPage('/research',new URLSearchParams(),records).html,/area-counts/);
});

test('research illustrations replace only the original images, once',()=>{
 const store=new Store(':memory:');store.seed(seed);
 const chosen={...store.get('research:hpi'),image:'https://example.org/editor-choice.jpg'};
 store.save(chosen,chosen.version,'editor');
 applyContentUpdates(store);
 assert.equal(store.get('research:hpi').image,'https://example.org/editor-choice.jpg','an editor’s image is kept');
 const ai=store.get('research:ai');
 assert.equal(ai.image,'/assets/media/research-ai-1600.webp');
 assert.equal(ai.imageVariants.length,3);
 const reverted={...ai,image:seed.find(r=>r.id==='research:ai').image};store.save(reverted,ai.version,'editor');
 assert.equal(applyContentUpdates(store),0,'runs once per database');
 assert.equal(store.get('research:ai').image,reverted.image,'a deliberate revert stays');
 const html=renderPage('/research',new URLSearchParams(),withContentUpdates(seed)).html;
 assert.match(html,/srcset="\/assets\/media\/research-ngs-640\.webp 640w/);
 store.close();
});

test('the old developer guides are unpublished once, and stay as editors leave them',()=>{
 const store=new Store(':memory:');store.seed(seed);
 applyContentUpdates(store);
 for(const id of ['pages:guide-dev-env','pages:guide-run-local','pages:guide-scm-setup'])assert.equal(store.get(id).status,'draft',id);
 const page=store.get('pages:guide-dev-env');store.save({...page,status:'published'},page.version,'editor');
 applyContentUpdates(store);
 assert.equal(store.get('pages:guide-dev-env').status,'published','an editor can republish it');
 assert.equal(withContentUpdates(seed).find(r=>r.id==='pages:guide-scm-setup').status,'draft','static export from seed agrees');
 store.close();
});
