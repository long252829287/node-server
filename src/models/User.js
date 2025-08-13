/**
 * 用户数据模型
 * 定义用户的数据结构和验证规则
 * 支持用户名、密码、邮箱、角色等字段
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 用户模式定义
const userSchema = new mongoose.Schema({
  // 用户名（必需，唯一）
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名长度不能少于3个字符'],
    maxlength: [20, '用户名长度不能超过20个字符'],
    match: [/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'],
    index: true
  },
  
  // 业务唯一ID（与Mongo自带_id不同，用于对外暴露的稳定标识）
  uid: {
    type: String,
    unique: true,
    index: true,
    default: function() {
      return `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    }
  },
  
  // 密码（必需）
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码长度不能少于6个字符'],
    maxlength: [128, '密码长度不能超过128个字符']
  },
  
  // 邮箱（可选，唯一）
  email: {
    type: String,
    unique: true,
    sparse: true, // 允许null值，但如果有值则必须唯一
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '邮箱格式不正确'],
    index: true
  },
  
  // 用户角色
  role: {
    type: String,
    enum: {
      values: ['user', 'moderator', 'admin'],
      message: '角色只能是 user、moderator 或 admin'
    },
    default: 'user'
  },
  
  // 用户状态
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended', 'banned'],
      message: '状态只能是 active、inactive、suspended 或 banned'
    },
    default: 'active'
  },
  
  // 个人资料
  profile: {
    // 显示名称
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, '显示名称不能超过50个字符']
    },
    
    // 头像URL
    avatar: {
      type: String,
      trim: true,
      maxlength: [500, '头像URL不能超过500个字符']
    },
    
    // 个人简介
    bio: {
      type: String,
      trim: true,
      maxlength: [500, '个人简介不能超过500个字符']
    },
    
    // 性别
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other', 'prefer-not-to-say'],
        message: '性别只能是 male、female、other 或 prefer-not-to-say'
      }
    },
    
    // 生日
    birthDate: {
      type: Date,
      validate: {
        validator: function(value) {
          if (!value) return true;
          const age = (new Date() - value) / (1000 * 60 * 60 * 24 * 365.25);
          return age >= 13 && age <= 120;
        },
        message: '年龄必须在13-120岁之间'
      }
    },
    
    // 位置
    location: {
      type: String,
      trim: true,
      maxlength: [100, '位置不能超过100个字符']
    },
    
    // 网站
    website: {
      type: String,
      trim: true,
      maxlength: [200, '网站URL不能超过200个字符'],
      match: [/^https?:\/\/.+/, '网站URL必须以http://或https://开头']
    }
  },
  
  // 统计信息
  stats: {
    // 笔记数量
    noteCount: {
      type: Number,
      default: 0,
      min: [0, '笔记数量不能为负数']
    },
    
    // 总阅读次数
    totalReads: {
      type: Number,
      default: 0,
      min: [0, '总阅读次数不能为负数']
    },
    
    // 总收藏次数
    totalFavorites: {
      type: Number,
      default: 0,
      min: [0, '总收藏次数不能为负数']
    },
    
    // 最后活跃时间
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // 安全设置
  security: {
    // 是否启用双因素认证
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    
    // 双因素认证密钥
    twoFactorSecret: {
      type: String,
      select: false // 默认不返回此字段
    },
    
    // 登录尝试次数
    loginAttempts: {
      type: Number,
      default: 0,
      min: [0, '登录尝试次数不能为负数']
    },
    
    // 账户锁定时间
    lockUntil: {
      type: Date
    },
    
    // 密码最后修改时间
    passwordChangedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // 偏好设置
  preferences: {
    // 语言
    language: {
      type: String,
      default: 'zh-CN',
      enum: ['zh-CN', 'en-US', 'ja-JP']
    },
    
    // 时区
    timezone: {
      type: String,
      default: 'Asia/Shanghai'
    },
    
    // 主题
    theme: {
      type: String,
      default: 'light',
      enum: ['light', 'dark', 'auto']
    },
    
    // 通知设置
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  }
}, {
  // 自动添加时间戳
  timestamps: true,
  
  // 添加虚拟字段
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== 索引配置 ====================

// 用户名索引（已在上方定义）
// 邮箱索引（已在上方定义）

// 复合索引：状态 + 角色（用于管理员查询）
userSchema.index({ status: 1, role: 1 });

// 复合索引：创建时间 + 状态（用于统计查询）
userSchema.index({ createdAt: 1, status: 1 });

// 全文搜索索引（用于用户名和简介搜索）
userSchema.index({ 
  username: 'text', 
  'profile.displayName': 'text',
  'profile.bio': 'text'
});

// ==================== 虚拟字段 ====================

// 用户年龄
userSchema.virtual('age').get(function() {
  if (this.profile && this.profile.birthDate) {
    const age = (new Date() - this.profile.birthDate) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(age);
  }
  return null;
});

// 是否被锁定
userSchema.virtual('isLocked').get(function() {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
});

// 账户状态描述
userSchema.virtual('statusDescription').get(function() {
  const statusMap = {
    active: '活跃',
    inactive: '非活跃',
    suspended: '已暂停',
    banned: '已封禁'
  };
  return statusMap[this.status] || '未知';
});

// ==================== 实例方法 ====================

// 验证密码
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 更新最后活跃时间
userSchema.methods.updateLastActive = function() {
  this.stats.lastActiveAt = new Date();
  return this.save();
};

// 增加笔记数量
userSchema.methods.incrementNoteCount = function() {
  this.stats.noteCount += 1;
  return this.save();
};

// 减少笔记数量
userSchema.methods.decrementNoteCount = function() {
  if (this.stats.noteCount > 0) {
    this.stats.noteCount -= 1;
  }
  return this.save();
};

// 增加登录尝试次数
userSchema.methods.incrementLoginAttempts = function() {
  this.security.loginAttempts += 1;
  
  // 如果尝试次数达到5次，锁定账户15分钟
  if (this.security.loginAttempts >= 5 && !this.isLocked) {
    this.security.lockUntil = Date.now() + 15 * 60 * 1000; // 15分钟
  }
  
  return this.save();
};

// 重置登录尝试次数
userSchema.methods.resetLoginAttempts = function() {
  this.security.loginAttempts = 0;
  this.security.lockUntil = undefined;
  return this.save();
};

// 更新密码
userSchema.methods.updatePassword = async function(newPassword) {
  this.password = await bcrypt.hash(newPassword, 10);
  this.security.passwordChangedAt = new Date();
  this.security.loginAttempts = 0;
  this.security.lockUntil = undefined;
  return this.save();
};

// ==================== 静态方法 ====================

// 按角色获取用户统计
userSchema.statics.getRoleStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        activeUsers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        totalNotes: { $sum: '$stats.noteCount' },
        totalReads: { $sum: '$stats.totalReads' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// 获取活跃用户
userSchema.statics.getActiveUsers = function(days = 7) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    'stats.lastActiveAt': { $gte: cutoffDate },
    status: 'active'
  }).select('username profile stats.lastActiveAt');
};

// ==================== 中间件 ====================

// 保存前中间件：密码加密
userSchema.pre('save', async function(next) {
  // 只有在密码被修改时才重新加密
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 保存前中间件：清理空字段
userSchema.pre('save', function(next) {
  // 清理profile中的空字段
  if (this.profile) {
    Object.keys(this.profile).forEach(key => {
      if (this.profile[key] === '' || this.profile[key] === null) {
        this.profile[key] = undefined;
      }
    });
  }
  next();
});

// ==================== 验证器 ====================

// 自定义验证器：检查用户名是否包含敏感词
userSchema.path('username').validate(function(value) {
  const sensitiveWords = ['admin', 'root', 'system', 'test', 'guest'];
  return !sensitiveWords.includes(value.toLowerCase());
}, '用户名不能包含敏感词');

// 自定义验证器：检查密码强度
userSchema.path('password').validate(function(value) {
  // 至少包含一个字母和一个数字
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  return hasLetter && hasNumber;
}, '密码必须包含至少一个字母和一个数字');

// 导出模型
module.exports = mongoose.model('User', userSchema);