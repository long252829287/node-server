/**
 * 学习文件数据模型
 * 存储科目下的Markdown文件内容
 */

const mongoose = require('mongoose');

const studyFileSchema = new mongoose.Schema({
  /** 归属科目 */
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, '文件必须关联科目'],
    index: true
  },

  /** 归属用户 */
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '文件必须关联用户'],
    index: true
  },

  /** 文件名 */
  fileName: {
    type: String,
    required: [true, '文件名不能为空'],
    trim: true,
    maxlength: [200, '文件名不能超过200个字符'],
    match: [/^[a-zA-Z0-9\u4e00-\u9fa5_-]+\.md$/, '文件名只能包含字母、数字、中文、下划线、横线，且必须以.md结尾']
  },

  /** 文件标题 */
  title: {
    type: String,
    required: [true, '文件标题不能为空'],
    trim: true,
    maxlength: [200, '文件标题不能超过200个字符']
  },

  /** 文件内容 */
  content: {
    type: String,
    default: '',
    maxlength: [50000, '文件内容不能超过50000个字符']
  },

  /** 文件大小（字符数） */
  size: {
    type: Number,
    default: 0,
    min: [0, '文件大小不能为负数']
  },

  /** 是否置顶 */
  isPinned: {
    type: Boolean,
    default: false
  },

  /** 排序权重 */
  sortWeight: {
    type: Number,
    default: 0
  },

  /** 最后编辑时间 */
  lastEditedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== 索引配置 ====================

// 复合索引：科目 + 文件名（唯一）
studyFileSchema.index({ subject: 1, fileName: 1 }, { unique: true });

// 复合索引：用户 + 科目 + 创建时间
studyFileSchema.index({ user: 1, subject: 1, createdAt: -1 });

// 复合索引：科目 + 置顶状态 + 排序权重
studyFileSchema.index({ subject: 1, isPinned: -1, sortWeight: -1 });

// 全文搜索索引
studyFileSchema.index({ 
  title: 'text', 
  content: 'text'
});

// ==================== 虚拟字段 ====================

// 内容摘要（前100个字符）
studyFileSchema.virtual('summary').get(function() {
  if (this.content) {
    return this.content.length > 100 
      ? this.content.substring(0, 100) + '...' 
      : this.content;
  }
  return '';
});

// 内容长度
studyFileSchema.virtual('contentLength').get(function() {
  return this.content ? this.content.length : 0;
});

// ==================== 实例方法 ====================

// 更新最后编辑时间
studyFileSchema.methods.updateLastEdited = function() {
  this.lastEditedAt = new Date();
  return this.save();
};

// 切换置顶状态
studyFileSchema.methods.togglePin = function() {
  this.isPinned = !this.isPinned;
  return this.save();
};

// 更新文件大小
studyFileSchema.methods.updateSize = function() {
  this.size = this.content ? this.content.length : 0;
  return this.save();
};

// ==================== 静态方法 ====================

// 获取科目文件统计
studyFileSchema.statics.getSubjectStats = function(subjectId) {
  return this.aggregate([
    { $match: { subject: mongoose.Types.ObjectId(subjectId) } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
        averageSize: { $avg: '$size' },
        pinnedFiles: { $sum: { $cond: ['$isPinned', 1, 0] } }
      }
    }
  ]);
};

// 获取用户文件统计
studyFileSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
        averageSize: { $avg: '$size' }
      }
    }
  ]);
};

// ==================== 中间件 ====================

// 保存前中间件：更新最后编辑时间和文件大小
studyFileSchema.pre('save', function(next) {
  if (this.isModified('content') || this.isModified('title')) {
    this.lastEditedAt = new Date();
  }
  
  // 更新文件大小
  this.size = this.content ? this.content.length : 0;
  
  next();
});

// ==================== 验证器 ====================

// 自定义验证器：检查文件名是否重复
studyFileSchema.path('fileName').validate(async function(value) {
  if (!value) return false;
  
  const StudyFile = this.constructor;
  const existingFile = await StudyFile.findOne({
    subject: this.subject,
    fileName: value,
    _id: { $ne: this._id }
  });
  
  return !existingFile;
}, '文件名已存在');

// 自定义验证器：检查内容是否为空（去除空格后）
studyFileSchema.path('content').validate(function(value) {
  if (value === undefined || value === null) return true;
  return true; // 允许空内容
}, '文件内容格式不正确');

// 导出模型
module.exports = mongoose.model('StudyFile', studyFileSchema);
