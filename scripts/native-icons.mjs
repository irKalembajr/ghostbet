// Rasterize the existing code-native GB monogram for native launchers.
import { createRequire } from 'node:module';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const sharp=require('../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp');
const root=process.cwd();const source=path.join(root,'public/favicon.svg');
const res=path.join(root,'android/app/src/main/res');
for(const [density,size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]){
 const folder=path.join(res,`mipmap-${density}`);
 for(const name of ['ic_launcher.png','ic_launcher_round.png'])await sharp(source,{density:600}).resize(size,size).flatten({background:'#10263f'}).png().toFile(path.join(folder,name));
 const fg=Math.round(size*2.25);const mark=Math.round(fg*0.58);const buffer=await sharp(source,{density:600}).resize(mark,mark).png().toBuffer();
 await sharp({create:{width:fg,height:fg,channels:4,background:'#10263f'}}).composite([{input:buffer,gravity:'center'}]).png().toFile(path.join(folder,'ic_launcher_foreground.png'));
}
// Keep generated splash resources, but replace the Capacitor starter branding.
for(const entry of await readdir(res,{withFileTypes:true}))if(entry.isDirectory()&&entry.name.startsWith('drawable')){
 for(const name of await readdir(path.join(res,entry.name)))if(name.endsWith('.png')&&name.includes('splash')){
  const target=path.join(res,entry.name,name);const dimensions=await sharp(target).metadata();
  await sharp({create:{width:dimensions.width,height:dimensions.height,channels:3,background:'#10263f'}}).png().toFile(target+'.new');
  const {rename}=await import('node:fs/promises');await rename(target+'.new',target);
 }
}
await sharp(source,{density:1600}).resize(1024,1024).flatten({background:'#10263f'}).png().toFile(path.join(root,'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'));
console.log('Native GB icons generated from public/favicon.svg.');
