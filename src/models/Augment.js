/**
 * 海克斯强化（Augment）数据模型
 * 用于海克斯大乱斗等模式的强化选择列表
 */

const mongoose = require('mongoose');

const augmentSchema = new mongoose.Schema(
  {
    // 兼容旧数据结构（部分环境已存在 syncId + id 的唯一索引）
    syncId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    id: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    augmentId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
      default: '',
    },
    // 备用图标（来自 CommunityDragon cdragon/arena 数据）
    iconSmall: {
      type: String,
      trim: true,
      default: '',
    },
    iconLarge: {
      type: String,
      trim: true,
      default: '',
    },
    rarity: {
      type: String,
      trim: true,
      enum: ['silver', 'gold', 'prismatic'],
      required: true,
    },
    version: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    sourceUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

augmentSchema.index({ syncId: 1, id: 1 }, { unique: true });
augmentSchema.index({ rarity: 1, name: 1 });

module.exports = mongoose.models.Augment || mongoose.model('Augment', augmentSchema, 'augments');
