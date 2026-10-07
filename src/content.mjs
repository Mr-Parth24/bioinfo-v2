/**
 * Shared content schema. The browser editor consumes these field definitions; every persistence path must pass validateRecord.
 * See docs/architecture.md for the full data flow and extension guide.
 */
import { safeUrl } from './security.mjs';
export const COLLECTIONS=['news','events','publications','people','research','tools','pages','opportunities','settings'];
export const FIELDS={
  imageOriginal:{label:'Original image source',type:'url',max:4000},
  imageWidth:{label:'Image width',type:'number',min:0,maxValue:20000},
  imageHeight:{label:'Image height',type:'number',min:0,maxValue:20000},
  imageVariants:{label:'Responsive image sources',type:'variants'},
  publishDate:{label:'Publication date (sorting)',type:'date',max:10},
  startDate:{label:'Event start date',type:'date',max:10},
  endDate:{label:'Event end date',type:'date',max:10},
  deadline:{label:'Application deadline',type:'date',max:10},
  openingStatus:{label:'Opening status',type:'select',options:['open','closed']},
  homeVisibility:{label:'Homepage eligibility',type:'select',options:['include','exclude']},
  feedMode:{label:'Latest updates',type:'select',options:['automatic','selected','hidden']},
  feedCount:{label:'Number of updates',type:'number',min:1,maxValue:6},
  featuredIds:{label:'Selected updates (move into display order)',type:'relations',collection:['news','events','publications'],ordered:true},
  eventMode:{label:'Homepage event panel',type:'select',options:['automatic','selected','hidden']},
  eventIds:{label:'Selected event',type:'relations',collection:'events',ordered:true},
  opportunityMode:{label:'Homepage opportunity panel',type:'select',options:['automatic','selected','hidden']},
  opportunityIds:{label:'Selected opportunity',type:'relations',collection:'opportunities',ordered:true},
  showEvents:{label:'Show upcoming event',type:'select',options:['yes','no']},
  showOpportunities:{label:'Show current opportunity',type:'select',options:['yes','no']},
  announcement:{label:'Announcement',type:'text',max:600},
  announcementLink:{label:'Announcement destination',type:'url',max:4000},
  primaryLabel:{label:'Primary button label',type:'text',max:100},
  primaryLink:{label:'Primary button destination',type:'url',max:4000},
  secondaryLabel:{label:'Secondary button label',type:'text',max:100},
  secondaryLink:{label:'Secondary button destination',type:'url',max:4000},
  phone:{label:'Phone',type:'text',max:100},
  address:{label:'Postal address',type:'textarea',max:1000},
  footerText:{label:'Footer introduction',type:'textarea',max:2000},
  resourceLinks:{label:'Resource links',type:'links'},
  affiliationLinks:{label:'Affiliations',type:'links'},
  education:{label:'Education',type:'rows'},
  appointments:{label:'Professional appointments',type:'rows'},
  awards:{label:'Awards and prizes',type:'rows'},
  imageFit:{label:'Image display',type:'select',options:['cover','contain']},
  focalX:{label:'Image focal point: horizontal',type:'range',min:0,maxValue:100},
  focalY:{label:'Image focal point: vertical',type:'range',min:0,maxValue:100},
  imageCaption:{label:'Image caption',type:'text',max:1000},
  researchIds:{label:'Related research',type:'relations',collection:'research'},
  peopleIds:{label:'Related people',type:'relations',collection:'people'},

  title:{label:'Title / name',type:'text',required:true,max:600},
  summary:{label:'Short description',type:'textarea',max:12000},
  body:{label:'Full content',type:'richtext',max:250000},
  date:{label:'Display date',type:'text',max:160},
  year:{label:'Year',type:'text',max:20,suggestions:Array.from({length:20},(_,i)=>String(2030-i))},
  category:{label:'Category',type:'text',max:200,suggestions:{news:['Research','Grant','Award','Tool Release','Team','Publication','General'],events:['Workshop','Conference','Symposium','Seminar','Social','Poster Session','Other'],people:['Undergraduate Student', 'Graduate Student', 'PhD Candidate', 'Postdoctoral Fellow', 'Staff', 'Faculty / PI', 'Visiting Scholar'],tools:['Host-Pathogen Interactions','Subcellular / Protein Localization','Protein Function Prediction','Next-Gen Sequencing','Database','Genome / Transcriptome','Metagenomics','Precision Ag / Crop','Other'],opportunities:['Graduate Student (Ph.D. / M.S.)','Postdoctoral Fellow','Undergraduate Researcher','Staff Scientist / Developer','Visiting Scholar','Student Intern','Other']}},
  image:{label:'Image URL',type:'url',max:3000},
  imageAlt:{label:'Image description (accessibility)',type:'text',max:600},
  link:{label:'External or related link',type:'url',max:4000},
  route:{label:'Website path',type:'text',max:300},
  authors:{label:'Authors (formatting supported)',type:'richtext',max:20000},
  presentationType:{label:'Presentation type',type:'text',max:200},
  location:{label:'Location',type:'text',max:2000},
  email:{label:'Email',type:'email',max:254},
  memberStatus:{label:'Lab membership (Current or Past/Alumni)',type:'select',options:['current','alumni']},
  role:{label:'Role / position',type:'text',max:300},
  department:{label:'Department / Academic program',type:'text',max:300,suggestions:['Department of Plants, Soils & Climate','Department of Computer Science','Department of Biology','Department of Animal, Dairy & Veterinary Sciences','Center for Integrated BioSystems','Bioinformatics Facility']},
  startYear:{label:'Joined (year)',type:'text',max:4},
  endYear:{label:'Finished (year)',type:'text',max:4},
  researchInterests:{label:'Research interests',type:'textarea',max:12000},
  dissertationTitle:{label:'Dissertation / thesis title',type:'text',max:1000},
  dissertationUrl:{label:'Dissertation / thesis URL',type:'url',max:4000},
  workLinks:{label:'Other work and portfolio links',type:'links'},
  publicationIds:{label:'Related publications',type:'relations',collection:'publications'},
  toolIds:{label:'Related tools',type:'relations',collection:'tools'},
  social:{label:'Social links',type:'links'},
  gallery:{label:'Gallery image URLs',type:'images'},
  status:{label:'Publication status',type:'select',options:['draft','published']}
};
export const COLLECTION_FIELDS={
 news:['title','summary','body','date','category','image','imageAlt','link','route','status'],
 events:['title','summary','body','date','location','image','imageAlt','gallery','link','route','status'],
 publications:['title','authors','body','year','date','category','location','presentationType','link','status'],
 people:['title','summary','memberStatus','category','role','department','startYear','endYear','researchInterests','dissertationTitle','dissertationUrl','workLinks','publicationIds','toolIds','body','email','phone','image','imageAlt','social','education','appointments','awards','route','status'],
 research:['title','summary','body','image','imageAlt','route','status'],
 tools:['title','summary','category','image','imageAlt','link','status'],
 pages:['title','summary','body','image','imageAlt','route','status']
};
COLLECTION_FIELDS.opportunities=['title','summary','body','category','location','deadline','openingStatus','email','link','route','status'];
COLLECTION_FIELDS.settings=['title'];
export const SETTINGS_FIELDS={
 'settings:home':['title','summary','image','imageAlt','imageCaption','imageFit','focalX','focalY','primaryLabel','primaryLink','secondaryLabel','secondaryLink','announcement','announcementLink','feedMode','feedCount','featuredIds','eventMode','eventIds','opportunityMode','opportunityIds','status'],
 'settings:site':['title','footerText','address','email','phone','social','resourceLinks','affiliationLinks','status'],
 'settings:director':['title','summary','body','image','imageAlt','imageFit','focalX','focalY','email','phone','social','education','appointments','awards','publicationIds','status']
};
for(const collection of ['news','events','publications'])COLLECTION_FIELDS[collection].splice(1,0,'publishDate','homeVisibility');
COLLECTION_FIELDS.events.splice(1,0,'startDate','endDate');
for(const collection of ['news','events','people','research','tools','pages'])COLLECTION_FIELDS[collection].splice(COLLECTION_FIELDS[collection].indexOf('imageAlt')+1,0,'imageCaption','imageFit','focalX','focalY');
for(const collection of ['news','events','research','tools'])COLLECTION_FIELDS[collection].push('researchIds','peopleIds','publicationIds','toolIds');
COLLECTION_FIELDS.tools.push('resourceLinks');
export class InputError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export function validateRecord(record) {
  if(!record||typeof record!=='object'||Array.isArray(record))throw new InputError('A content record is required.');
  if(!COLLECTIONS.includes(record.collection))throw new InputError('Unknown collection.');
  if(!new RegExp(`^${record.collection}:[A-Za-z0-9_-]{1,160}$`).test(record.id||''))throw new InputError('Invalid record ID.');
  if(typeof record.title!=='string'||!record.title.trim())throw new InputError('A title is required.');
  if(!['draft','published'].includes(record.status))throw new InputError('Invalid publication status.');
  for(const [key,field]of Object.entries(FIELDS)) {
    const value=record[key];if(value===undefined)continue;
    if(['number','range'].includes(field.type)&&(!Number.isFinite(value)||(field.type==='number'&&!Number.isInteger(value))||value<field.min||value>field.maxValue))throw new InputError(`Invalid ${key} value.`);
    if(field.type==='date'&&value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))throw new InputError(`Invalid ${key} date.`);
    if(field.type==='select'&&!field.options.includes(value))throw new InputError(`Invalid ${key} selection.`);
    if(field.max&&(typeof value!=='string'||value.length>field.max))throw new InputError(`${key} must be text with at most ${field.max} characters.`);
  }
  for(const key of ['image','imageOriginal','link','announcementLink','primaryLink','secondaryLink'])if(record[key]&&!safeUrl(record[key],{image:key==='image'}))throw new InputError(`Invalid ${key} URL.`);
  if(record.collection==='tools'&&(!/^https?:\/\//.test(record.link||'')||!safeUrl(record.link)))throw new InputError('Tools require an absolute HTTP or HTTPS destination.');
  if(record.route && (!/^\/[a-zA-Z0-9][a-zA-Z0-9/_-]*$/.test(record.route)||record.route.includes('//')||/^\/(admin|api|assets|uploads|healthz)(\/|$)/.test(record.route)))throw new InputError('Invalid or reserved website route.');
  const reservedRoutes=['/home','/opportunities','/tools','/news','/events','/people','/people/our-team','/people/alumni','/research/research-areas','/publications','/publications/conferences','/publications/editorials'];
  if(record.route&&(record.route.endsWith('/')||reservedRoutes.includes(record.route)||(record.route==='/research'&&record.id!=='pages:research')||(record.route==='/contact'&&record.id!=='pages:contact')))throw new InputError('This route belongs to a listing or is not canonical.');
  if(record.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email))throw new InputError('Invalid email address.');
  if(record.collection==='settings'&&!Object.hasOwn(SETTINGS_FIELDS,record.id))throw new InputError('Unknown settings record.');
  for(const key of ['education','appointments','awards'])if(record[key]!==undefined&&(!Array.isArray(record[key])||record[key].length>100||record[key].some(r=>!r||typeof r.title!=='string'||!r.title.trim()||r.title.length>1000||typeof r.date!=='string'||r.date.length>100||typeof r.description!=='string'||r.description.length>12000||(r.link&&!safeUrl(r.link)))))throw new InputError('Timeline rows need a title, date, description and valid link URL.');
  for(const key of ['resourceLinks','affiliationLinks'])if(record[key]!==undefined&&(!Array.isArray(record[key])||record[key].length>40||record[key].some(x=>!x||typeof x.type!=='string'||!safeUrl(x.link))))throw new InputError('Links require a label and valid URL.');
  for(const key of ['featuredIds','eventIds','opportunityIds','researchIds','peopleIds'])if(record[key]!==undefined&&(!Array.isArray(record[key])||record[key].length>100||record[key].some(id=>typeof id!=='string')||new Set(record[key]).size!==record[key].length))throw new InputError('Invalid related-record references.');
  if(record.startDate&&record.endDate&&record.startDate>record.endDate)throw new InputError('Event end date must follow its start date.');
  if(record.social!==undefined&&(!Array.isArray(record.social)||record.social.length>30||record.social.some(x=>!x||typeof x.type!=='string'||!safeUrl(x.link))))throw new InputError('Social links require a label and valid URL.');
  if(record.imageVariants!==undefined&&(!Array.isArray(record.imageVariants)||record.imageVariants.length>5||record.imageVariants.some(v=>!v||!safeUrl(v.url,{image:true})||!Number.isInteger(v.width)||v.width<1||v.width>20000)))throw new InputError('Invalid image variants.');
  if(record.memberStatus!==undefined&&!['current','alumni'].includes(record.memberStatus))throw new InputError('Invalid member status.');
  for(const key of ['startYear','endYear'])if(record[key]&&!/^[12][0-9]{3}$/.test(record[key]))throw new InputError('Enter a four-digit year.');
  if(record.year&&!/^[12][0-9]{3}(?:\s*[-–—]\s*[12][0-9]{3})?(?:\s*\([A-Za-z0-9\s]+\))?$/.test(record.year.trim()))throw new InputError('Enter a valid year (e.g. 2024 or 2020–2024).');
  if(record.startYear&&record.endYear&&record.startYear>record.endYear)throw new InputError('End year must not precede start year.');
  if(record.dissertationUrl&&(!/^https?:\/\//.test(record.dissertationUrl)||!safeUrl(record.dissertationUrl)))throw new InputError('Dissertation URL must use HTTP or HTTPS.');
  if(record.workLinks!==undefined&&(!Array.isArray(record.workLinks)||record.workLinks.length>30||record.workLinks.some(x=>!x||typeof x.type!=='string'||!x.type.trim()||x.type.length>300||!safeUrl(x.link))))throw new InputError('Work links require a label and valid URL.');
  for(const key of ['publicationIds','toolIds'])if(record[key]!==undefined&&(!Array.isArray(record[key])||record[key].length>500||record[key].some(id=>typeof id!=='string')||new Set(record[key]).size!==record[key].length))throw new InputError('Invalid related-record references.');
  if(record.gallery!==undefined&&(!Array.isArray(record.gallery)||record.gallery.length>200||record.gallery.some(x=>!safeUrl(x,{image:true}))))throw new InputError('Gallery must contain valid image URLs.');
  if(Buffer.byteLength(JSON.stringify(record))>600000)throw new InputError('Record is too large.');
  return record;
}
