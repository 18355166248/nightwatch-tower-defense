import type {Label} from 'cc';
import {VisibleResourceSlots} from './VisibleResourceSlots';

/** Cocos 标签纹理由节点生命周期释放，不调用私有纹理销毁或全局缓存清理。 */
export class VisibleLabelSlots extends VisibleResourceSlots<Label> {
    constructor() {super(label=>{label.node.removeFromParent();label.node.destroy();});}
}
