import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import sharp from 'sharp';import {Store} from '../src/store.mjs';import {saveImage,uploadedImage,removeImage} from '../src/uploads.mjs';
test('decoded upload has dimensions and responsive variants; saved revisions protect media deletion',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bioinfo-media-'));const store=new Store(':memory:');try{
 const bytes=await sharp({create:{width:800,height:400,channels:3,background:'#abcdef'}}).png().toBuffer();
 const file=await saveImage(new Request('http://localhost/upload',{method:'POST',body:bytes}),dir);assert.equal(file.width,800);assert.equal(file.height,400);assert.ok(file.variants.length);assert.equal((await uploadedImage(file.variants[0].url,dir)).type,'image/webp');
 store.addMedia(file);const r={id:'news:media',collection:'news',title:'Test',status:'draft',image:file.url};store.save(r,0,'test');store.save({...r,image:''},1,'test');assert.ok(store.mediaUsage(file.url).length);await assert.rejects(()=>removeImage(file.url,dir,store),/used|revision/i);
 const spare=await saveImage(new Request('http://localhost/upload',{method:'POST',body:bytes}),dir);store.addMedia(spare);await removeImage(spare.url,dir,store);assert.equal(await uploadedImage(spare.url,dir),null);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('signature-shaped malformed files are rejected by decoder',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bioinfo-media-'));try{await assert.rejects(()=>saveImage(new Request('http://localhost',{method:'POST',body:Buffer.from('GIF89a'+ 'x'.repeat(50)+';')}),dir),/image|decode|valid/i);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('referenced responsive variant prevents deletion of its original',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bioinfo-media-')),store=new Store(':memory:');try{
 const bytes=await sharp({create:{width:800,height:400,channels:3,background:'#123456'}}).png().toBuffer();const file=await saveImage(new Request('http://localhost',{method:'POST',body:bytes}),dir);store.addMedia(file);store.save({id:'news:variant',collection:'news',title:'Variant use',status:'published',image:file.variants[0].url},0,'test');assert.ok(store.mediaUsage(file.url).length);await assert.rejects(()=>removeImage(file.url,dir,store),/used|revision/i);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('rotated uploads report decoded display dimensions and correct variant widths',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bioinfo-media-'));try{
 const bytes=await sharp({create:{width:800,height:400,channels:3,background:'#123456'}}).jpeg().withMetadata({orientation:6}).toBuffer();const file=await saveImage(new Request('http://localhost',{method:'POST',body:bytes}),dir);assert.equal(file.width,400);assert.equal(file.height,800);for(const v of file.variants){const image=await uploadedImage(v.url,dir);assert.equal((await sharp(image.bytes).metadata()).width,v.width);}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
