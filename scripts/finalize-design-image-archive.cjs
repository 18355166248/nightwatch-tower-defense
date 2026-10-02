const fs = require('node:fs');
const path = require('node:path');
const { root, images, digest } = require('./design-image-store.cjs');
const manifest = images();
const targets = Object.entries(manifest).filter(([key]) => !key.startsWith('embedded:'));
function safeFile(key) {
    if (!/^(art-source|docs)\/.+\.(png|jpe?g)$/i.test(key)) throw new Error('删除目标超出图片归档范围：' + key);
    const file = path.resolve(root, key);
    if (!file.startsWith(root + path.sep) || fs.realpathSync(file) !== file || !fs.lstatSync(file).isFile()) throw new Error('不允许删除链接或越界文件');
    return file;
}
// 先检查完整覆盖和全部本地哈希，再改引用和删除，避免半迁移覆盖未上传资源。
const files=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,item.name);if(item.isDirectory())walk(f);else if(item.isFile())files.push(f);}}
walk(path.join(root,'docs'));walk(path.join(root,'art-source'));
for(const file of files.filter(f=>/\.(png|jpe?g)$/i.test(f))) if(!manifest[path.relative(root,file)]) throw new Error('存在未归档图片：'+file);
let removedBytes=0;
for(const [key,record] of targets){if(!record.verifiedAt)throw new Error('未验证：'+key);if(fs.existsSync(path.join(root,key))){const file=safeFile(key);const bytes=fs.readFileSync(file);if(digest(bytes)!==record.originalSha256)throw new Error('归档后本地图片变更：'+key);removedBytes+=bytes.length;}}
for(const file of files.filter(f=>/\.(html|css|md|svg)$/.test(f)))for(const match of fs.readFileSync(file,'utf8').matchAll(/data:image\/(png|jpeg);base64,([A-Za-z0-9+/=\r\n]+)/g)){
    if(!manifest['embedded:'+digest(Buffer.from(match[2],'base64'))]?.verifiedAt)throw new Error('内嵌图片未归档：'+file);
}
function resolveReference(ref,file){
    if (/^(data:|https?:|#)/.test(ref)) return null;
    const clean=ref.split(/[?#]/)[0];
    const candidates=[clean.replace(/^\//,''),path.relative(root,path.resolve(path.dirname(file),clean))];
    for(const key of candidates)if(manifest[key])return manifest[key].previewUrl;
    return null;
}
let updated=0,embeddedBytes=0;
for(const file of files.filter(f=>/\.(html|css|md|svg)$/.test(f))){let source=fs.readFileSync(file,'utf8');const before=source;
    source=source.replace(/data:image\/(png|jpeg);base64,([A-Za-z0-9+/=\r\n]+)/g,(whole,type,data)=>{const record=manifest['embedded:'+digest(Buffer.from(data,'base64'))];if(!record?.verifiedAt)throw new Error('内嵌图片未归档');embeddedBytes+=whole.length;return record.previewUrl;});
    source=source.replace(/(["'])([^"'\n<>]+\.(?:png|jpe?g)(?:[?#][^"'\n<>]*)?)\1/gi,(whole,quote,ref)=>{const url=resolveReference(ref,file);return url?quote+url+quote:whole;});
    source=source.replace(/\]\(([^)]+\.(?:png|jpe?g))\)/gi,(whole,ref)=>{const url=resolveReference(ref.replace(/^<|>$/g,''),file);return url?']('+url+')':whole;});
    source=source.replace(/url\(([^"')]+\.(?:png|jpe?g))\)/gi,(whole,ref)=>{const url=resolveReference(ref,file);return url?'url('+url+')':whole;});
    // 三个候选按钮动态拼接的文件名，直接使用归档 URL，保留状态索引里的历史路径作为来源标识。
    if(file.endsWith('first-level-quality-v3/index.html')){source=source.replace(/'((?:pause-command-console|pause-watchtower-badge|pause-quiet-enamel)\.png)'/g,(whole,name)=>"'"+manifest['docs/design/first-level-quality-v3/concepts/'+name].previewUrl+"'").replace("image.src='concepts/'+conceptFiles[index]","image.src=conceptFiles[index]");}
    // 八向审阅页通过脚本拼接切图路径；迁移为明确URL表，删除切图后仍可完整审阅。
    const headSourceIds=['exec-f9a2a223-c099-4e16-80bb-054fe5103310','exec-c4c95f6c-2a01-4ede-9018-01545ea501c7','exec-d7404092-3966-45d6-b6f2-c9d5e39b36fb'];
    const headUrls=id=>Array.from({length:8},(_,index)=>{
        const key=`docs/design/first-level-quality-v3/output/${id}/resized/${id}_${String(index).padStart(2,'0')}.png`;
        const record=manifest[key];if(!record?.verifiedAt)throw new Error('八向切图尚未归档：'+key);return record.previewUrl;
    });
    if(file.endsWith('first-level-quality-v3/eight-direction-family.html')&&source.includes('const sources=')){
        source=source.replace(/const sources=\[[^\n]+\];/,'const imageUrls='+JSON.stringify(headSourceIds.map(headUrls))+';')
            .replace(/const imagePath=[^\n]+;/,'const imagePath=(level,index)=>imageUrls[level-1][index];');
    }
    if(file.endsWith('first-level-quality-v3/eight-direction-head.html')&&source.includes("image.src='output/exec-f9a2")){
        source=source.replace("['N','NE','E','SE','S','SW','W','NW'].forEach",'const productionHeadUrls='+JSON.stringify(headUrls(headSourceIds[0]))+";\n['N','NE','E','SE','S','SW','W','NW'].forEach")
            .replace(/image.src='output\/exec-f9a2[^\n]+;/,'image.src=productionHeadUrls[index];');
    }
    if(source!==before){fs.writeFileSync(file,source);updated++;}
}
let deletedImages=0;
for(const [key] of targets)if(fs.existsSync(path.join(root,key))){fs.unlinkSync(safeFile(key));deletedImages++;}
// 压缩工作副本也占本地空间，只删除本脚本的哈希命名文件且确认归档存在；未知文件不处理。
let temporaryBytes=0;
const work=path.join(root,'.cdn-upload-work/archive');
const byHash=new Map(Object.values(manifest).map(record=>[record.originalSha256,record]));
if(fs.existsSync(work))for(const name of fs.readdirSync(work)){
    const match=name.match(/^([a-f0-9]{64})\.(png|jpe?g)$/i);if(!match)continue;
    const record=byHash.get(match[1]);if(!record?.verifiedAt)continue;
    const file=path.join(work,name);if(fs.lstatSync(file).isSymbolicLink())throw new Error('临时图片不能是链接');
    const bytes=fs.readFileSync(file);const hash=digest(bytes);
    if(hash!==record.originalSha256&&hash!==record.previewSha256)throw new Error('临时图片与归档不符');
    temporaryBytes+=bytes.length;fs.unlinkSync(file);
}
console.log(JSON.stringify({deletedImages,archivedImageEntries:targets.length,removedBytes,updatedDocuments:updated,removedEmbeddedCharacters:embeddedBytes,removedTemporaryBytes:temporaryBytes},null,2));
