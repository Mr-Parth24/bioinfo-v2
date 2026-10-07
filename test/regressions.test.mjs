import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderPage } from '../src/render.mjs';
import { validateRecord } from '../src/content.mjs';
import { Store } from '../src/store.mjs';
import { createApp } from '../src/app.mjs';

const records=JSON.parse(readFileSync(new URL('../content/seed.json',import.meta.url))).records;

test('regenerated preview removes unpublished and renamed routes',async()=>{
 const exporter=await import('../scripts/export-preview.mjs');
 assert.equal(typeof exporter.exportPreview,'function','Export must be callable with an isolated output');
 const dir=mkdtempSync(join(tmpdir(),'bioinfo-export-')),out=join(dir,'site');
 const story={id:'news:review',collection:'news',title:'Review story',status:'published',route:'/news/old-path'};
 try{
  exporter.exportPreview({records:[story],out});assert.ok(existsSync(join(out,'news/old-path/index.html')));
  exporter.exportPreview({records:[{...story,status:'draft'}],out});assert.equal(existsSync(join(out,'news/old-path/index.html')),false);
  exporter.exportPreview({records:[story],out});
  exporter.exportPreview({records:[{...story,route:'/news/new-path'}],out});assert.equal(existsSync(join(out,'news/old-path/index.html')),false);assert.ok(existsSync(join(out,'news/new-path/index.html')));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('conference listings retain venues, exact dates and presentation types',()=>{
 const record=records.find(r=>r.collection==='publications'&&r.category==='Conferences'&&r.original.location);
 const html=renderPage('/publications/conferences',new URLSearchParams(),records).html;
 assert.ok(html.includes(record.original.location.replaceAll('&','&amp;')),'Conference venue must appear');
 assert.ok(html.includes(record.original.date),'Exact date must appear');
 assert.ok(html.includes(record.original.type),'Presentation type must appear');
});

test('tool validation rejects relative links and unsupported protocols before they can break rendering',()=>{
 const tool=records.find(r=>r.collection==='tools');
 for(const link of ['/research','mailto:someone@example.org'])assert.throws(()=>validateRecord({...tool,link}),/absolute|https/i);
});

test('original article relative destinations remain clickable on their original host',()=>{
 const html=renderPage('/news/covidtracker',new URLSearchParams(),records).html;
 for(const path of ['covidTracker/us-state.php','covidTracker/india.php','covidTracker/index.php'])assert.ok(html.includes('href="https://bioinfo.usu.edu/'+path+'"'),path);
});

test('changing an alumnus category moves the person to the current team listing',()=>{
 const person=records.find(r=>r.collection==='people'&&r.memberships?.includes('Alumni'));
 const updated=records.map(r=>r.id===person.id?{...r,category:'Bioinformatics Staff'}:r);
 assert.ok(renderPage('/people/our-team',new URLSearchParams(),updated).html.includes(`href="${person.route}"`));
 assert.ok(!renderPage('/people/alumni',new URLSearchParams(),updated).html.includes(`href="${person.route}"`));
});

test('historical documentation paths redirect to their migrated guides',async()=>{
 const store=new Store(':memory:');store.seed(records);
 try{const app=createApp({store,origin:'http://localhost:3000',dataDir:'/tmp'});
 for(const slug of ['run-local','dev-env','scm-setup']){
  const r=await app(new Request('http://localhost:3000/admin/'+slug));assert.equal(r.status,308);assert.equal(r.headers.get('location'),'/guides/'+slug);
 }}finally{store.close();}
});

test('new content cannot take over listing paths or use unresolvable trailing-slash routes',()=>{
 const story=records.find(r=>r.collection==='news');
 for(const route of ['/tools','/people/alumni','/news/story/'])assert.throws(()=>validateRecord({...story,route}),/route/i);
});

test('event date ranges sort by their first day rather than falling below older events',()=>{
 const events=[{id:'events:old',collection:'events',status:'published',title:'Older event',date:'January 14, 2025',route:'/events/old'},{id:'events:range',collection:'events',status:'published',title:'Range event',date:'April 6-7, 2026',route:'/events/range'}];
 const html=renderPage('/events',new URLSearchParams(),events).html;
 assert.ok(html.indexOf('Range event')<html.indexOf('Older event'));
});
