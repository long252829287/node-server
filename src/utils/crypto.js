/**
 * 加解密工具（AES-256-GCM）
 */

const crypto = require('crypto');

const getKeyBuffer = () => {
  const raw = process.env.CRED_ENC_KEY || process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('缺少环境变量 CRED_ENC_KEY（或 CREDENTIALS_ENCRYPTION_KEY），用于凭据加密');
  }

  // 支持base64或hex，或直接使用任意字符串通过scrypt派生
  try {
    const maybeBase64 = Buffer.from(raw, 'base64');
    if (maybeBase64.length === 32) return maybeBase64;
  } catch (_) {}

  try {
    const maybeHex = Buffer.from(raw, 'hex');
    if (maybeHex.length === 32) return maybeHex;
  } catch (_) {}

  // 回退：用scrypt从字符串派生32字节密钥
  const salt = process.env.CRED_ENC_SALT || 'lyl-credential-default-salt';
  return crypto.scryptSync(raw, salt, 32);
};

/**
 * 加密明文
 * @param {string} plaintext
 * @returns {{ algorithm: string, iv: string, ciphertext: string, tag: string }}
 */
const encryptText = (plaintext) => {
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(12); // GCM 推荐 12字节IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    tag: tag.toString('base64')
  };
};

/**
 * 解密为明文
 * @param {{ algorithm: string, iv: string, ciphertext: string, tag: string }} payload
 * @returns {string}
 */
const decryptText = (payload) => {
  if (!payload || payload.algorithm !== 'aes-256-gcm') {
    throw new Error('不支持的加密算法或无效数据');
  }
  const key = getKeyBuffer();
  const iv = Buffer.from(payload.iv, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
};

module.exports = {
  encryptText,
  decryptText
};


