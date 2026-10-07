import {ensureEditorial,applyContentUpdates} from './editorial.mjs';
/**
 * Thin Node HTTP adapter. Application behavior belongs in app.mjs; this file owns listening, initial seed import and graceful shutdown.
 * See docs/architecture.md for the full data flow and extension guide.
 */
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {Store} from './store.mjs';
import {createApp} from './app.mjs';
const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3000);
const origin=process.env.APP_ORIGIN||`http://localhost:${port}`;
const dataDir=resolve(process.env.DATA_DIR||'data');
const store=new Store(resolve(dataDir,'content.sqlite'));
store.seed(JSON.parse(readFileSync(new URL('../content/seed.json',import.meta.url))).records);
ensureEditorial(store);
const updated=applyContentUpdates(store);if(updated)console.log(`Added editorial content to ${updated} records (empty fields only).`);
const app=createApp({store,origin,dataDir,production:process.env.NODE_ENV==='production'});
const server=http.createServer({maxHeaderSize:16384,requestTimeout:30000,headersTimeout:15000},async(req,res)=>{
 try{
  if(!req.url?.startsWith('/')||req.url.startsWith('//')){res.writeHead(400);res.end('Invalid request URL.');return;}
  const headers=new Headers();for(const[name,value]of Object.entries(req.headers)){if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):value);}
  const method=req.method||'GET';
  const request=new Request(new URL(req.url,origin),{method,headers,...(['GET','HEAD'].includes(method)?{}:{body:Readable.toWeb(req),duplex:'half'})});
  const result=await app(request,req.socket.remoteAddress||'unknown');
  res.writeHead(result.status,Object.fromEntries(result.headers));
  if(result.body)await pipeline(Readable.fromWeb(result.body),res);else res.end();
 }catch(error){if(!res.headersSent)res.writeHead(500,{'content-type':'text/plain'});res.end('Request could not be completed.');console.error('HTTP adapter:',error.message);}
});
server.on('error',error=>{console.error('Unable to start server:',error.message);store.close();process.exitCode=1;});
server.listen(port,host,()=>console.log(`KAABiL version 2: http://${host}:${port}\nEditor: ${origin}/admin\nPersistent data: ${dataDir}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>{store.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
