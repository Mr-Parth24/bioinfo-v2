import sharp from 'sharp';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/store.mjs';
import {hashPassword} from '../src/security.mjs';
const seed=JSON.parse(readFileSync(new URL('../content/seed.json',import.meta.url))).records;
const origin='http://localhost:3000';
async function setup(){
 assert.ok(existsSync(new URL('../src/app.mjs',import.meta.url)),'HTTP application is required');
 const {createApp}=await import('../src/app.mjs');const dir=mkdtempSync(join(tmpdir(),'bioinfo-app-'));const store=new Store(':memory:');store.seed(seed);store.addUser('editor@example.org',hashPassword('valid-test-password-123'));
 return {store,dir,app:createApp({store,origin,dataDir:dir}),close(){store.close();rmSync(dir,{recursive:true,force:true});}};
}
function req(path,{method='GET',body,headers={}}={}) {return new Request(origin+path,{method,headers:{...(method!=='GET'?{'content-type':'application/json',origin}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function login(ctx){const r=await ctx.app(req('/admin/api/login',{method:'POST',body:{email:'editor@example.org',password:'valid-test-password-123'}}));assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:(await r.json()).csrf};}

test('anonymous writes, cross-origin logins and missing CSRF are rejected',async()=>{
 const c=await setup();try{
  assert.equal((await c.app(req('/admin/api/records',{method:'POST',body:{}}))).status,401);
  assert.equal((await c.app(req('/admin/api/login',{method:'POST',body:{},headers:{origin:'https://evil.example'}}))).status,403);
  const auth=await login(c);
  assert.equal((await c.app(req('/admin/api/records',{method:'POST',body:{},headers:{cookie:auth.cookie}}))).status,403);
  const session=await c.app(req('/admin/api/session',{headers:{cookie:auth.cookie}}));assert.equal(session.status,200);
 }finally{c.close();}
});

test('editor can save, preview and publish a draft; public pages see only published content',async()=>{
 const c=await setup();try{
  const auth=await login(c);const headers={cookie:auth.cookie,'x-csrf-token':auth.csrf};
  const record={id:'news:new-entry',collection:'news',slug:'new-entry',route:'/news/new-entry',title:'A newly added lab story',body:'<p>Research update <strong>today</strong>.</p>',status:'draft',link:''};
  let result=await c.app(req('/admin/api/records',{method:'POST',headers,body:{record,version:0}}));assert.equal(result.status,200);let saved=await result.json();
  assert.equal((await c.app(req(record.route))).status,404);
  result=await c.app(req('/admin/preview/news%3Anew-entry',{headers:{cookie:auth.cookie}}));assert.equal(result.status,200);assert.match(await result.text(),/A newly added lab story/);
  result=await c.app(req('/admin/api/records',{method:'POST',headers,body:{record:{...saved,status:'published'},version:saved.version}}));assert.equal(result.status,200);
  result=await c.app(req(record.route));assert.equal(result.status,200);assert.match(await result.text(),/<strong>today<\/strong>/);
  assert.equal((await c.app(req('/admin/api/records',{method:'POST',headers,body:{record:{...saved,title:'lost edit'},version:1}}))).status,409);
  result=await c.app(req('/admin/api/logout',{method:'POST',headers,body:{}}));assert.equal(result.status,200);
  assert.equal((await c.app(req('/admin/api/records',{headers:{cookie:auth.cookie}}))).status,401);
 }finally{c.close();}
});

test('all imported routes render and all public responses have defensive headers',async()=>{
 const c=await setup();try{
  for(const route of ['/', '/tools','/publications','/people','/research','/news','/events','/contact',...seed.map(r=>r.route).filter(Boolean)]){
   const r=await c.app(req(route));assert.equal(r.status,200,route);assert.equal(r.headers.get('x-content-type-options'),'nosniff');
   assert.match(r.headers.get('content-security-policy'),/object-src 'none'/);
  }
  assert.equal((await c.app(req('/assets/../src/store.mjs'))).status,404);
  assert.equal((await c.app(req('/admin/api/records'))).status,401);
 }finally{c.close();}
});

test('uploads require authentication and reject executable files; valid images have generated filenames',async()=>{
 const c=await setup();try{
  const auth=await login(c);
  const upload=body=>new Request(origin+'/admin/api/uploads',{method:'POST',headers:{origin,cookie:auth.cookie,'x-csrf-token':auth.csrf,'content-type':'image/png'},body});
  assert.equal((await c.app(upload('<svg onload="alert(1)"></svg>'))).status,400);
  const png=await sharp({create:{width:1,height:1,channels:3,background:'#ffffff'}}).png().toBuffer();
  const response=await c.app(upload(png));assert.equal(response.status,201);const data=await response.json();assert.match(data.url,/^\/uploads\/[a-f0-9-]+\.png$/);
  const image=await c.app(req(data.url));assert.equal(image.headers.get('content-type'),'image/png');assert.equal(image.status,200);
 }finally{c.close();}
});

test('login rate limiting survives requests and backups can be restored',async()=>{
 const c=await setup();try{
  for(let i=0;i<10;i++)assert.equal((await c.app(req('/admin/api/login',{method:'POST',body:{email:'editor@example.org',password:'wrong'}}),'127.0.0.1')).status,401);
  assert.equal((await c.app(req('/admin/api/login',{method:'POST',body:{email:'editor@example.org',password:'wrong'}}),'127.0.0.1')).status,429);
  const path=join(c.dir,'backup.sqlite');c.store.backup(path);const restored=new Store(path);try{assert.equal(restored.list().length,seed.length);}finally{restored.close();}
 }finally{c.close();}
});
