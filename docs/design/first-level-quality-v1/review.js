const stage = document.querySelector('.stage');
const readout = document.querySelector('#size-readout');
const toast = document.querySelector('.preview-toast');
let toastTimer;

// 同一稿件在参考分辨率导出；仅隐藏评审工具，不另画一套与小屏不同的界面。
const reviewParams = new URLSearchParams(location.search);
if (reviewParams.get('export') === '1') {
    document.body.classList.add('export-view');
    document.documentElement.style.setProperty('--preview-width', '1080px');
    stage.dataset.mode = reviewParams.get('mode') === 'battle' ? 'battle' : 'inspect';
}

function setMode(mode) {
    // 稿件展示状态与游戏状态隔离；这些控件不会读写战斗、金币或本地存档。
    stage.dataset.mode = mode;
    document.querySelectorAll('[data-mode]').forEach((button) => {
        if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    });
}

document.querySelectorAll('button[data-mode]').forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
});
document.querySelectorAll('[data-width]').forEach((button) => {
    button.addEventListener('click', () => {
        document.documentElement.style.setProperty('--preview-width', `${button.dataset.width}px`);
        document.querySelectorAll('[data-width]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    });
});
new ResizeObserver(() => {
    const rect = stage.getBoundingClientRect();
    readout.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
}).observe(stage);

document.querySelector('.close-inspector').addEventListener('click', () => setMode('battle'));
document.querySelectorAll('[data-tower]').forEach((button) => {
    button.addEventListener('click', () => {
        document.querySelectorAll('[data-tower]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    });
});
document.querySelector('.speed').addEventListener('click', (event) => {
    const strong = event.currentTarget.querySelector('strong');
    strong.textContent = strong.textContent === '1×' ? '2×' : '1×';
});
document.querySelector('.pause').addEventListener('click', (event) => {
    event.currentTarget.classList.toggle('is-pressed');
});
document.querySelectorAll('[data-preview-feedback]').forEach((button) => {
    button.addEventListener('click', () => {
        clearTimeout(toastTimer);
        toast.textContent = button.dataset.previewFeedback;
        toast.classList.add('is-visible');
        toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1600);
    });
});
