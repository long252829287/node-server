/**
 * 强化（Augment）数据模型
 * 存储海克斯/强化池信息（支持多模式）
 */

const mongoose = require('mongoose');

const augmentSchema = new mongoose.Schema(
  {
    // 业务唯一ID（稳定暴露给前端）
    augmentId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    // 强化名称
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, '强化名称不能超过200个字符'],
      index: true,
    },

    // 强化描述
    description: {
      type: String,
      trim: true,
      maxlength: [4000, '强化描述不能超过4000个字符'],
    },

    // 图标URL/路径
    icon: {
      type: String,
      trim: true,
    },

    // 稀有度/层级（支持 1/2/3 或 common/rare 等）
    tier: {
      type: String,
      trim: true,
      set: (value) => (value === undefined || value === null ? value : String(value)),
      index: true,
    },

    // 标签
    tags: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],

    // 适用模式（包含 hex_brawl）
    modes: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],

    // 数据版本
    patchVersion: {
      type: String,
      trim: true,
      index: true,
    },

    // 是否启用
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 索引建议
augmentSchema.index({ modes: 1, isActive: 1, tier: 1 });
augmentSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Augment', augmentSchema);
