import sharp from 'sharp';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/store.mjs';
import {hashPassword,sanitizeHtml} from '../src/security.mjs';
import {createApp} from '../src/app.mjs';
const seed=JSON.parse(readFileSync(new URL('../content/seed.json',import.meta.url))).records;
function setup(origin='http://localhost:3000'){
 const dir=mkdtempSync(join(tmpdir(),'bioinfo-sec-'));const store=new Store(':memory:');store.seed(seed);store.addUser('editor@example.org',hashPassword('valid-test-password-123'));
 return {origin,dir,store,app:createApp({store,origin,dataDir:dir}),close(){store.close();rmSync(dir,{recursive:true,force:true});}};
}
const req=(c,path,{method='GET',body,headers={}}={})=>new Request(c.origin+path,{method,headers:{...(method!=='GET'?{'content-type':'application/json',origin:c.origin}:{}),...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});

test('sanitizer balances unclosed tags and drops stray closing tags',()=>{
 assert.equal(sanitizeHtml('<div><section><p>text'),'<div><section><p>text</p></section></div>');
 assert.equal(sanitizeHtml('</div></main><p>ok</p></section>'),'<p>ok</p>');
 assert.equal(sanitizeHtml('<ul><li>a<li>b</ul>'),'<ul><li>a<li>b</li></li></ul>');
});

test('sanitizer refuses ids used by the site chrome and studio',()=>{
 for(const id of ['site-nav','main','nav-panel-0','save-record','field-title','logout'])assert.ok(!sanitizeHtml(`<h2 id="${id}">x</h2>`).includes('id='),id);
 assert.ok(sanitizeHtml('<h2 id="methods">x</h2>').includes('id="methods"'));
});

test('sanitizer removes script, handlers, styles and dangerous URLs in every disguise',()=>{
 const out=sanitizeHtml('<img src=x onerror=alert(1)><a href="jav&#x09;ascript:alert(1)">a</a><a href="JaVaScRiPt:alert(1)">b</a><p style="x" onclick="y">c</p><svg onload=alert(1)><script>alert(1)</script><iframe src="https://e.example"></iframe><a href="data:text/html,x">d</a><a href="//evil.example">e</a>');
 assert.doesNotMatch(out,/onerror|onclick|onload|style=|javascript|<script|<svg|<iframe|data:|evil\.example/i);
});

test('every response carries the hardened security headers; HSTS only over HTTPS',async()=>{
 const c=setup();try{
  const r=await c.app(req(c,'/'));
  assert.equal(r.headers.get('cross-origin-opener-policy'),'same-origin');
  assert.match(r.headers.get('content-security-policy'),/img-src 'self' https:;/);
  assert.doesNotMatch(r.headers.get('content-security-policy'),/unsafe-inline|unsafe-eval|http: /);
  assert.equal(r.headers.get('strict-transport-security'),null);
 }finally{c.close();}
 const s=setup('https://kaabil.example.edu');try{
  assert.match((await s.app(req(s,'/'))).headers.get('strict-transport-security'),/max-age=31536000/);
 }finally{s.close();}
});

test('robots.txt keeps crawlers out of the studio',async()=>{
 const c=setup();try{
  const r=await c.app(req(c,'/robots.txt'));
  assert.equal(r.status,200);assert.match(await r.text(),/Disallow: \/admin/);
 }finally{c.close();}
});

test('oversized bodies close the connection and successful sign-in resets the account lockout counter',async()=>{
 const c=setup();try{
  const big=await c.app(req(c,'/admin/api/login',{method:'POST',body:'x'.repeat(2*1024*1024)}));
  assert.equal(big.status,413);assert.equal(big.headers.get('connection'),'close');
  for(let i=0;i<8;i++)await c.app(req(c,'/admin/api/login',{method:'POST',body:{email:'editor@example.org',password:'wrong-password-123456'}}),'10.0.0.'+i);
  assert.equal((await c.app(req(c,'/admin/api/login',{method:'POST',body:{email:'editor@example.org',password:'valid-test-password-123'}}),'10.0.1.1')).status,200);
  for(let i=0;i<9;i++)assert.equal((await c.app(req(c,'/admin/api/login',{method:'POST',body:{email:'editor@example.org',password:'wrong-password-123456'}}),'10.0.2.'+i)).status,401,'counter was reset');
 }finally{c.close();}
});

test('uploaded photos are stored without EXIF metadata such as GPS location',async()=>{
 const c=setup();try{
  const login=await c.app(req(c,'/admin/api/login',{method:'POST',body:{email:'editor@example.org',password:'valid-test-password-123'}}));
  const cookie=login.headers.get('set-cookie').split(';')[0],{csrf}=await login.json();
  const jpeg=await sharp({create:{width:64,height:64,channels:3,background:'#336699'}}).jpeg().withExif({IFD0:{Artist:'Secret Location Owner'},GPS:{GPSLatitude:'41/1 44/1 0/1'}}).toBuffer();
  assert.ok((await sharp(jpeg).metadata()).exif,'fixture has EXIF');
  const r=await c.app(new Request(c.origin+'/admin/api/uploads',{method:'POST',headers:{origin:c.origin,cookie,'x-csrf-token':csrf,'content-type':'image/jpeg'},body:jpeg}));
  assert.equal(r.status,201);
  const file=readdirSync(join(c.dir,'uploads')).find(f=>f.endsWith('.jpg'));
  const stored=readFileSync(join(c.dir,'uploads',file));
  assert.equal((await sharp(stored).metadata()).exif,undefined);
  assert.ok(!stored.includes(Buffer.from('Secret Location Owner')));
 }finally{c.close();}
});
