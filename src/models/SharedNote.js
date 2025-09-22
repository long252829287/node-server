/**
 * 共享笔记本数据模型
 * 定义共享笔记本的数据结构和验证规则
 * 支持多人协作，包含参与者管理和权限控制
 */

const mongoose = require('mongoose');

const sharedNoteSchema = new mongoose.Schema({
  // 笔记本标题（必需）
  title: {
    type: String,
    required: [true, '共享笔记本标题不能为空'],
    trim: true,
    maxlength: [200, '标题不能超过200个字符'],
    minlength: [1, '标题不能为空']
  },

  // 创建者用户名（必需）
  createdBy: {
    type: String,
    required: [true, '创建者不能为空'],
    trim: true,
    index: true
  },

  // 参与者用户名列表（包含创建者）
  participants: [{
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        return value && value.length > 0;
      },
      message: '参与者用户名不能为空'
    }
  }]
}, {
  // 自动添加时间戳
  timestamps: true,

  // 添加虚拟字段
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== 索引配置 ====================

// 创建者索引
sharedNoteSchema.index({ createdBy: 1 });

// 参与者索引
sharedNoteSchema.index({ participants: 1 });

// 复合索引：创建者 + 创建时间
sharedNoteSchema.index({ createdBy: 1, createdAt: -1 });

// 复合索引：参与者 + 更新时间
sharedNoteSchema.index({ participants: 1, updatedAt: -1 });

// ==================== 虚拟字段 ====================

// 参与者数量
sharedNoteSchema.virtual('participantCount').get(function() {
  return this.participants ? this.participants.length : 0;
});

// ==================== 实例方法 ====================

// 检查用户是否为创建者
sharedNoteSchema.methods.isCreator = function(username) {
  return this.createdBy === username;
};

// 检查用户是否为参与者
sharedNoteSchema.methods.isParticipant = function(username) {
  return this.participants && this.participants.includes(username);
};

// 检查用户是否有权限访问
sharedNoteSchema.methods.hasAccessPermission = function(username) {
  return this.isParticipant(username);
};

// 检查用户是否有编辑权限（仅创建者）
sharedNoteSchema.methods.hasEditPermission = function(username) {
  return this.isCreator(username);
};

// 添加参与者
sharedNoteSchema.methods.addParticipant = function(username) {
  if (!this.isParticipant(username)) {
    this.participants.push(username);
  }
  return this.save();
};

// 移除参与者
sharedNoteSchema.methods.removeParticipant = function(username) {
  if (!this.isCreator(username)) { // 不能移除创建者
    this.participants = this.participants.filter(p => p !== username);
  }
  return this.save();
};

// 更新参与者列表（确保创建者始终在列表中）
sharedNoteSchema.methods.updateParticipants = function(newParticipants) {
  // 确保创建者在参与者列表中
  const uniqueParticipants = [...new Set(newParticipants)];
  if (!uniqueParticipants.includes(this.createdBy)) {
    uniqueParticipants.unshift(this.createdBy);
  }
  this.participants = uniqueParticipants;
  return this.save();
};

// ==================== 静态方法 ====================

// 获取用户可访问的共享笔记本
sharedNoteSchema.statics.getUserAccessibleNotes = function(username) {
  return this.find({
    participants: username
  }).sort({ updatedAt: -1 });
};

// 获取用户创建的共享笔记本
sharedNoteSchema.statics.getUserCreatedNotes = function(username) {
  return this.find({
    createdBy: username
  }).sort({ updatedAt: -1 });
};

// 按参与者统计
sharedNoteSchema.statics.getParticipantStats = function() {
  return this.aggregate([
    { $unwind: '$participants' },
    {
      $group: {
        _id: '$participants',
        sharedNotesCount: { $sum: 1 },
        createdNotesCount: { $sum: { $cond: [{ $eq: ['$participants', '$createdBy'] }, 1, 0] } }
      }
    },
    { $sort: { sharedNotesCount: -1 } }
  ]);
};

// ==================== 中间件 ====================

// 保存前中间件：确保创建者在参与者列表中
sharedNoteSchema.pre('save', function(next) {
  if (!this.participants) {
    this.participants = [];
  }

  // 确保创建者在参与者列表中
  if (!this.participants.includes(this.createdBy)) {
    this.participants.unshift(this.createdBy);
  }

  // 去重
  this.participants = [...new Set(this.participants)];

  next();
});

// 保存前中间件：验证参与者列表不为空
sharedNoteSchema.pre('save', function(next) {
  if (!this.participants || this.participants.length === 0) {
    return next(new Error('参与者列表不能为空'));
  }
  next();
});

// ==================== 验证器 ====================

// 自定义验证器：检查参与者数量
sharedNoteSchema.path('participants').validate(function(value) {
  return value && value.length > 0 && value.length <= 50;
}, '参与者数量必须在1-50之间');

// 自定义验证器：检查创建者是否在参与者列表中
sharedNoteSchema.path('participants').validate(function(value) {
  return value && value.includes(this.createdBy);
}, '创建者必须在参与者列表中');

// 导出模型
module.exports = mongoose.model('SharedNote', sharedNoteSchema);