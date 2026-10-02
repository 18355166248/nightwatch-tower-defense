import { UiTypographyView } from './UiTypographyView.js';
import { UI_REVIEW_STATES } from './UiReviewStates.js';
const stage = document.querySelector('.stage');
let typography;
let reviewState = 'max';
UiTypographyView.create(stage).then((view) => { typography = view; view.setSpeed(document.querySelector('.speed strong').textContent); applyState(reviewState); }).catch((error) => console.error(error));
function applyState(key) {
    reviewState = key;
    const state = UI_REVIEW_STATES[key];
    document.querySelector('.paused').hidden = true;
    document.querySelector('.pause').setAttribute('aria-pressed','false');
    typography?.setState(state);
    document.querySelector('.gold').textContent = state.gold;
    document.querySelector('.inspect-copy small').textContent = state.level;
    document.querySelector('.inspect-copy p').textContent = state.stats;
    for (const role of ['sell','upgrade','next']) {
        const button = document.querySelector(`.${role}`);
        button.textContent = state[role];
        button.disabled = state[`${role}Disabled`];
        button.classList.toggle('is-primary', role === 'upgrade' && !button.disabled);
    }
    selectGroup('state', key);
}
document.querySelectorAll('[data-state]').forEach((button) => button.addEventListener('click', () => {
    stage.dataset.view = 'implementation';
    stage.dataset.mode = 'inspect';
    selectGroup('view','implementation');
    applyState(button.dataset.state);
}));
// 原稿仍是满级代表态。按钮反馈只提示示意，不模拟真实升级/扣金币，避免混淆试玩与评审。
document.querySelectorAll('.sell,.upgrade,.next').forEach((button) => button.addEventListener('click', () => {
    const status = document.querySelector('.paused');
    status.hidden = false;
    status.textContent = `${button.textContent} · 设计示例`;
}));
const params = new URLSearchParams(location.search);
// 展示状态只在稿件页生效，不消费游戏金币/存档；设计和实现视图切换不能重建游戏。
if (params.get('export') === '1') document.body.classList.add('export-view');
if (params.get('view') === 'design') stage.dataset.view = 'design';
function selectGroup(key, value) {
    document.querySelectorAll(`[data-${key}]`).forEach((button) => {
        if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset[key] === value));
    });
}
document.querySelectorAll('button[data-view]').forEach((button) => button.addEventListener('click', () => {
    stage.dataset.view = button.dataset.view;
    // 原稿只定义一个固定选塔态；切换对照时恢复同态，避免把倍速/暂停差异误当还原误差。
    stage.dataset.mode = 'inspect';
    applyState('max');
    document.querySelector('.speed strong').textContent = '1×';
    typography?.setSpeed('1×');
    document.querySelector('.pause').setAttribute('aria-pressed', 'false');
    document.querySelector('.paused').hidden = true;
    document.querySelectorAll('[data-tower]').forEach((item) => item.setAttribute('aria-pressed', 'false'));
    selectGroup('view', button.dataset.view);
}));
document.querySelectorAll('[data-width]').forEach((button) => button.addEventListener('click', () => {
    document.documentElement.style.setProperty('--preview-width', `${button.dataset.width}px`);
    selectGroup('width', button.dataset.width);
}));
document.querySelectorAll('[data-tower]').forEach((button) => button.addEventListener('click', () => {
    selectGroup('tower', button.dataset.tower);
    if (button.dataset.tower === 'rivet') stage.dataset.mode = 'inspect';
}));
document.querySelector('.close').addEventListener('click', () => { stage.dataset.mode = 'battle'; });
document.querySelector('.speed').addEventListener('click', (event) => {
    const label = event.currentTarget.querySelector('strong');
    label.textContent = label.textContent === '1×' ? '2×' : '1×';
    typography?.setSpeed(label.textContent);
});
document.querySelector('.pause').addEventListener('click', (event) => {
    const paused = event.currentTarget.getAttribute('aria-pressed') !== 'true';
    event.currentTarget.setAttribute('aria-pressed', String(paused));
    document.querySelector('.paused').hidden = !paused;
    document.querySelector('.paused').textContent = '暂停预览';
});
// 实际尺寸保持可读，不再为了同时露出评审说明把390稿缩成255宽；短侧栏允许纵向滚动。
new ResizeObserver(() => {
    const rect = stage.getBoundingClientRect();
    document.querySelector('#readout').textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
}).observe(stage);
selectGroup('view', stage.dataset.view);
