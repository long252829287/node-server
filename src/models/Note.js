/**
 * 笔记数据模型
 * 定义笔记的数据结构和验证规则
 * 支持标题、内容、标签、状态等字段
 */

const mongoose = require('mongoose');

// 笔记模式定义
const noteSchema = new mongoose.Schema({
  // 笔记标题（可选）
  title: {
    type: String,
    trim: true,
    maxlength: [200, '标题不能超过200个字符'],
    default: ''
  },
  
  // 笔记内容（必需）
  content: {
    type: String,
    required: [true, '笔记内容不能为空'],
    trim: true,
    maxlength: [10000, '笔记内容不能超过10000个字符']
  },
  
  // 关联用户（必需）
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '笔记必须关联用户'],
    index: true // 添加索引提高查询性能
  },
  
  // 标签数组（可选）
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, '单个标签不能超过50个字符']
  }],
  
  // 笔记状态
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'archived'],
      message: '状态只能是 draft、published 或 archived'
    },
    default: 'draft'
  },
  
  // 笔记类型
  type: {
    type: String,
    enum: {
      values: ['text', 'markdown', 'html'],
      message: '类型只能是 text、markdown 或 html'
    },
    default: 'text'
  },
  
  // 是否置顶
  isPinned: {
    type: Boolean,
    default: false
  },
  
  // 是否公开
  isPublic: {
    type: Boolean,
    default: false
  },
  
  // 阅读次数
  readCount: {
    type: Number,
    default: 0,
    min: [0, '阅读次数不能为负数']
  },
  
  // 收藏次数
  favoriteCount: {
    type: Number,
    default: 0,
    min: [0, '收藏次数不能为负数']
  },
  
  // 最后编辑时间
  lastEditedAt: {
    type: Date,
    default: Date.now
  },

  x_axis: {
    type: Number,
    default: 0,
  },

  y_axis: {
    type: Number,
    default: 0,
  }
}, {
  // 自动添加时间戳
  timestamps: true,
  
  // 添加虚拟字段
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== 索引配置 ====================

// 复合索引：用户 + 创建时间（用于按用户查询笔记并按时间排序）
noteSchema.index({ user: 1, createdAt: -1 });

// 复合索引：用户 + 状态（用于按用户和状态查询笔记）
noteSchema.index({ user: 1, status: 1 });

// 复合索引：用户 + 置顶状态 + 创建时间（用于获取用户置顶笔记）
noteSchema.index({ user: 1, isPinned: -1, createdAt: -1 });

// 标签索引（用于按标签搜索笔记）
noteSchema.index({ tags: 1 });

// 全文搜索索引（用于内容搜索）
noteSchema.index({ 
  title: 'text', 
  content: 'text',
  tags: 'text'
});

// ==================== 虚拟字段 ====================

// 笔记摘要（前100个字符）
noteSchema.virtual('summary').get(function() {
  if (this.content) {
    return this.content.length > 100 
      ? this.content.substring(0, 100) + '...' 
      : this.content;
  }
  return '';
});

// 笔记长度
noteSchema.virtual('contentLength').get(function() {
  return this.content ? this.content.length : 0;
});

// 标签数量
noteSchema.virtual('tagCount').get(function() {
  return this.tags ? this.tags.length : 0;
});

// ==================== 实例方法 ====================

// 增加阅读次数
noteSchema.methods.incrementReadCount = function() {
  this.readCount += 1;
  return this.save();
};

// 增加收藏次数
noteSchema.methods.incrementFavoriteCount = function() {
  this.favoriteCount += 1;
  return this.save();
};

// 减少收藏次数
noteSchema.methods.decrementFavoriteCount = function() {
  if (this.favoriteCount > 0) {
    this.favoriteCount -= 1;
  }
  return this.save();
};

// 切换置顶状态
noteSchema.methods.togglePin = function() {
  this.isPinned = !this.isPinned;
  return this.save();
};

// 切换公开状态
noteSchema.methods.togglePublic = function() {
  this.isPublic = !this.isPublic;
  return this.save();
};

// 更新最后编辑时间
noteSchema.methods.updateLastEdited = function() {
  this.lastEditedAt = new Date();
  return this.save();
};

// ==================== 静态方法 ====================

// 按用户获取笔记统计信息
noteSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalNotes: { $sum: 1 },
        totalContentLength: { $sum: { $strLenCP: '$content' } },
        averageContentLength: { $avg: { $strLenCP: '$content' } },
        totalReads: { $sum: '$readCount' },
        totalFavorites: { $sum: '$favoriteCount' },
        pinnedNotes: { $sum: { $cond: ['$isPinned', 1, 0] } },
        publicNotes: { $sum: { $cond: ['$isPublic', 1, 0] } }
      }
    }
  ]);
};

// 按标签获取笔记统计
noteSchema.statics.getTagStats = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 },
        totalReads: { $sum: '$readCount' },
        totalFavorites: { $sum: '$favoriteCount' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// ==================== 中间件 ====================

// 保存前中间件：更新最后编辑时间
noteSchema.pre('save', function(next) {
  if (this.isModified('content') || this.isModified('title')) {
    this.lastEditedAt = new Date();
  }
  next();
});

// 保存前中间件：清理空标签
noteSchema.pre('save', function(next) {
  if (this.tags) {
    this.tags = this.tags.filter(tag => tag && tag.trim() !== '');
  }
  next();
});

// ==================== 验证器 ====================

// 自定义验证器：检查内容是否为空（去除空格后）
noteSchema.path('content').validate(function(value) {
  if (!value || value.trim().length === 0) {
    return false;
  }
  return true;
}, '笔记内容不能为空或只包含空格');

// 自定义验证器：检查标签数量
noteSchema.path('tags').validate(function(value) {
  if (value && value.length > 20) {
    return false;
  }
  return true;
}, '标签数量不能超过20个');

// 导出模型
module.exports = mongoose.model('Note', noteSchema);