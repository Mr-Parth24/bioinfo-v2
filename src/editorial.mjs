/** Editorial defaults and homepage selection. Additive initialization never rewrites existing content. */
import {readFileSync} from 'node:fs';
export const defaults=JSON.parse(readFileSync(new URL('../content/editorial.json',import.meta.url)));
export function ensureEditorial(store){
 for(const original of defaults)if(!store.get(original.id)){
  let record=original;
  if(record.id==='settings:director'){
   const legacy=store.get('pages:rakesh');
   if(legacy?.version>1){
    const fields=['status','title','summary','body','image','imageAlt','imageFit','focalX','focalY','caption','imageOriginal','imageVariants','imageWidth','imageHeight'];
    record={...original,...Object.fromEntries(fields.filter(key=>Object.hasOwn(legacy,key)).map(key=>[key,legacy[key]])),education:[],appointments:[],awards:[]};
   }
  }
  store.save(record,0,'editorial-initialization');
 }
}
export function displayDate(record){
 if(record.date)return record.date;
 const format=value=>new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
 if(record.startDate)return format(record.startDate)+(record.endDate&&record.endDate!==record.startDate?' – '+format(record.endDate):'');
 if(record.publishDate)return format(record.publishDate);
 return record.year||'';
}
export function setting(records,id){return records.find(r=>r.id===id)||defaults.find(r=>r.id===id);}
export function dateValue(record){
 if(record.publishDate||record.startDate)return Date.parse(record.publishDate||record.startDate)||0;
 let value=String(record.date||record.year||'');
 value=value.replace(/(\b[A-Za-z]+\s+\d{1,2})\s*[-–—]\s*(?:[A-Za-z]+\s+)?\d{1,2}/,'$1');
 if(!/\d{4}/.test(value)&&/^\d{4}$/.test(record.year||''))value+=', '+record.year;
 if(!/\d{4}/.test(value))return 0;
 return Date.parse(value)||Date.parse(record.year||'')||0;
}
export function selectUpdates(records,config){
 const eligible=records.filter(r=>r.status==='published'&&['news','events','publications'].includes(r.collection)&&r.homeVisibility!=='exclude');
 if(config.feedMode==='hidden')return [];
 const result=config.feedMode==='selected'?(config.featuredIds||[]).map(id=>eligible.find(r=>r.id===id)).filter(Boolean):[...eligible].sort((a,b)=>dateValue(b)-dateValue(a));
 return result.slice(0,config.feedCount||3);
}
export function activeOpportunities(records,now=new Date()){const today=now.toISOString().slice(0,10);return records.filter(r=>r.collection==='opportunities'&&r.status==='published'&&r.openingStatus!=='closed'&&(!r.deadline||r.deadline>=today));}

/* Editorial content added after the original migration (content/content-updates.json).
   A field is filled only while it is empty, and each database applies an update set once,
   so later edits — including deliberately emptied fields — are never overwritten. */
const contentUpdates = JSON.parse(readFileSync(new URL('../content/content-updates.json', import.meta.url)));
const UPDATE_KEY = 'content-updates:2026-10';
const isEmpty = value => value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
function fill(record, fields) {
  const next = { ...record };
  let changed = false;
  for (const [key, value] of Object.entries(fields)) if (isEmpty(next[key])) { next[key] = value; changed = true; }
  return changed ? next : null;
}
/* Replacements swap a value (e.g. an image) only while every field in `when` still holds the value
   being replaced, so a record an editor has already changed is left alone. */
function replace(record, update) {
  if (!update || !Object.entries(update.when).every(([key, value]) => record[key] === value)) return null;
  return { ...record, ...update.set };
}
const REPLACE_KEY = 'content-replacements:2026-10';
/** Pure version for exports built straight from content/seed.json. */
export function withContentUpdates(records) {
  return records.map(record => {
    const filled = (contentUpdates.records[record.id] && fill(record, contentUpdates.records[record.id])) || record;
    return replace(filled, contentUpdates.replacements?.records[record.id]) || filled;
  });
}
export function applyContentUpdates(store) {
  if (store.meta(UPDATE_KEY)) return applyReplacements(store);
  let count = 0;
  for (const [id, fields] of Object.entries(contentUpdates.records)) {
    const current = store.get(id);
    const next = current && fill(current, fields);
    if (next) { store.save(next, current.version, 'content-update'); count++; }
  }
  store.setMeta(UPDATE_KEY, new Date().toISOString());
  return count + applyReplacements(store);
}
function applyReplacements(store) {
  if (store.meta(REPLACE_KEY)) return 0;
  let count = 0;
  for (const [id, update] of Object.entries(contentUpdates.replacements?.records || {})) {
    const current = store.get(id);
    const next = current && replace(current, update);
    if (next) { store.save(next, current.version, 'content-update'); count++; }
  }
  store.setMeta(REPLACE_KEY, new Date().toISOString());
  return count;
}
