import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Store} from '../src/store.mjs';
import {renderPage} from '../src/render.mjs';
import {validateRecord,COLLECTION_FIELDS} from '../src/content.mjs';
const seed=JSON.parse(readFileSync(new URL('../content/seed.json',import.meta.url))).records;
const person={id:'people:new-member',collection:'people',slug:'new-member',route:'/people/new-member',title:'Example Member',summary:'Graduate researcher',status:'published',memberStatus:'current',role:'PhD researcher',startYear:'2022',endYear:'2026',researchInterests:'Computational biology and data science',dissertationTitle:'An example dissertation',dissertationUrl:'https://example.edu/dissertation.pdf',workLinks:[{type:'Research portfolio',link:'https://example.edu/portfolio'}],publicationIds:[],toolIds:[],body:'<p>Member biography.</p>',link:''};

test('member record drives profile, related work and current/alumni directories',()=>{
 const publication=seed.find(r=>r.collection==='publications'&&r.category==='Papers');const tool=seed.find(r=>r.collection==='tools');
 const record={...person,publicationIds:[publication.id],toolIds:[tool.id]};const records=[...seed,record];
 let html=renderPage(record.route,new URLSearchParams(),records).html;
 for(const value of [record.dissertationTitle,record.dissertationUrl,record.researchInterests,record.workLinks[0].link,publication.title.replaceAll('&','&amp;'),tool.link])assert.ok(html.includes(value),value);
 assert.ok(renderPage('/people/our-team',new URLSearchParams(),records).html.includes('href="/people/new-member"'));
 const alumni=records.map(r=>r.id===record.id?{...r,memberStatus:'alumni'}:r);
 assert.ok(!renderPage('/people/our-team',new URLSearchParams(),alumni).html.includes('href="/people/new-member"'));
 assert.ok(renderPage('/people/alumni',new URLSearchParams(),alumni).html.includes('href="/people/new-member"'));
});

test('member CMS fields include structured profile and related-record controls',()=>{
 for(const field of ['memberStatus','role','startYear','endYear','researchInterests','dissertationTitle','dissertationUrl','workLinks','publicationIds','toolIds'])assert.ok(COLLECTION_FIELDS.people.includes(field),field);
});

test('member validation rejects unsafe dissertation links, bad status and impossible year ranges',()=>{
 assert.throws(()=>validateRecord({...person,dissertationUrl:'javascript:alert(1)'}),/dissertation|URL/i);
 assert.throws(()=>validateRecord({...person,memberStatus:'unknown'}),/status/i);
 assert.throws(()=>validateRecord({...person,startYear:'2026',endYear:'2020'}),/year/i);
 assert.throws(()=>validateRecord({...person,workLinks:[{type:'Work',link:'javascript:alert(1)'}]}),/link/i);
});

test('related publication and tool references are validated and draft work stays private',()=>{
 const store=new Store(':memory:');try{
  store.seed(seed);
  assert.throws(()=>store.save({...person,publicationIds:['publications:missing']},0,'editor'),/publication|reference/i);
  assert.throws(()=>store.save({...person,toolIds:[seed.find(r=>r.collection==='people').id]},0,'editor'),/tool|reference/i);
  const publication=seed.find(r=>r.collection==='publications');let existing=store.get(publication.id);store.save({...existing,status:'draft'},existing.version,'editor');
  store.save({...person,publicationIds:[publication.id]},0,'editor');
  const html=renderPage(person.route,new URLSearchParams(),store.list()).html;
  assert.ok(!html.includes(publication.title.replaceAll('&','&amp;')));
 }finally{store.close();}
});

test('content imports resolve forward references and roll back invalid relationships',()=>{
 const store=new Store(':memory:');try{
  const publication=seed.find(r=>r.collection==='publications');
  store.import([{...person,publicationIds:[publication.id]},publication],'editor');
  assert.deepEqual(store.get(person.id).publicationIds,[publication.id]);
  assert.throws(()=>store.import([{...person,title:'Must roll back'},{...publication,id:'publications:invalid',toolIds:['tools:missing']}],'editor'),/reference/);
  assert.equal(store.get(person.id).title,person.title);
 }finally{store.close();}
});

test('joining and finishing months are validated and shown on the profile',()=>{
 assert.throws(()=>validateRecord({...person,startYear:'2022',startMonth:'9',endYear:'2022',endMonth:'3'}),/month/i);
 assert.throws(()=>validateRecord({...person,startMonth:'13'}),/startMonth/);
 const html=renderPage('/people/new-member',new URLSearchParams(),[{...person,startYear:'2021',startMonth:'8',endYear:'2024',endMonth:'5'}]).html;
 assert.match(html,/Aug 2021 – May 2024/);
});
