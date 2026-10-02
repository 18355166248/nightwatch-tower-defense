for (const button of document.querySelectorAll('#waiting,#returned')) button.addEventListener('click', () => {
    const returned = button.id === 'returned';
    document.querySelector('#recovery-title').textContent = returned ? '已返回 · 战斗仍暂停' : '后台安全暂停';
    const resume = document.querySelector('#resume');
    resume.disabled = !returned;
    resume.querySelector('span').textContent = returned ? '继续战斗' : '等待返回页面';
    document.querySelector('.recovery-footer').textContent = returned ? '塔位与进度保留 · 点继续才恢复' : '返回页面后，手动继续战斗';
    document.querySelector('#waiting').setAttribute('aria-pressed', String(!returned));
    document.querySelector('#returned').setAttribute('aria-pressed', String(returned));
});
document.querySelector('#resume').addEventListener('click', event => {
    event.target.closest('section').querySelector('output').textContent = '稿件演示：手动继续原局，不自动开波';
});
