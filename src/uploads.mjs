/**
 * Media boundary: bounded reads, limited image types, generated filenames, and an explicit upload-path allowlist. Original media URLs remain supported.
 * See docs/architecture.md for the full data flow and extension guide.
 */
import sharp from 'sharp';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { InputError } from './content.mjs';
export const MAX_UPLOAD=10*1024*1024;
export async function readLimited(request,max=1024*1024){
 const declared=request.headers.get('content-length');if(declared&&Number(declared)>max)throw new InputError('Request is too large.',413);
 if(!request.body)return Buffer.alloc(0);
 const reader=request.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new InputError('Request is too large.',413);}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return Buffer.concat(chunks);
}
export function detectImage(bytes){
 if(bytes.length<24)return null;
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.subarray(12,16).toString()==='IHDR'&&bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0&&bytes.readUInt32BE(16)<=20000&&bytes.readUInt32BE(20)<=20000&&bytes.includes(Buffer.from('IEND')))return {ext:'png',mime:'image/png'};
 if(['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString())&&bytes.readUInt16LE(6)>0&&bytes.readUInt16LE(8)>0&&bytes.at(-1)===59)return {ext:'gif',mime:'image/gif'};
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255&&bytes.at(-2)===255&&bytes.at(-1)===217)return {ext:'jpg',mime:'image/jpeg'};
 if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'&&bytes.readUInt32LE(4)+8===bytes.length)return {ext:'webp',mime:'image/webp'};
 return null;
}
export async function saveImage(request,dataDir){
 const bytes=await readLimited(request,MAX_UPLOAD),format=detectImage(bytes);
 if(!format)throw new InputError('Upload a valid PNG, JPEG, GIF, or WebP image.');
 let metadata,normalized;
 try{metadata=await sharp(bytes,{limitInputPixels:40000000}).metadata();if(!metadata.width||!metadata.height||metadata.width*metadata.height>40000000)throw new Error('dimensions');normalized=await sharp(bytes,{limitInputPixels:40000000}).rotate().toBuffer();metadata=await sharp(normalized).metadata();}
 catch{throw new InputError('This image could not be decoded or exceeds 40 million pixels.');}
 const filename=randomUUID()+'.'+format.ext,folder=join(dataDir,'uploads');
 await mkdir(folder,{recursive:true});await writeFile(join(folder,filename),bytes,{flag:'wx',mode:0o640});
 const variants=[];
 for(const width of [320,640,1200])if(width<=metadata.width){const name=filename.replace(/\.[a-z]+$/,'-'+width+'.webp');await sharp(normalized).resize({width,withoutEnlargement:true}).webp({quality:84}).toFile(join(folder,name));variants.push({url:'/uploads/'+name,width});}
 return {url:'/uploads/'+filename,bytes:bytes.length,type:format.mime,width:metadata.width,height:metadata.height,variants};
}
export async function removeImage(url,dataDir,store){
 if(!/^\/uploads\/[a-f0-9-]{36}\.(png|jpg|gif|webp)$/.test(url))throw new InputError('Only uploaded original images can be deleted.');
 const file=store.mediaList().find(r=>r.url===url);if(!file)throw new InputError('Image not found.',404);
 if(store.mediaUsage(url).length)throw new InputError('This image is used by content or a retained revision. Remove detaches the image; the original is preserved.',409);
 for(const path of [url,...(file.variants||[]).map(v=>v.url)])try{await unlink(join(dataDir,'uploads',path.split('/').at(-1)));}catch(e){if(e.code!=='ENOENT')throw e;}
 store.deleteMedia(url);
}
export async function uploadedImage(path,dataDir){
 if(!/^\/uploads\/[a-f0-9-]{36}(?:-(?:320|640|1200))?\.(png|jpg|gif|webp)$/.test(path))return null;
 try{const bytes=await readFile(join(dataDir,'uploads',path.slice('/uploads/'.length)));const format=detectImage(bytes);return format?{bytes,type:format.mime}:null;}catch(e){if(e.code==='ENOENT')return null;throw e;}
}
