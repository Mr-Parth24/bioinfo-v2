import {ensureEditorial} from '../src/editorial.mjs';
import {readFileSync,writeFileSync,mkdirSync,existsSync,cpSync,readdirSync,renameSync,statSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {Store} from '../src/store.mjs';
import {hashPassword} from '../src/security.mjs';
const [command,arg]=process.argv.slice(2),dataDir=resolve(process.env.DATA_DIR||'data');
const usage=`Usage:
  node scripts/manage.mjs create-user editor@example.org   (password from standard input)
  node scripts/manage.mjs export /path/content.json
  node scripts/manage.mjs import /path/content.json
  node scripts/manage.mjs backup /path/backup.sqlite
  node scripts/manage.mjs inventory
  node scripts/manage.mjs checkpoint   (run before committing data/content.sqlite)
  node scripts/manage.mjs backup-all /path/new-folder      (database snapshot + every upload)
  node scripts/manage.mjs restore-all /path/backup-folder  (into an empty DATA_DIR; server stopped)
  node scripts/manage.mjs optimize-uploads                 (shrink stored originals to 2560 px)

Set DATA_DIR to select the persistent data directory. Import updates matching IDs
and adds new records; it does not delete existing records. Always back up first.
`;
if(!['create-user','export','import','backup','inventory','checkpoint','backup-all','restore-all','optimize-uploads'].includes(command)){console.log(usage);process.exit(command?1:0);}
/* Restoring must happen before a database is opened (opening one creates it). */
if(command==='restore-all'){
 try{
  if(!arg)throw new Error('A backup folder is required.');const from=resolve(arg);
  if(!existsSync(join(from,'content.sqlite')))throw new Error('No content.sqlite in that folder. Choose a folder made by backup-all.');
  if(existsSync(join(dataDir,'content.sqlite')))throw new Error(`${dataDir} already has a database. Restore into an empty data folder (or move the old one aside first).`);
  mkdirSync(dataDir,{recursive:true});cpSync(join(from,'content.sqlite'),join(dataDir,'content.sqlite'));
  if(existsSync(join(from,'uploads')))cpSync(join(from,'uploads'),join(dataDir,'uploads'),{recursive:true});
  console.log(`Restored database and ${existsSync(join(dataDir,'uploads'))?readdirSync(join(dataDir,'uploads')).length:0} upload files into ${dataDir}. Start the site and check it.`);
 }catch(error){console.error(error.message);process.exitCode=1;}
 process.exit();
}
const store=new Store(resolve(dataDir,'content.sqlite'));
try{
 store.seed(JSON.parse(readFileSync(new URL('../content/seed.json',import.meta.url))).records);
ensureEditorial(store);
 if(command==='create-user'){
  if(!arg)throw new Error('An editor email is required.');
  if(process.stdin.isTTY)throw new Error('Read the password silently in your shell and pipe it to this command. See README; do not put it in shell history.');
  const password=readFileSync(0,'utf8').replace(/\r?\n$/,'');store.addUser(arg,hashPassword(password));console.log('Editor account created or password reset; existing sessions revoked.');
 }else if(command==='checkpoint'){
  const result=store.checkpoint(),check=store.integrity();
  if(result.busy||check!=='ok')throw new Error(`Checkpoint incomplete (${check}). Stop the server and try again.`);
  console.log('All changes are now in content.sqlite; the -wal/-shm files are not needed for a commit.');
 }else if(command==='inventory'){
  const records=store.list(),counts={};for(const r of records)counts[r.collection]=(counts[r.collection]||0)+1;
  console.log(JSON.stringify({records:records.length,collections:counts,editorConfigured:store.hasUsers()},null,2));
 }else if(command==='backup-all'){
  if(!arg)throw new Error('A new backup folder path is required.');const to=resolve(arg);
  if(existsSync(to))throw new Error('That folder already exists. Choose a new path.');
  mkdirSync(to,{recursive:true,mode:0o700});store.backup(join(to,'content.sqlite'));
  const uploads=join(dataDir,'uploads');let files=0;
  if(existsSync(uploads)){cpSync(uploads,join(to,'uploads'),{recursive:true});files=readdirSync(uploads).length;}
  writeFileSync(join(to,'backup.json'),JSON.stringify({createdAt:new Date().toISOString(),records:store.list().length,uploadFiles:files,restore:'node scripts/manage.mjs restore-all <this folder>'},null,2)+'\n');
  console.log(`Backed up the database and ${files} upload files to ${to}. It contains password hashes: keep it private.`);
 }else if(command==='optimize-uploads'){
  const {default:sharp}=await import('sharp');const {MAX_EDGE}=await import('../src/uploads.mjs');
  const folder=join(dataDir,'uploads');let changed=0,saved=0;
  for(const name of existsSync(folder)?readdirSync(folder).filter(n=>/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(n)):[]){
   const path=join(folder,name),meta=await sharp(path).metadata(),url='/uploads/'+name,known=store.mediaFiles().find(f=>f.url===url);
   if(Math.max(meta.width,meta.height)<=MAX_EDGE){
    // Already small enough: just make sure the library shows the real size.
    const bytes=statSync(path).size;
    if(known&&(known.width!==meta.width||known.height!==meta.height||known.bytes!==bytes))store.updateMedia({...known,width:meta.width,height:meta.height,bytes});
    continue;
   }
   const before=statSync(path).size,image=sharp(path).resize({width:MAX_EDGE,height:MAX_EDGE,fit:'inside'});
   const out=await (name.endsWith('.jpg')?image.jpeg({quality:85,mozjpeg:true}):name.endsWith('.png')?image.png({compressionLevel:9}):image.webp({quality:85})).toBuffer();
   writeFileSync(path+'.tmp',out,{mode:0o640});renameSync(path+'.tmp',path);
   const size=await sharp(out).metadata();
   store.updateMedia({...(known||{url}),width:size.width,height:size.height,bytes:out.length});changed++;saved+=before-out.length;
  }
  console.log(`Optimized ${changed} originals, saving ${(saved/1e6).toFixed(1)} MB. Pages use the responsive variants, which are unchanged.`);
 }else{
  if(!arg)throw new Error('A file path is required.');const path=resolve(arg);
  if(command==='import'){
   const data=JSON.parse(readFileSync(path,'utf8'));if(data.schemaVersion!==1||!Array.isArray(data.records))throw new Error('Expected schemaVersion 1 and a records array.');
   store.import(data.records,'cli-import');console.log(`Imported ${data.records.length} records atomically; omitted records retained.`);
  }else{
   if(existsSync(path))throw new Error('Output already exists. Choose a new path.');mkdirSync(dirname(path),{recursive:true});
   if(command==='backup')store.backup(path);else writeFileSync(path,JSON.stringify({schemaVersion:1,records:store.list()},null,2)+'\n',{flag:'wx',mode:0o600});
   console.log(`Created ${path}`);
  }
 }
}catch(error){console.error(error.message);process.exitCode=1;}finally{store.close();}
