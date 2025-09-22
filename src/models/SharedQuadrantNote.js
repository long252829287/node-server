/**
 * 共享四象限笔记项数据模型
 * 定义共享笔记本中笔记项的数据结构和验证规则
 * 支持四象限视图，包含位置坐标和排序信息
 */

const mongoose = require('mongoose');

const sharedQuadrantNoteSchema = new mongoose.Schema({
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
    maxlength: [5000, '笔记内容不能超过5000个字符']
  },

  // 标签数组（可选）
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, '单个标签不能超过50个字符']
  }],

  // X轴坐标（-1, 0, 1）
  x_axis: {
    type: Number,
    required: [true, 'X轴坐标不能为空'],
    enum: {
      values: [-1, 0, 1],
      message: 'X轴坐标只能是 -1、0 或 1'
    },
    default: 0,
    index: true
  },

  // Y轴坐标（-1, 0, 1）
  y_axis: {
    type: Number,
    required: [true, 'Y轴坐标不能为空'],
    enum: {
      values: [-1, 0, 1],
      message: 'Y轴坐标只能是 -1、0 或 1'
    },
    default: 0,
    index: true
  },

  // 在象限内的排序
  order: {
    type: Number,
    required: [true, '排序不能为空'],
    default: 0,
    min: [0, '排序不能为负数']
  },

  // 创建者用户名（必需）
  createdBy: {
    type: String,
    required: [true, '创建者不能为空'],
    trim: true,
    index: true
  },

  // 所属共享笔记本ID（必需）
  sharedNoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedNote',
    required: [true, '所属共享笔记本不能为空'],
    index: true
  },

  // 用户颜色（前端计算，可选）
  color: {
    type: String,
    trim: true,
    maxlength: [20, '颜色值不能超过20个字符'],
    match: [/^#[0-9a-fA-F]{6}$|^[a-zA-Z]+$/, '颜色格式不正确']
  }
}, {
  // 自动添加时间戳
  timestamps: true,

  // 添加虚拟字段
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== 索引配置 ====================

// 复合索引：共享笔记本 + 象限位置 + 排序
sharedQuadrantNoteSchema.index({
  sharedNoteId: 1,
  x_axis: 1,
  y_axis: 1,
  order: 1
});

// 复合索引：共享笔记本 + 创建者
sharedQuadrantNoteSchema.index({ sharedNoteId: 1, createdBy: 1 });

// 复合索引：共享笔记本 + 创建时间
sharedQuadrantNoteSchema.index({ sharedNoteId: 1, createdAt: -1 });

// 复合索引：创建者 + 创建时间
sharedQuadrantNoteSchema.index({ createdBy: 1, createdAt: -1 });

// 标签索引
sharedQuadrantNoteSchema.index({ tags: 1 });

// 全文搜索索引
sharedQuadrantNoteSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text'
});

// ==================== 虚拟字段 ====================

// 象限名称
sharedQuadrantNoteSchema.virtual('quadrant').get(function() {
  const quadrantMap = {
    '1,1': '重要且紧急',
    '1,-1': '重要不紧急',
    '-1,1': '不重要但紧急',
    '-1,-1': '不重要不紧急',
    '0,0': '中心区域',
    '1,0': '重要',
    '-1,0': '不重要',
    '0,1': '紧急',
    '0,-1': '不紧急'
  };
  return quadrantMap[`${this.x_axis},${this.y_axis}`] || '未知象限';
});

// 笔记摘要
sharedQuadrantNoteSchema.virtual('summary').get(function() {
  if (this.content) {
    return this.content.length > 100
      ? this.content.substring(0, 100) + '...'
      : this.content;
  }
  return '';
});

// 内容长度
sharedQuadrantNoteSchema.virtual('contentLength').get(function() {
  return this.content ? this.content.length : 0;
});

// 标签数量
sharedQuadrantNoteSchema.virtual('tagCount').get(function() {
  return this.tags ? this.tags.length : 0;
});

// ==================== 实例方法 ====================

// 检查用户是否为创建者
sharedQuadrantNoteSchema.methods.isCreator = function(username) {
  return this.createdBy === username;
};

