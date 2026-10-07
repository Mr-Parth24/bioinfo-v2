/**
 * HTTP application boundary: all editor access checks live here. Tests call this Request/Response handler directly, without binding a socket.
 * See docs/architecture.md for the full data flow and extension guide.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { renderPage, legacyRedirects } from './render.mjs';
import { adminPage } from './admin-render.mjs';
import { equalSecret,hashPassword,verifyPassword,sanitizeHtml } from './security.mjs';
import { FIELDS,COLLECTIONS,COLLECTION_FIELDS,SETTINGS_FIELDS,InputError } from './content.mjs';
import { readLimited,saveImage,uploadedImage,removeImage } from './uploads.mjs';
const publicDir=fileURLToPath(new URL('../public/',import.meta.url));
const assetManifest=JSON.parse(await readFile(join(publicDir,'asset-map.json'),'utf8'));
const mediaNames=new Set(Object.values(assetManifest).map(x=>x.url?.replace('/assets/','')).filter(Boolean));
const assets={'site.css':'text/css; charset=utf-8','site.js':'text/javascript; charset=utf-8','admin.css':'text/css; charset=utf-8','admin.js':'text/javascript; charset=utf-8','favicon.svg':'image/svg+xml','theme.css':'text/css; charset=utf-8','fonts/inter-latin-wght-normal.woff2':'font/woff2','fonts/fraunces-latin-wght-normal.woff2':'font/woff2','fonts/fraunces-latin-wght-italic.woff2':'font/woff2'};
const securityHeaders={
 'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin',
 'permissions-policy':'camera=(), microphone=(), geolocation=()',
 'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: http:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
};
function response(body,status=200,headers={}){return new Response(body,{status,headers:{...securityHeaders,'cache-control':'no-store',...headers}});}
function json(body,status=200,headers={}){return response(JSON.stringify(body),status,{'content-type':'application/json; charset=utf-8',...headers});}
const cookieToken=request=>request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('bioinfo_session='))?.slice('bioinfo_session='.length);
async function readJSON(request){if(!request.headers.get('content-type')?.startsWith('application/json'))throw new InputError('Use JSON for this request.',415);try{return JSON.parse((await readLimited(request)).toString('utf8'));}catch(error){if(error instanceof InputError)throw error;throw new InputError('Invalid JSON.');}}
function editShape(record){return {...record,body:sanitizeHtml(record.body),authors:sanitizeHtml(record.authors)};}
export function createApp({store,origin='http://localhost:3000',dataDir,production=false}){
 const base=new URL(origin);if(production&&base.protocol!=='https:')throw new Error('Production APP_ORIGIN must use HTTPS.');
 origin=base.origin;const secure=base.protocol==='https:';const dummy=hashPassword('nonexistent-account-verification-only');
 const sessionCookie=(raw,age=28800)=>`bioinfo_session=${raw}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
 function checkOrigin(request){const reqOrigin=request.headers.get('origin');if(!reqOrigin)throw new InputError('Request origin is not allowed.',403);if(reqOrigin===origin)return;if(!production){try{const p=new URL(reqOrigin),e=new URL(origin);if(['localhost','127.0.0.1'].includes(p.hostname)&&['localhost','127.0.0.1'].includes(e.hostname)&&p.port===e.port)return;}catch{}}throw new InputError('Request origin is not allowed.',403);}
 return async function app(request,remoteAddress='local'){
  try {
   const url=new URL(request.url);let path=url.pathname.replace(/\/$/,'')||'/';
   const method=request.method;
   if(Object.hasOwn(legacyRedirects,path)&&['GET','HEAD'].includes(method))return response(null,308,{location:legacyRedirects[path]+url.search});
   const raw=cookieToken(request),session=store.session(raw);
   if(path==='/healthz'&&method==='GET')return json({status:'ok'});
   if(path.startsWith('/assets/')&&['GET','HEAD'].includes(method)){
    const name=path.slice('/assets/'.length);if(!Object.hasOwn(assets,name)&&!mediaNames.has(name))return response('Not found',404);
    const bytes=await readFile(join(publicDir,name));return response(method==='HEAD'?null:bytes,200,{'content-type':assets[name]||'image/webp','cache-control':name.startsWith('fonts/')?'public, max-age=31536000, immutable':'public, max-age=300'});
   }
   if(path.startsWith('/uploads/')&&['GET','HEAD'].includes(method)){
    const file=await uploadedImage(path,dataDir);if(!file)return response('Not found',404);
    return response(method==='HEAD'?null:file.bytes,200,{'content-type':file.type,'content-security-policy':"default-src 'none'; sandbox",'cache-control':'public, max-age=31536000, immutable'});
   }
   if(path==='/admin/api/login'&&method==='POST'){
    checkOrigin(request);const {email,password}=await readJSON(request);const normalized=String(email||'').trim().toLowerCase();
    const ipAllowed=store.attempt('ip:'+remoteAddress),userAllowed=store.attempt('user:'+normalized);
    if(!ipAllowed||!userAllowed)return json({error:'Too many sign-in attempts. Try again in 15 minutes.'},429,{'retry-after':'900'});
    const user=store.user(normalized);const valid=verifyPassword(password,user?.password||dummy);
    if(!user||!valid)return json({error:'Email or password is incorrect.'},401);
    if(raw)store.revokeSession(raw);const created=store.createSession(user.email);
    return json({email:user.email,csrf:created.csrf},200,{'set-cookie':sessionCookie(created.token)});
   }
   if(path.startsWith('/admin/api/')){
    if(!session)return json({error:'Sign in to continue.'},401);
    if(!['GET','HEAD'].includes(method)){checkOrigin(request);if(!equalSecret(request.headers.get('x-csrf-token'),session.csrf))throw new InputError('Your session needs to be refreshed before saving.',403);}
    if(path==='/admin/api/session'&&method==='GET')return json({email:session.email,csrf:session.csrf,collections:COLLECTIONS,fields:FIELDS,collectionFields:COLLECTION_FIELDS,settingsFields:SETTINGS_FIELDS});
    if(path==='/admin/api/logout'&&method==='POST'){store.revokeSession(raw);return json({ok:true},200,{'set-cookie':sessionCookie('',0)});}
    if(path==='/admin/api/records'&&method==='GET')return json(store.list().map(editShape));
    if(path==='/admin/api/records'&&method==='POST'){
     const payload=await readJSON(request),input=payload.record;
     if(!input||!Number.isSafeInteger(payload.version)||payload.version<0)throw new InputError('Record and version are required.');
     if(input.id==='pages:rakesh'&&store.get('settings:director'))throw new InputError('Edit this profile under Homepage, footer & director → Dr. Rakesh Kaundal.');
     const current=store.get(input.id);const clean=current?{...current}:{id:input.id,collection:input.collection,slug:input.slug,original:{}};
     for(const key of Object.keys(FIELDS))if(Object.hasOwn(input,key))clean[key]=input[key];
     if(current&&clean.image!==current.image){
      if(JSON.stringify(clean.imageVariants)===JSON.stringify(current.imageVariants)){clean.imageVariants=[];clean.imageWidth=0;clean.imageHeight=0;}
      if(clean.imageOriginal===current.imageOriginal)clean.imageOriginal='';
     }
     for(const key of ['body','authors'])if(typeof clean[key]==='string')clean[key]=sanitizeHtml(clean[key]);
     if(clean.collection==='tools'&&!clean.link)throw new InputError('A tool destination is required.');
     if(!current&&['news','events','people','research','pages','opportunities'].includes(clean.collection)&&!clean.route)throw new InputError('A website path is required.');
     const saved=store.save(clean,payload.version,session.email);return json(editShape(saved));
    }
    if(path==='/admin/api/revisions'&&method==='GET')return json(store.revisions(url.searchParams.get('id')||'').map(r=>({...r,data:editShape(r.data)})));
    if(path==='/admin/api/export'&&method==='GET')return json({schemaVersion:1,records:store.list()},200,{'content-disposition':'attachment; filename="bioinfo-content.json"'});
    if(path==='/admin/api/media'&&method==='GET')return json([...store.mediaList(),...Object.entries(assetManifest).filter(([,v])=>v.url).map(([source,v])=>({...v,source,type:'image/webp',usage:store.mediaUsage(source),builtIn:true}))]);
    if(path==='/admin/api/media'&&method==='DELETE'){const payload=await readJSON(request);await removeImage(payload.url,dataDir,store);return json({ok:true});}
    if(path==='/admin/api/records'&&method==='DELETE'){const payload=await readJSON(request);if(!payload.id||typeof payload.id!=='string')throw new InputError('Record ID is required.');const record=store.get(payload.id);if(!record)throw new InputError('Record not found.',404);if(record.collection==='settings')throw new InputError('Settings records cannot be deleted.');store.deleteRecord(payload.id,session.email);return json({ok:true});}
    if(path==='/admin/api/uploads'&&method==='POST'){const file=await saveImage(request,dataDir);store.addMedia(file);return json(file,201);}
    return json({error:'Unknown editor endpoint.'},404);
   }
   if(path==='/admin'&&method==='GET')return response(adminPage({session,configured:store.hasUsers()}),200,{'content-type':'text/html; charset=utf-8','x-robots-tag':'noindex, nofollow'});
   if(path.startsWith('/admin/preview/')&&method==='GET'){
    if(!session)return response(null,303,{location:'/admin'});
    const id=decodeURIComponent(path.slice('/admin/preview/'.length)),record=store.get(id);if(!record)return response('Not found',404);
    return response(renderPage(record.route||'/',url.searchParams,store.list(),{previewRecord:record}).html,200,{'content-type':'text/html; charset=utf-8','x-robots-tag':'noindex, nofollow'});
   }
   if(!['GET','HEAD'].includes(method))return json({error:'Method not allowed.'},405,{'allow':'GET, HEAD'});
   const result=renderPage(path,url.searchParams,store.list());
   return response(method==='HEAD'?null:result.html,result.status,{'content-type':'text/html; charset=utf-8'});
  }catch(error){
   if(error instanceof InputError)return json({error:error.message},error.status);
   if(error instanceof URIError)return json({error:'Invalid URL.'},400);
   console.error('Request failed:',error.message);return json({error:'The request could not be completed.'},500);
  }
 };
}
