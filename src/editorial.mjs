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
