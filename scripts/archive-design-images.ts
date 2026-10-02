/** 仅归档非运行图片：先保存原字节，再压缩评审版本，校验成功前不删除本地文件。 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = process.cwd();
const skill = process.env.IMAGE_UPLOAD_SKILL;
if (!skill) throw new Error('请设置 IMAGE_UPLOAD_SKILL 为 xmly-upload-image 技能目录');
const { uploadImg } = await import(path.join(skill, 'scripts/upload.ts'));
const { compressImage } = await import(path.join(skill, 'scripts/compress.ts'));
const dotenv = await import(path.join(skill, 'node_modules/dotenv/lib/main.js'));
for (const file of [path.join(root,'.xmly-skills/.env'),path.join(process.env.HOME!,'.xmly-skills/.env')]) {
  if(fs.existsSync(file)){dotenv.config({path:file,quiet:true});break;}
}
const sha = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');
const manifestPath = path.join(root,'art-source/cdn-image-manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath,'utf8')) : {version:1,policy:'Non-runtime only; original bytes retained for reproducible exports. Test CDN retention is not guaranteed.', images:{}};
const work = path.join(root,'.cdn-upload-work/archive');
fs.mkdirSync(work,{recursive:true});
const files: string[]=[];
function walk(dir:string){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else if(item.isFile())files.push(p);}}
walk(path.join(root,'art-source'));walk(path.join(root,'docs'));
const tasks = new Map<string,{bytes:Buffer,file:string,keys:string[]}>();
function add(bytes:Buffer,file:string,key:string){const hash=sha(bytes);const entry=tasks.get(hash);if(entry)entry.keys.push(key);else tasks.set(hash,{bytes,file,keys:[key]});}
for(const file of files){if(/\.(png|jpe?g)$/i.test(file))add(fs.readFileSync(file),file,path.relative(root,file));}
// SVG 与动画预览 HTML 的内嵌位图同样计入 Git 体积，使用内容哈希与独立源图去重。
for(const file of files.filter(f=>/\.(svg|html|css|md)$/.test(f))){const source=fs.readFileSync(file,'utf8');for(const match of source.matchAll(/data:image\/(png|jpeg);base64,([A-Za-z0-9+/=\r\n]+)/g)){const bytes=Buffer.from(match[2],'base64');const hash=sha(bytes);const temp=path.join(work,hash+(match[1]==='png'?'.png':'.jpg'));fs.writeFileSync(temp,bytes);add(bytes,temp,'embedded:'+hash);}}
const known=new Map<string,any>(Object.values(manifest.images).map((e:any)=>[e.originalSha256,e]));
function save(){fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');}
async function verifiedUpload(file:string,bytes:Buffer){
  const result:any=await Promise.race([uploadImg({file,quiet:true}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('上传超时')),90000))]);
  const url=String(result?.data?.freeFileUrl||'').replace(/^http:/,'https:');
  if(new URL(url).hostname!=='audiopaytest.cos.tx.xmcdn.com'||new URL(url).protocol!=='https:')throw new Error('CDN 地址不是本次授权的目标');
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error('CDN 下载失败 '+response.status);
  const remote=Buffer.from(await response.arrayBuffer());
  if(sha(remote)!==sha(bytes))throw new Error('CDN 字节校验失败');
  return url;
}
let done=0;let compressionUnavailable=false;
const queue=[...tasks.entries()];
async function worker(){while(queue.length){const [hash,task]=queue.shift()!;let record=known.get(hash);
  if(!record){
    const originalUrl=await verifiedUpload(task.file,task.bytes);
    record={originalSha256:hash,originalBytes:task.bytes.length,originalUrl,previewUrl:originalUrl,previewSha256:hash,previewBytes:task.bytes.length,verifiedAt:new Date().toISOString()};
    // 大图压缩预览，小图保留原字节；原图另存 CDN，避免破坏切图坐标及来源校验。
    if(task.bytes.length>=65536&&!compressionUnavailable){const temp=path.join(work,hash+path.extname(task.file));fs.writeFileSync(temp,task.bytes);
      // 压缩服务不是来源归档的必需依赖；超时保留已核对的原字节，避免无限等待与误删。
      try{await Promise.race([compressImage(temp),new Promise((_,reject)=>setTimeout(()=>reject(new Error('预览压缩超时，保留原图归档')),30000))]);const preview=fs.readFileSync(temp);if(preview.length<task.bytes.length){record.previewUrl=await verifiedUpload(temp,preview);record.previewSha256=sha(preview);record.previewBytes=preview.length;}}
      catch(error){compressionUnavailable=true;console.warn('压缩服务不可用，后续保留原图 CDN；未删除原图。',String((error as Error).message).slice(0,160));}
    }
    known.set(hash,record);
  }
  for(const key of task.keys)manifest.images[key]=record;
  save();done++;if(done%20===0||done===tasks.size)console.log(`已归档并校验 ${done}/${tasks.size}`);
}}
await Promise.all(Array.from({length:4},()=>worker()));
save();console.log('归档清单已保存，尚未删除本地图片。');
process.exit(0);
