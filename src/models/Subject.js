/**
 * 学习科目数据模型
 * 存储用户的学习科目信息
 */

const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  /** 归属用户 */
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '科目必须关联用户'],
    index: true
  },

  /** 科目名称 */
  name: {
    type: String,
    required: [true, '科目名称不能为空'],
    trim: true,
    maxlength: [100, '科目名称不能超过100个字符']
  },

  /** 科目描述 */
  description: {
    type: String,
    trim: true,
    maxlength: [500, '科目描述不能超过500个字符']
  },

  /** 科目颜色（用于UI显示） */
  color: {
    type: String,
    default: '#3B82F6',
    match: [/^#[0-9A-Fa-f]{6}$/, '颜色格式不正确，应为6位十六进制']
  },

  /** 科目图标 */
  icon: {
    type: String,
    trim: true,
    maxlength: [50, '图标名称不能超过50个字符']
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

// 复合索引：用户 + 创建时间
subjectSchema.index({ user: 1, createdAt: -1 });

// 复合索引：用户 + 置顶状态 + 排序权重
subjectSchema.index({ user: 1, isPinned: -1, sortWeight: -1 });

// 全文搜索索引
subjectSchema.index({ 
  name: 'text', 
  description: 'text'
});

// ==================== 虚拟字段 ====================

// 文件数量（通过关联查询获取）
subjectSchema.virtual('fileCount').get(function() {
  return this._fileCount || 0;
});

// 设置文件数量
subjectSchema.methods.setFileCount = function(count) {
  this._fileCount = count;
  return this;
};

// ==================== 实例方法 ====================

// 更新最后编辑时间
subjectSchema.methods.updateLastEdited = function() {
  this.lastEditedAt = new Date();
  return this.save();
};

// 切换置顶状态
subjectSchema.methods.togglePin = function() {
  this.isPinned = !this.isPinned;
  return this.save();
};

// ==================== 静态方法 ====================

// 获取用户科目统计
subjectSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSubjects: { $sum: 1 },
        pinnedSubjects: { $sum: { $cond: ['$isPinned', 1, 0] } }
      }
    }
  ]);
};

// ==================== 中间件 ====================

// 保存前中间件：更新最后编辑时间
subjectSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isModified('description')) {
    this.lastEditedAt = new Date();
  }
  next();
});

// ==================== 验证器 ====================

// 自定义验证器：检查科目名称是否包含敏感词
subjectSchema.path('name').validate(function(value) {
  const sensitiveWords = ['admin', 'root', 'system', 'test'];
  return !sensitiveWords.includes(value.toLowerCase());
}, '科目名称不能包含敏感词');

// 导出模型
module.exports = mongoose.model('Subject', subjectSchema);
