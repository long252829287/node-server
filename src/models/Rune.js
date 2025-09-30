/**
 * 符文数据模型
 * 存储英雄联盟符文系统数据
 */

const mongoose = require('mongoose');

// 单个符文 Schema
const runeItemSchema = new mongoose.Schema({
  // 符文 ID
  id: {
    type: String,
    required: true
  },
  // 符文名称
  name: {
    type: String,
    required: true,
    trim: true
  },
  // 符文图标 URL
  icon: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

// 符文槽位 Schema
const runeSlotSchema = new mongoose.Schema({
  // 槽位中的符文列表
  runes: [runeItemSchema]
}, { _id: false });

// 符文树 Schema
const runeTreeSchema = new mongoose.Schema({
  // 符文树 ID
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // 符文树名称
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, '符文树名称不能超过50个字符']
  },
  // 符文树图标 URL
  icon: {
    type: String,
    required: true,
    trim: true
  },
  // 符文槽位（4层）
  slots: {
    type: [runeSlotSchema],
    validate: {
      validator: function(slots) {
        return slots.length === 4;
      },
      message: '符文树必须有4个槽位'
    }
  },
  // 数据版本
  version: {
    type: String,
    default: '1.0.0'
  },
  // 是否启用
  isEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
runeTreeSchema.index({ name: 'text' });
runeTreeSchema.index({ id: 1, isEnabled: 1 });

// 静态方法：获取所有符文树
runeTreeSchema.statics.getAllTrees = function() {
  return this.find({ isEnabled: true }).lean();
};

// 静态方法：按 ID 获取符文树
runeTreeSchema.statics.getTreeById = function(treeId) {
  return this.findOne({ id: treeId, isEnabled: true }).lean();
};

// 静态方法：获取符文树中的特定符文
runeTreeSchema.statics.getRuneById = async function(runeId) {
  const trees = await this.find({ isEnabled: true }).lean();

  for (const tree of trees) {
    for (const slot of tree.slots) {
      const rune = slot.runes.find(r => r.id === runeId);
      if (rune) {
        return {
          ...rune,
          treeId: tree.id,
          treeName: tree.name,
          treeIcon: tree.icon
        };
      }
    }
  }

  return null;
};

// 静态方法：验证符文配置
runeTreeSchema.statics.validateRuneConfig = async function(primaryTreeId, primaryRuneIds, secondaryTreeId, secondaryRuneIds) {
  // 获取主系和副系符文树
  const [primaryTree, secondaryTree] = await Promise.all([
    this.findOne({ id: primaryTreeId, isEnabled: true }).lean(),
    this.findOne({ id: secondaryTreeId, isEnabled: true }).lean()
  ]);

  if (!primaryTree) {
    return { valid: false, error: '主系符文树不存在' };
  }

  if (!secondaryTree) {
    return { valid: false, error: '副系符文树不存在' };
  }

  if (primaryTreeId === secondaryTreeId) {
    return { valid: false, error: '主系和副系不能相同' };
  }

  // 验证主系符文数量（4个：每层选1个）
  if (!primaryRuneIds || primaryRuneIds.length !== 4) {
    return { valid: false, error: '主系必须选择4个符文（每层1个）' };
  }

  // 验证副系符文数量（2个）
  if (!secondaryRuneIds || secondaryRuneIds.length !== 2) {
    return { valid: false, error: '副系必须选择2个符文' };
  }

  // 验证主系符文的有效性（每层选一个，且不能重复）
  const primaryRuneSet = new Set();
  for (let slotIndex = 0; slotIndex < 4; slotIndex++) {
    const runeId = primaryRuneIds[slotIndex];
    const slot = primaryTree.slots[slotIndex];

    if (!slot) {
      return { valid: false, error: `主系第${slotIndex + 1}层不存在` };
    }

    const rune = slot.runes.find(r => r.id === runeId);
    if (!rune) {
      return { valid: false, error: `主系第${slotIndex + 1}层符文无效` };
    }

    if (primaryRuneSet.has(runeId)) {
      return { valid: false, error: '主系符文不能重复' };
    }

    primaryRuneSet.add(runeId);
  }

  // 验证副系符文的有效性（从第2-4层中选2个，不能重复）
  const secondaryRuneSet = new Set();
  for (const runeId of secondaryRuneIds) {
    let found = false;

    // 副系只能从第2-4层选择（索引1-3）
    for (let slotIndex = 1; slotIndex < 4; slotIndex++) {
      const slot = secondaryTree.slots[slotIndex];
      if (slot) {
        const rune = slot.runes.find(r => r.id === runeId);
        if (rune) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      return { valid: false, error: '副系符文必须从第2-4层选择' };
    }

    if (secondaryRuneSet.has(runeId)) {
      return { valid: false, error: '副系符文不能重复' };
    }

    secondaryRuneSet.add(runeId);
  }

  // 验证副系符文不能来自同一层
  const secondarySlots = [];
  for (const runeId of secondaryRuneIds) {
    for (let slotIndex = 1; slotIndex < 4; slotIndex++) {
      const slot = secondaryTree.slots[slotIndex];
      if (slot && slot.runes.find(r => r.id === runeId)) {
        if (secondarySlots.includes(slotIndex)) {
          return { valid: false, error: '副系符文不能来自同一层' };
        }
        secondarySlots.push(slotIndex);
        break;
      }
    }
  }

  return { valid: true };
};

module.exports = mongoose.model('Rune', runeTreeSchema);