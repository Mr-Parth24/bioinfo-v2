/**
 * Security primitives and a deliberately small semantic HTML allowlist. Source markup is reconstructed, never passed through as arbitrary tags.
 * See docs/architecture.md for the full data flow and extension guide.
 */
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const token = () => randomBytes(32).toString('hex');
export const digest = value => createHash('sha256').update(value).digest('hex');
export function equalSecret(a,b) {
  if(typeof a!=='string'||typeof b!=='string')return false;
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length===y.length && timingSafeEqual(x,y);
}
export function hashPassword(password) {
  if(typeof password!=='string'||password.length<14||password.length>256)throw new Error('Use a password of 14–256 characters.');
  const salt=randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`;
}
export function verifyPassword(password,encoded) {
  if(typeof password!=='string'||password.length>256)return false;
  const [type,salt,hash]=String(encoded).split(':');
  if(type!=='scrypt'||!salt||!hash)return false;
  return equalSecret(scryptSync(password,salt,64).toString('hex'),hash);
}
export function safeUrl(input,{image=false,relative=false}={}) {
  const value=String(input??'').trim();
  if(!value||/[\x00-\x20\x7f<>"'\\]/.test(value.replaceAll(' ', '%20')))return '';
  if(value.startsWith('//'))return '';
  if(value.startsWith('/')||value.startsWith('#'))return value;
  if(relative && /^[a-zA-Z0-9._~-]/.test(value) && !value.includes(':'))return value;
  try {
    const url=new URL(value);
    if(url.username||url.password)return '';
    if(['https:','http:'].includes(url.protocol))return value;
    if(!image && ['mailto:','tel:'].includes(url.protocol))return value;
  } catch {}
  return '';
}

const allowed = new Set('p br strong b em i u s sup sub a ul ol li h2 h3 h4 h5 h6 blockquote hr img figure figcaption table thead tbody tr th td div section article span details summary dl dt dd'.split(' '));
const voids = new Set(['br','hr','img']);
// IDs the site chrome and the studio rely on. Content may not reuse them (prevents DOM clobbering).
const reservedId = /^(main|site-nav|nav-panel-.*|program|record-.*|field-.*|editor-.*|entries|collections|collection-.*|logout|login-.*|studio-.*|revisions|preview-record|new-record|back-list|save-.*|delete-.*|duplicate-record|cancel-delete|confirm-delete|open-media-library|export-content|category-filter-select|sort-select|record-search)$/i;
function decodeEntities(value) {
  return value.replace(/&#(x[\da-f]+|\d+);?/gi,(_,s)=>{
    const n=s[0].toLowerCase()==='x'?parseInt(s.slice(1),16):parseInt(s,10);
    return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';
  }).replace(/&(amp|quot|apos|lt|gt|colon|nbsp|Tab|NewLine);/g,(_,x)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',colon:':',nbsp:'\u00a0',Tab:'\t',NewLine:'\n'}[x]));
}
// Never pass through source tag strings. Reconstruct a small semantic allowlist.
export function sanitizeHtml(input) {
  let source=String(input??'').replace(/<!--[^]*?-->/g,'').replace(/<(script|style|svg|math|iframe|object|template)\b[^>]*>[^]*?<\/\1\s*>/gi,'');
  let out='',pos=0;
  const open=[]; // non-void tags still open, so the output is always well nested
  const pattern=/<\/?[a-zA-Z][^>]*>/g;
  for(const match of source.matchAll(pattern)) {
    out+=escapeHtml(decodeEntities(source.slice(pos,match.index)));pos=match.index+match[0].length;
    const tagmatch=match[0].match(/^<(\/?)([\w-]+)/);const tag=tagmatch[2].toLowerCase();
    if(!allowed.has(tag))continue;
    if(tagmatch[1]) {
      if(voids.has(tag)||!open.includes(tag))continue;
      while(open.length){const top=open.pop();out+=`</${top}>`;if(top===tag)break;}
      continue;
    }
    const attrs={};
    for(const a of match[0].slice(tagmatch[0].length).matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[a[1].toLowerCase()]=decodeEntities(a[2]??a[3]??a[4]??'');
    let rendered='';
    if(tag==='a') {
      const href=safeUrl(attrs.href,{relative:true});if(href)rendered+=` href="${escapeHtml(href)}"`;
      if(attrs['aria-label'])rendered+=` aria-label="${escapeHtml(attrs['aria-label'])}"`;
      if(attrs.target==='_blank')rendered+=' target="_blank" rel="noopener noreferrer"';
    }
    if(tag==='img') {
      const src=safeUrl(attrs.src,{image:true});if(!src)continue;
      rendered+=` src="${escapeHtml(src)}" alt="${escapeHtml(attrs.alt||'')}" loading="lazy" decoding="async"`;
    }
    if(attrs.id&&/^[A-Za-z][\w-]{0,60}$/.test(attrs.id)&&!reservedId.test(attrs.id))rendered+=` id="${escapeHtml(attrs.id)}"`;
    if(['th','td'].includes(tag))for(const key of ['colspan','rowspan'])if(/^\d{1,2}$/.test(attrs[key]||''))rendered+=` ${key}="${attrs[key]}"`;
    out+=`<${tag}${rendered}>`;
    if(!voids.has(tag))open.push(tag);
  }
  out+=escapeHtml(decodeEntities(source.slice(pos)));
  while(open.length)out+=`</${open.pop()}>`;
  return out;
}
export const plainText=value=>decodeEntities(String(value??'').replace(/<[^>]*>/g,'')).replace(/\s+/g,' ').trim();
