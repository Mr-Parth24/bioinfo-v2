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
 assert.ok(applyContentUpdates(store)>0);
 assert.equal(store.get('research:hpi').body,'<p>Editor text</p>','editor body kept');
 assert.ok(store.get('research:hpi').toolIds.length,'empty relations filled');
 assert.match(store.get('research:ai').body,/Our approach/);
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
