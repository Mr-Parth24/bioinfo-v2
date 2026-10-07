import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function modules() {
  assert.ok(existsSync(new URL('../src/store.mjs', import.meta.url)), 'Persistent content implementation is required');
  return { ...(await import('../src/store.mjs')), ...(await import('../src/content.mjs')), ...(await import('../src/security.mjs')) };
}
const record = {id:'news:example',collection:'news',slug:'example',title:'Original story',summary:'Details',body:'<p>Original body</p>',status:'published',route:'/news/example',link:'',original:{title:'Original story'}};

test('saved content survives restart, preserves provenance and prevents lost edits', async () => {
  const { Store }=await modules(); const dir=mkdtempSync(join(tmpdir(),'bioinfo-test-'));
  let store=new Store(join(dir,'test.sqlite'));
  try {
    store.seed([record]); let first=store.get(record.id);
    const saved=store.save({...first,title:'Updated story'},first.version,'editor@example.org');
    assert.equal(saved.version,2);
    assert.throws(()=>store.save({...first,title:'Stale edit'},first.version,'other@example.org'), /changed|conflict/i);
    assert.deepEqual(saved.original,record.original);
    assert.equal(store.revisions(record.id).length,2);
    store.close(); store=new Store(join(dir,'test.sqlite'));
    assert.equal(store.get(record.id).title,'Updated story');
    store.seed([record]); assert.equal(store.get(record.id).title,'Updated story');
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});

test('draft content is excluded from public lists and parameterized IDs cannot change other rows',async()=>{
  const {Store}=await modules();const store=new Store(':memory:');
  try {
    store.seed([record,{...record,id:'news:draft',slug:'draft',route:'/news/draft',status:'draft'}]);
    assert.equal(store.list({published:true}).length,1);
    assert.equal(store.get("' OR 1=1 --"),null);
    assert.equal(store.list().length,2);
  }finally{store.close();}
});

test('schema rejects unsafe URLs, reserved routes, oversized content and duplicate routes',async()=>{
  const {validateRecord,Store}=await modules();
  assert.throws(()=>validateRecord({...record,link:'javascript:alert(1)'}),/URL|link/i);
  assert.throws(()=>validateRecord({...record,route:'/admin/login'}),/route/i);
  assert.throws(()=>validateRecord({...record,title:'x'.repeat(601)}),/title/i);
  const store=new Store(':memory:');try{store.seed([record]);assert.throws(()=>store.save({...record,id:'news:other'},0,'admin'),/route/i);}finally{store.close();}
});

test('rich text preserves scholarly formatting while removing executable markup',async()=>{
  const {sanitizeHtml,safeUrl}=await modules();
  const output=sanitizeHtml('<p>Hello <em>science</em><sup>2</sup><script>alert(1)</script><img src=x onerror=alert(2)><a href="jav&#x61;script:alert(3)">bad</a><svg onload=alert(4)></svg></p>');
  assert.match(output,/<em>science<\/em><sup>2<\/sup>/);
  assert.doesNotMatch(output,/script|onerror|onload|<svg|alert\(/i);
  assert.equal(safeUrl('//evil.example/'),'');
  assert.equal(safeUrl('https://kaabil.net/PredHPI/'),'https://kaabil.net/PredHPI/');
  assert.equal(safeUrl('java\nscript:alert(1)'),'');
});

test('passwords are salted, sessions expire and revocation removes access',async()=>{
  const {Store,hashPassword,verifyPassword}=await modules();
  const hash=hashPassword('a-long-test-password-42');assert.notEqual(hash,hashPassword('a-long-test-password-42'));
  assert.ok(verifyPassword('a-long-test-password-42',hash));assert.equal(verifyPassword('incorrect',hash),false);
  const store=new Store(':memory:');try{
    store.addUser('editor@example.org',hash);
    const session=store.createSession('editor@example.org');
    assert.equal(store.session(session.token).email,'editor@example.org');
    assert.equal(store.session(session.token,Date.now()+9*60*60*1000),null);
    store.revokeSession(session.token);assert.equal(store.session(session.token),null);
  }finally{store.close();}
});
