import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const records=JSON.parse(readFileSync(new URL('../content/seed.json',import.meta.url))).records;
async function renderer(){assert.ok(existsSync(new URL('../src/render.mjs',import.meta.url)),'Public renderer is required');return import('../src/render.mjs');}

test('every imported public route renders its title and no template syntax remains',async()=>{
 const {renderPage}=await renderer();
 for(const record of records.filter(r=>r.route)){
  const result=renderPage(record.route,new URLSearchParams(),records);
  assert.equal(result.status,200,record.route);
  assert.doesNotMatch(result.html,/\{%|\{\{/,'unexpanded template at '+record.route);
  assert.match(result.html,/<main\b/);
 }
});
test('tools directory retains every exact destination and each historic category anchor',async()=>{
 const {renderPage}=await renderer();const {html}=renderPage('/tools',new URLSearchParams(),records);
 for(const tool of records.filter(r=>r.collection==='tools'))assert.ok(html.includes(`href="${tool.link.replaceAll('&','&amp;')}"`),tool.title);
 for(const id of ['hpi','cellularloc','db','metagenomics','ngsPack','rgenes','descriptors','bionrg','disease'])assert.ok(html.includes(`id="${id}"`),id);
});
test('homepage navigation and all three publication archives are available without JavaScript',async()=>{
 const {renderPage}=await renderer();const home=renderPage('/',new URLSearchParams(),records).html;
 for(const route of ['/research','/people','/publications','/tools','/news','/events','/contact'])assert.ok(home.includes(`href="${route}"`));
 for(const mode of ['pub','conf','edit']){
  const result=renderPage('/publications',new URLSearchParams({content:mode}),records);
  assert.equal(result.status,200);assert.match(result.html,/publication-list/);
 }
 assert.equal(renderPage('/not-a-page',new URLSearchParams(),records).status,404);
});
