import {ensureEditorial} from '../src/editorial.mjs';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
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

Set DATA_DIR to select the persistent data directory. Import updates matching IDs
and adds new records; it does not delete existing records. Always back up first.
`;
if(!['create-user','export','import','backup','inventory','checkpoint'].includes(command)){console.log(usage);process.exit(command?1:0);}
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
