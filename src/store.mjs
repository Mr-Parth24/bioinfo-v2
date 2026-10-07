/**
 * Persistence boundary. Records and revisions commit atomically; version checks prevent concurrent editors from silently overwriting each other.
 * See docs/architecture.md for the full data flow and extension guide.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { digest, token } from './security.mjs';
import { validateRecord, InputError } from './content.mjs';

export class Store {
  constructor(filename) {
    if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
    this.db=new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, collection TEXT NOT NULL, route TEXT UNIQUE, status TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY, record_id TEXT NOT NULL, version INTEGER NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS users(email TEXT PRIMARY KEY, password TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY, count INTEGER NOT NULL, started INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS media(url TEXT PRIMARY KEY,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  }
  close(){this.db.close();}
  get(id){const row=this.db.prepare('SELECT data,version,updated_at FROM records WHERE id=?').get(id);return row?{...JSON.parse(row.data),version:row.version,updatedAt:row.updated_at}:null;}
  list({published=false,collection}={}){
    let sql='SELECT id FROM records WHERE 1=1';const args=[];
    if(published){sql+=' AND status=?';args.push('published');}
    if(collection){sql+=' AND collection=?';args.push(collection);}
    sql+=' ORDER BY rowid';return this.db.prepare(sql).all(...args).map(row=>this.get(row.id));
  }
  seed(records){
    if(this.db.prepare("SELECT value FROM metadata WHERE key='seeded'").get())return;
    this.db.exec('BEGIN IMMEDIATE');
    try {for(const record of records)this._save(record,0,'initial-import',records);this.db.prepare('INSERT INTO metadata(key,value) VALUES (?,?)').run('seeded',new Date().toISOString());this.db.exec('COMMIT');}
    catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  _save(record,expectedVersion,actor,batch=[]){
    validateRecord(record);
    // Batch lookup supports forward references in a full content export/import.
    for(const [field,collection] of [['publicationIds','publications'],['toolIds','tools'],['eventIds','events'],['opportunityIds','opportunities'],['researchIds','research'],['peopleIds','people'],['featuredIds',['news','events','publications']]]){
      for(const id of record[field]||[]){
        const target=batch.find(item=>item.id===id)||this.get(id);
        if(!target||!(Array.isArray(collection)?collection:[collection]).includes(target.collection))throw new InputError(`Invalid ${collection} reference: ${id}`);
      }
    }
    const current=this.get(record.id);
    if((current?.version??0)!==expectedVersion)throw new InputError('This record changed in another session. Reload before saving.',409);
    if(current&&current.collection!==record.collection)throw new InputError('Collection cannot be changed.');
    const version=(current?.version??0)+1,now=new Date().toISOString();
    const clean={...record};delete clean.version;delete clean.updatedAt;
    if(current){for(const key of ['original','source','sourceBody','detailOriginal'])if(key in current)clean[key]=current[key];}
    const duplicate=record.route?this.db.prepare('SELECT id FROM records WHERE route=? AND id<>?').get(record.route,record.id):null;
    if(duplicate)throw new InputError('This website route is already used by another record.',409);
    const data=JSON.stringify(clean);
    this.db.prepare(`INSERT INTO records VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET route=excluded.route,status=excluded.status,version=excluded.version,updated_at=excluded.updated_at,data=excluded.data`).run(record.id,record.collection,record.route||null,record.status,version,now,data);
    this.db.prepare('INSERT INTO revisions(record_id,version,actor,created_at,data) VALUES(?,?,?,?,?)').run(record.id,version,actor,now,data);
    return this.get(record.id);
  }
  deleteRecord(id,actor){
    this.db.exec('BEGIN IMMEDIATE');
    try{
      const current=this.get(id);if(!current)throw new InputError('Record not found.',404);
      this.db.prepare('INSERT INTO revisions(record_id,version,actor,created_at,data) VALUES(?,?,?,?,?)').run(id,current.version+1,actor,new Date().toISOString(),JSON.stringify({...current,_deleted:true}));
      this.db.prepare('DELETE FROM records WHERE id=?').run(id);
      this.db.exec('COMMIT');
    }catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  save(record,expectedVersion,actor){
    this.db.exec('BEGIN IMMEDIATE');
    try{const result=this._save(record,expectedVersion,actor);this.db.exec('COMMIT');return result;}
    catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  import(records,actor){
    this.db.exec('BEGIN IMMEDIATE');try{for(const r of records)this._save(r,this.get(r.id)?.version??0,actor,records);this.db.exec('COMMIT');}catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  addMedia(file){this.db.prepare('INSERT INTO media VALUES(?,?)').run(file.url,JSON.stringify(file));}
  mediaList(){return this.db.prepare('SELECT data FROM media ORDER BY rowid DESC').all().map(r=>({...JSON.parse(r.data),usage:this.mediaUsage(JSON.parse(r.data).url)}));}
  mediaUsage(url){
    const file=this.db.prepare('SELECT data FROM media WHERE url=?').get(url);const targets=[url,...(file?JSON.parse(file.data).variants||[]:[]).map(v=>v.url)];
    const used=[];for(const r of this.db.prepare('SELECT id,data FROM records').all())if(targets.some(target=>r.data.includes(target)))used.push({id:r.id,type:'current'});
    for(const r of this.db.prepare('SELECT record_id AS id,version,data FROM revisions').all())if(targets.some(target=>r.data.includes(target)))used.push({id:r.id,type:'revision',version:r.version});return used;
  }
  deleteMedia(url){this.db.prepare('DELETE FROM media WHERE url=?').run(url);}
  revisions(id){return this.db.prepare('SELECT version,actor,created_at AS createdAt,data FROM revisions WHERE record_id=? ORDER BY version DESC').all(id).map(r=>({...r,data:JSON.parse(r.data)}));}
  user(email){return this.db.prepare('SELECT email,password FROM users WHERE email=?').get(String(email).toLowerCase())??null;}
  hasUsers(){return this.db.prepare('SELECT count(*) AS count FROM users').get().count>0;}
  addUser(email,password){
    email=String(email).trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new InputError('Valid email required.');
    this.db.prepare('INSERT INTO users VALUES(?,?) ON CONFLICT(email) DO UPDATE SET password=excluded.password').run(email,password);
    this.db.prepare('DELETE FROM sessions WHERE email=?').run(email);
  }
  createSession(email){
    const session={token:token(),csrf:token(),email,expires:Date.now()+8*60*60*1000};
    this.db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
    this.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(session.token),email,session.csrf,session.expires);return session;
  }
  session(raw,now=Date.now()){
    if(typeof raw!=='string'||!/^[a-f0-9]{64}$/.test(raw))return null;
    return this.db.prepare('SELECT email,csrf,expires FROM sessions WHERE hash=? AND expires>?').get(digest(raw),now)??null;
  }
  revokeSession(raw){if(typeof raw==='string')this.db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(raw));}
  attempt(key,now=Date.now()){
    this.db.prepare('DELETE FROM attempts WHERE started<?').run(now-15*60*1000);
    this.db.prepare('INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now);
    return this.db.prepare('SELECT count FROM attempts WHERE key=?').get(key).count<=10;
  }
  clearAttempts(key){this.db.prepare('DELETE FROM attempts WHERE key=?').run(key);}
  backup(path){this.db.prepare('VACUUM INTO ?').run(path);}
}
