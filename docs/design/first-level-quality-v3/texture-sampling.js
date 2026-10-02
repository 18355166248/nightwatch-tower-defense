let manifest, width = 335, candidate = 'B';
const mib = bytes => (bytes/1024/1024).toFixed(2);
function render() {
    const root = document.getElementById('assets'); root.replaceChildren();
    document.getElementById('budget').textContent = `六张纹理理论 RGBA：原 ${mib(manifest.originalBytes)} MiB / A ${mib(manifest.candidateBytes.A)} MiB / B ${mib(manifest.candidateBytes.B)} MiB。不是游戏总预算或实际GPU测量。`;
    for (const asset of manifest.assets) {
        const heading=document.createElement('h2'); heading.textContent=asset.label; root.append(heading);
        const row=document.createElement('div'); row.className='row'; root.append(row);
        for (const item of [{name:'原图',file:asset.original,width:asset.width,height:asset.height,decodedBytes:asset.decodedBytes},...asset.candidates.filter(item=>item.name===candidate)]) {
            const figure=document.createElement('figure'), caption=document.createElement('figcaption');
            caption.textContent=`${item.name} · ${item.width}×${item.height} · ${mib(item.decodedBytes)} MiB`;
            const surface=document.createElement('div');surface.className='surface'+(asset.id==='panel'?' raw':'');
            surface.style.width=`${asset.displayWidth*width/1080}px`;surface.style.height=`${asset.displayHeight*width/1080}px`;
            const image=new Image(); image.src=`texture-review-generated/${item.file}`; image.alt=`${asset.label} ${item.name}`;
            image.onerror=()=>{document.getElementById('error').textContent='评审附件缺失：请按 TEXTURE-SAMPLING.md 重新生成。';};
            surface.append(image);figure.append(caption,surface);row.append(figure);
        }
    }
    document.querySelectorAll('[data-width]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.width)===width)));
    document.querySelectorAll('[data-candidate]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.candidate===candidate)));
}
document.querySelectorAll('[data-width]').forEach(button=>button.addEventListener('click',()=>{width=Number(button.dataset.width);if(manifest)render();}));
document.querySelectorAll('[data-candidate]').forEach(button=>button.addEventListener('click',()=>{candidate=button.dataset.candidate;if(manifest)render();}));
// 附件失败明确提示，不拿空板或旧版本充当已完成对照。
fetch('texture-review-generated/manifest.json').then(response=>{if(!response.ok)throw new Error('附件未生成');return response.json();})
    .then(value=>{manifest=value;render();}).catch(error=>{document.getElementById('error').textContent=error.message;});
