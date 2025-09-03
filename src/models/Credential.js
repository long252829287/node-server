/**
 * 凭据数据模型
 * 存储账号、网站及加密后的密码，归属到具体用户
 */

const mongoose = require('mongoose');

const encryptedPasswordSchema = new mongoose.Schema({
  /** 加密算法 */
  algorithm: { type: String, required: true, default: 'aes-256-gcm' },
  /** 初始化向量(IV)，base64 */
  iv: { type: String, required: true },
  /** 密文，base64 */
  ciphertext: { type: String, required: true },
  /** 认证标签(authTag)，base64 */
  tag: { type: String, required: true }
}, { _id: false });

const credentialSchema = new mongoose.Schema({
  /** 归属用户 */
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '凭据必须关联用户'],
    index: true
  },

  /** 账号/用户名 */
  account: {
    type: String,
    required: [true, '账号不能为空'],
    trim: true,
    maxlength: [200, '账号长度不能超过200个字符'],
    index: true
  },

  /** 使用的网站/服务名称，可为URL或名称 */
  website: {
    type: String,
    required: [true, '网站/服务不能为空'],
    trim: true,
    maxlength: [300, '网站长度不能超过300个字符']
  },

  /** 备注 */
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, '备注不能超过1000个字符']
  },

  /** 加密后的密码对象 */
  passwordEncrypted: {
    type: encryptedPasswordSchema,
    required: true,
    select: false // 默认查询不返回，避免泄露
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 组合唯一约束：同一用户下 website + account 不重复
credentialSchema.index({ user: 1, website: 1, account: 1 }, { unique: true });

module.exports = mongoose.model('Credential', credentialSchema);


