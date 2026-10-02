const NS = 'http://www.w3.org/2000/svg';

/** 原生文字表现层：只持有基线/字号契约，点击状态仍由页面控件管理。 */
export class UiTypographyView {
    static async create(stage) {
        const response = await fetch('typography.json');
        if (!response.ok) throw new Error('文字基线契约加载失败');
        const records = await response.json();
        const root = document.createElementNS(NS, 'svg');
        root.setAttribute('viewBox', '0 0 1080 1920');
        root.setAttribute('aria-hidden', 'true');
        root.classList.add('ui-labels');
        let speed;
        for (const record of records) {
            const label = document.createElementNS(NS, 'text');
            for (const [key, value] of Object.entries({ x:record.x, y:record.y, 'font-size':record.size, fill:record.color, 'font-weight':record.weight, 'text-anchor':record.anchor })) label.setAttribute(key, String(value));
            label.textContent = record.value;
            label.dataset.group = record.group;
            root.append(label);
            if (record.key === 'speed') speed = label;
        }
        stage.append(root);
        // 整份契约成功加载后才隐藏HTML备用文字；网络/JSON异常仍保留可读且可点击的界面。
        stage.classList.add('typography-ready');
        return new UiTypographyView(speed, root);
    }
    constructor(speed, root) { this.speed = speed; this.root = root; }
    setSpeed(value) { this.speed.textContent = value; }
    setState(state) {
        const values = { '54':state.gold, 'Lv.3':state.level, '伤害 18 · 射程 3.2':state.stats, '出售 67':state.sell, '已满级':state.upgrade, '下一波':state.next };
        // 以原始键更新而不是当前文案匹配，反复切换状态不会丢失目标节点。
        for (const label of this.root.querySelectorAll('text')) {
            label.dataset.original ||= label.textContent;
            const original = label.dataset.original;
            if (Object.hasOwn(values, original)) label.textContent = values[original];
            if (original === '已满级') label.setAttribute('fill', state.upgradeDisabled ? '#aebbc2' : '#bce4c5');
            if (original === '出售 67') label.setAttribute('fill', state.sellDisabled ? '#aebbc2' : '#f4e9cd');
            if (original === '下一波') label.setAttribute('fill', state.nextDisabled ? '#aebbc2' : '#f4e9cd');
        }
    }
}