// 移动到新象限
sharedQuadrantNoteSchema.methods.moveToQuadrant = function(x_axis, y_axis, order = 0) {
  this.x_axis = x_axis;
  this.y_axis = y_axis;
  this.order = order;
  return this.save();
};

// 更新排序
sharedQuadrantNoteSchema.methods.updateOrder = function(newOrder) {
  this.order = newOrder;
  return this.save();
};

// 添加标签
sharedQuadrantNoteSchema.methods.addTag = function(tag) {
  if (tag && !this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this.save();
};

// 移除标签
sharedQuadrantNoteSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

// ==================== 静态方法 ====================

// 按共享笔记本获取所有笔记项
sharedQuadrantNoteSchema.statics.getBySharedNoteId = function(sharedNoteId) {
  return this.find({ sharedNoteId })
    .sort({ x_axis: 1, y_axis: 1, order: 1 })
    .populate('sharedNoteId', 'title participants');
};

// 按象限获取笔记项
sharedQuadrantNoteSchema.statics.getByQuadrant = function(sharedNoteId, x_axis, y_axis) {
  return this.find({
    sharedNoteId,
    x_axis,
    y_axis
  }).sort({ order: 1 });
};

// 按创建者获取笔记项
sharedQuadrantNoteSchema.statics.getByCreator = function(sharedNoteId, createdBy) {
  return this.find({
    sharedNoteId,
    createdBy
  }).sort({ createdAt: -1 });
};

// 获取象限统计信息
sharedQuadrantNoteSchema.statics.getQuadrantStats = function(sharedNoteId) {
  return this.aggregate([
    { $match: { sharedNoteId: mongoose.Types.ObjectId(sharedNoteId) } },
    {
      $group: {
        _id: { x_axis: '$x_axis', y_axis: '$y_axis' },
        count: { $sum: 1 },
        creators: { $addToSet: '$createdBy' },
        totalContentLength: { $sum: { $strLenCP: '$content' } },
        tags: { $push: '$tags' }
      }
    },
    {
      $project: {
        quadrant: { $concat: [{ $toString: '$_id.x_axis' }, ',', { $toString: '$_id.y_axis' }] },
        count: 1,
        creatorCount: { $size: '$creators' },
        totalContentLength: 1,
        allTags: { $reduce: { input: '$tags', initialValue: [], in: { $concatArrays: ['$$value', '$$this'] } } }
      }
    }
  ]);
};

// 获取标签使用统计
sharedQuadrantNoteSchema.statics.getTagStats = function(sharedNoteId) {
  return this.aggregate([
    { $match: { sharedNoteId: mongoose.Types.ObjectId(sharedNoteId) } },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 },
        creators: { $addToSet: '$createdBy' },
        quadrants: { $addToSet: { x_axis: '$x_axis', y_axis: '$y_axis' } }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// ==================== 中间件 ====================

// 保存前中间件：清理空标签
sharedQuadrantNoteSchema.pre('save', function(next) {
  if (this.tags) {
    this.tags = this.tags.filter(tag => tag && tag.trim() !== '');
  }
  next();
});

// 保存前中间件：验证象限坐标组合
sharedQuadrantNoteSchema.pre('save', function(next) {
  const validCombinations = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 0], [0, 1],
    [1, -1], [1, 0], [1, 1]
  ];

  const isValid = validCombinations.some(([x, y]) =>
    x === this.x_axis && y === this.y_axis
  );

  if (!isValid) {
    return next(new Error('象限坐标组合无效'));
  }

  next();
});

// ==================== 验证器 ====================

// 自定义验证器：检查内容是否为空（去除空格后）
sharedQuadrantNoteSchema.path('content').validate(function(value) {
  if (!value || value.trim().length === 0) {
    return false;
  }
  return true;
}, '笔记内容不能为空或只包含空格');

// 自定义验证器：检查标签数量
sharedQuadrantNoteSchema.path('tags').validate(function(value) {
  if (value && value.length > 10) {
    return false;
  }
  return true;
}, '标签数量不能超过10个');

// 导出模型
module.exports = mongoose.model('SharedQuadrantNote', sharedQuadrantNoteSchema);