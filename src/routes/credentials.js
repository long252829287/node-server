/**
 * 凭据管理路由
 */

const express = require('express');
const Credential = require('../models/Credential');
const { protect } = require('../middleware/authMiddleware');
const { encryptText, decryptText } = require('../utils/crypto');
const { asyncHandler } = require('../utils/asyncHandler');
const { success, created, updated, deleted, badRequest, notFound, error } = require('../utils/response');

const router = express.Router();

// 统一应用鉴权
router.use(protect);

/**
 * 创建凭据
 * POST /api/credentials
 * body: { account, password, website, notes? }
 */
router.post('/', asyncHandler(async (req, res) => {
  const { account, password, website, notes } = req.body || {};
  if (!account || !password || !website) {
    return badRequest(res, 'account、password、website 为必填项');
  }

  const passwordEncrypted = encryptText(password);
  const doc = await Credential.create({
    user: req.user.userId,
    account: String(account).trim(),
    website: String(website).trim(),
    notes: notes ? String(notes).trim() : undefined,
    passwordEncrypted
  });

  return created(res, {
    id: doc._id,
    account: doc.account,
    website: doc.website,
    notes: doc.notes || null,
    createdAt: doc.createdAt
  }, '凭据创建成功');
}));

/**
 * 查询凭据列表（不返回密码）
 * GET /api/credentials
 */
router.get('/', asyncHandler(async (req, res) => {
  const list = await Credential.find({ user: req.user.userId })
    .select('account website notes createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .lean();

  return success(res, { total: list.length, items: list }, '获取凭据列表成功');
}));

/**
 * 获取凭据详情（不返回密码）
 * GET /api/credentials/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const doc = await Credential.findOne({ _id: req.params.id, user: req.user.userId })
    .select('account website notes createdAt updatedAt')
    .lean();

  if (!doc) return notFound(res, '凭据不存在');
  return success(res, doc, '获取凭据成功');
}));

/**
 * 显示明文密码（显式调用）
 * POST /api/credentials/:id/reveal
 */
router.post('/:id/reveal', asyncHandler(async (req, res) => {
  const doc = await Credential.findOne({ _id: req.params.id, user: req.user.userId })
    .select('+passwordEncrypted');
  if (!doc) return notFound(res, '凭据不存在');

  try {
    const password = decryptText(doc.passwordEncrypted);
    return success(res, { password }, '解密成功');
  } catch (e) {
    return error(res, '解密失败，请检查加密密钥配置', 500);
  }
}));

/**
 * 更新凭据（如果包含 password 则重新加密）
 * PUT /api/credentials/:id
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { account, password, website, notes } = req.body || {};

  const update = {};
  if (account !== undefined) update.account = String(account).trim();
  if (website !== undefined) update.website = String(website).trim();
  if (notes !== undefined) update.notes = notes ? String(notes).trim() : undefined;
  if (password !== undefined) update.passwordEncrypted = encryptText(String(password));

  const doc = await Credential.findOneAndUpdate(
    { _id: req.params.id, user: req.user.userId },
    { $set: update },
    { new: true }
  ).select('account website notes createdAt updatedAt');

  if (!doc) return notFound(res, '凭据不存在或无权限');
  return updated(res, doc, '凭据更新成功');
}));

/**
 * 删除凭据
 * DELETE /api/credentials/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const doc = await Credential.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
  if (!doc) return notFound(res, '凭据不存在或已删除');
  return deleted(res, '凭据删除成功');
}));

module.exports = router;


