import test from 'node:test';
import assert from 'node:assert/strict';
import { selectUpdates, activeOpportunities, ensureEditorial } from '../src/editorial.mjs';
import {Store} from '../src/store.mjs';
import {validateRecord} from '../src/content.mjs';
const news=(id,date,status='published')=>({id:'news:'+id,collection:'news',title:id,status,publishDate:date});
test('homepage selection respects explicit order, exclusions and draft privacy',()=>{
 const records=[news('a','2026-01-01'),news('b','2026-02-01'),news('c','2026-03-01','draft'),{...news('d','2026-04-01'),homeVisibility:'exclude'}];
 assert.deepEqual(selectUpdates(records,{feedMode:'automatic',feedCount:3}).map(r=>r.title),['b','a']);
 assert.deepEqual(selectUpdates(records,{feedMode:'selected',feedCount:3,featuredIds:['news:a','news:c','news:b','news:d']}).map(r=>r.title),['a','b']);
});
test('closed and expired vacancies do not appear as active opportunities',()=>{
 const rows=[{id:'a',collection:'opportunities',status:'published',openingStatus:'open',deadline:'2026-12-01'},{id:'b',collection:'opportunities',status:'published',openingStatus:'closed'},{id:'c',collection:'opportunities',status:'published',openingStatus:'open',deadline:'2020-01-01'}];
 assert.deepEqual(activeOpportunities(rows,new Date('2026-10-03T12:00:00Z')).map(r=>r.id),['a']);
});
test('editorial defaults are additive and never overwrite an editor change',()=>{
 const store=new Store(':memory:');try{ensureEditorial(store);const s=store.get('settings:home');store.save({...s,title:'Our edited heading'},s.version,'test');ensureEditorial(store);assert.equal(store.get(s.id).title,'Our edited heading');}finally{store.close();}
});
test('image placement and repeatable profile fields are validated',()=>{
 const record={id:'settings:director',collection:'settings',title:'Director',status:'published'};
 assert.throws(()=>validateRecord({...record,focalX:110}),/focal/i);
 assert.throws(()=>validateRecord({...record,education:[{title:'Test',date:'2000',description:'Text',link:'javascript:alert(1)'}]}),/URL|link/i);
});
test('conference ranges with separate historical years cannot outrank recent updates',()=>{
 const rows=[{...news('new','2026-01-01')},{id:'publications:old',collection:'publications',status:'published',title:'Old conference',date:'March 29-31',year:'2020'}];
 assert.equal(selectUpdates(rows,{feedMode:'automatic',feedCount:2})[0].title,'new');
});

test('legacy edited director biography is visible after additive migration',async()=>{
 const {renderPage}=await import('../src/render.mjs');const store=new Store(':memory:');try{
 const r={id:'pages:rakesh',collection:'pages',title:'Dr. Rakesh Kaundal',status:'published',route:'/people/rakesh',body:'Original'};store.save(r,0,'seed');store.save({...r,body:'<p>Editor-updated biography</p>'},1,'editor');ensureEditorial(store);
 assert.ok(renderPage('/people/rakesh',new URLSearchParams(),store.list()).html.includes('Editor-updated biography'));
 }finally{store.close();}
});
test('normalized dates display on new event listings and details',async()=>{
 const {renderPage}=await import('../src/render.mjs');const event={id:'events:new-date',collection:'events',title:'Future event',status:'published',startDate:'2027-06-15',endDate:'2027-06-16',route:'/events/new-date'};
 for(const path of ['/events',event.route]){const html=renderPage(path,new URLSearchParams(),[event]).html;assert.ok(html.includes('June 15, 2027'));assert.ok(html.includes('June 16, 2027'));}
});

test('legacy director migration preserves drafts and explicit image removal',async()=>{
 const {renderPage}=await import('../src/render.mjs');const {exportPreview}=await import('../scripts/export-preview.mjs');
 const {mkdtempSync,rmSync,readFileSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const store=new Store(':memory:');const dir=mkdtempSync(join(tmpdir(),'director-draft-'));try{
 const r={id:'pages:rakesh',collection:'pages',title:'Director',status:'published',route:'/people/rakesh',body:'Original',image:'https://example.org/original.png'};
 store.save(r,0,'seed');store.save({...r,status:'draft',summary:'PRIVATE_SUMMARY',body:'PRIVATE_DRAFT_2026',image:'',imageAlt:'Edited alt'},1,'editor');ensureEditorial(store);
 const migrated=store.get('settings:director');assert.equal(migrated.status,'draft');assert.equal(migrated.image,'');assert.equal(migrated.imageAlt,'Edited alt');assert.equal(migrated.summary,'PRIVATE_SUMMARY');
 const result=renderPage(r.route,new URLSearchParams(),store.list());assert.equal(result.status,404);assert.ok(!result.html.includes('PRIVATE_DRAFT_2026'));
 assert.ok(renderPage(r.route,new URLSearchParams(),store.list(),{previewRecord:migrated}).html.includes('PRIVATE_DRAFT_2026'));
 const snapshot=exportPreview({records:store.list(),out:join(dir,'preview')});assert.ok(!snapshot.routes.includes(r.route));assert.ok(!readFileSync(join(dir,'preview/index.html'),'utf8').includes('PRIVATE_SUMMARY'));
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

test('homepage hero becomes a slideshow of chosen, latest or random items',async()=>{
 const {renderPage}=await import('../src/render.mjs');
 const {defaults}=await import('../src/editorial.mjs');
 const home=defaults.find(r=>r.id==='settings:home');
 const pic=(id,date,status='published')=>({...news(id,date,status),route:'/news/'+id,image:'https://example.org/'+id+'.jpg'});
 const items=[pic('a','2026-01-01'),pic('b','2026-02-01'),pic('c','2026-03-01','draft'),{...news('d','2026-04-01'),route:'/news/d'}];
 const slides=settings=>[...renderPage('/',new URLSearchParams(),[{...home,...settings},...items]).html.matchAll(/class="hero-slide[^"]*"[^>]*>.*?(?:<a href="([^"]+)">|<\/div><\/div>)/g)].map(m=>m[1]||'photo');
 assert.equal(slides({heroMode:'single'}).length,0,'single photo stays a plain figure');
 assert.deepEqual(slides({heroMode:'latest',heroSlideCount:4}),['photo','/news/b','/news/a'],'latest, published, with images');
 assert.deepEqual(slides({heroMode:'selected',heroSlideIds:['news:a','news:c']}),['photo','/news/a'],'chosen order, drafts skipped');
 assert.equal(slides({heroMode:'random',heroSlideCount:1}).length,2);
 assert.equal(slides({heroMode:'latest',heroSlideCount:1,gallery:['https://example.org/lab.jpg']}).length,3,'extra lab photos join');
 assert.throws(()=>validateRecord({...home,heroSlideIds:['news:a','news:a']}),/related/i);
});
