const sizes = document.querySelectorAll('[data-size]');
let requestedWidth = 390;
function resizeDrafts() {
    for (const viewport of document.querySelectorAll('.viewport')) {
        const width = Math.min(requestedWidth, viewport.parentElement.clientWidth);
        // 整张稿件包含字体一起等比缩放，不能只缩面板而保留过大的文字。
        viewport.style.width = width + 'px';
        viewport.style.height = width * 844 / 390 + 'px';
        viewport.querySelector('.stage').style.transform = `scale(${width / 390})`;
    }
}
for (const button of sizes) button.addEventListener('click', () => {
    requestedWidth = Number(button.dataset.size);
    for (const item of sizes) item.setAttribute('aria-pressed', String(item === button));
    resizeDrafts();
});
for (const button of document.querySelectorAll('[data-feedback]')) button.addEventListener('click', () => {
    // 设计稿只演示反馈；不调用真实游戏状态，防止评审操作破坏正在试玩的局。
    button.closest('section').querySelector('output').textContent = button.dataset.feedback;
});
new ResizeObserver(resizeDrafts).observe(document.querySelector('main'));
resizeDrafts();
