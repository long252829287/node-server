/**
 * 英雄数据模型
 * 存储英雄联盟所有英雄信息
 */

const mongoose = require('mongoose');

const championSchema = new mongoose.Schema({
  // Riot 官方英雄 ID
  riotId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 英雄英文 key (例如: 'Ahri', 'Annie')
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 英雄名称（中文）
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, '英雄名称不能超过100个字符']
  },

  // 英雄标题/称号
  title: {
    type: String,
    trim: true,
    maxlength: [200, '英雄称号不能超过200个字符']
  },

  // 英雄描述
  description: {
    type: String,
    trim: true,
    maxlength: [1000, '英雄描述不能超过1000个字符']
  },

  // 英雄图片资源
  images: {
    // 方形头像 URL
    square: {
      type: String,
      trim: true
    },

    // 加载界面图片 URL
    loading: {
      type: String,
      trim: true
    },

    // 选择界面图片 URL
    splash: {
      type: String,
      trim: true
    },

    // 被动技能图标 URL
    passive: {
      type: String,
      trim: true
    }
  },

  // 英雄标签
  tags: [{
    type: String,
    enum: ['Assassin', 'Fighter', 'Mage', 'Marksman', 'Support', 'Tank']
  }],

  // 英雄统计数据 (用于展示难度等信息)
  stats: {
    difficulty: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    }
  },

  // 数据版本
  version: {
    type: String,
    required: true
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
championSchema.index({ name: 'text', title: 'text' });
championSchema.index({ tags: 1 });
championSchema.index({ version: 1 });

// 静态方法：按标签获取英雄
championSchema.statics.getByTags = function(tags) {
  return this.find({
    tags: { $in: tags },
    isEnabled: true
  });
};

// 静态方法：搜索英雄
championSchema.statics.search = function(keyword) {
  return this.find({
    $or: [
      { name: { $regex: keyword, $options: 'i' } },
      { title: { $regex: keyword, $options: 'i' } },
      { key: { $regex: keyword, $options: 'i' } }
    ],
    isEnabled: true
  });
};

module.exports = mongoose.model('Champion', championSchema);