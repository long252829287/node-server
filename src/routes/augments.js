/**
 * 强化（Augments）查询路由
 * 提供强化池查询与详情接口（支持海克斯大乱斗 hex_brawl）
 */

const express = require('express');
const router = express.Router();

const Augment = require('../models/Augment');
const { asyncHandler } = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/response');

const parseStringArray = (value) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
};

const parseBoolean = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const normalizeTier = (value) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  if (text === '0') return 'silver';
  if (text === '1') return 'gold';
  if (text === '2') return 'prismatic';
  const lowered = text.toLowerCase();
  if (lowered === 'ksilver' || lowered === 'silver') return 'silver';
  if (lowered === 'kgold' || lowered === 'gold') return 'gold';
  if (lowered === 'kprismatic' || lowered === 'prismatic') return 'prismatic';
  return text;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @route   GET /api/augments
 * @desc    获取强化池列表
 * @access  公开
 * @query   {string} mode - 模式过滤 (sr, aram, hex_brawl)
 * @query   {string} search - 搜索关键词（name/description）
 * @query   {string|string[]} tags - 标签过滤（多个用逗号分隔）
 * @query   {string|number} tier - 稀有度/层级过滤
 * @query   {boolean} isActive - 是否启用（默认 true）
 * @query   {number} limit - 返回数量（默认 50，最大 200）
 * @query   {number} offset - 偏移量（默认 0）
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { mode, search, tags, tier } = req.query;

    const isActive = parseBoolean(req.query.isActive);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10) || 0, 0);

    const query = {};
    const andConditions = [];

    // 默认只返回启用数据
    query.isActive = isActive === undefined ? true : isActive;

    if (mode) {
      andConditions.push({ modes: String(mode).trim() });
    }

    const tagArray = parseStringArray(tags);
    if (tagArray.length > 0) {
      andConditions.push({ tags: { $in: tagArray } });
    }

    if (tier !== undefined && tier !== null && String(tier).trim() !== '') {
      query.tier = normalizeTier(tier);
    }

    if (search) {
      const keyword = escapeRegExp(search);
      andConditions.push({
        $or: [{ name: { $regex: keyword, $options: 'i' } }, { description: { $regex: keyword, $options: 'i' } }],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    try {
      const [total, augments] = await Promise.all([
        Augment.countDocuments(query),
        Augment.find(query)
          .select('-_id -__v')
          .sort({ tier: 1, name: 1 })
          .skip(offset)
          .limit(limit)
          .lean(),
      ]);

      const normalizedAugments = augments.map((a) => ({
        ...a,
        tier: normalizeTier(a.tier) || a.tier,
      }));

      res.json(
        successResponse('强化池获取成功', {
          augments: normalizedAugments,
          total,
        })
      );
    } catch (error) {
      res.status(500).json(errorResponse('获取强化池失败', error.message));
    }
  })
);

/**
 * @route   GET /api/augments/:augmentId
 * @desc    获取强化详情
 * @access  公开
 */
router.get(
  '/:augmentId',
  asyncHandler(async (req, res) => {
    const { augmentId } = req.params;

    try {
      const augment = await Augment.findOne({ augmentId: String(augmentId).trim() }).select('-_id -__v').lean();

      if (!augment) {
        return res.status(404).json(errorResponse('强化不存在'));
      }

      res.json(
        successResponse('强化详情获取成功', {
          ...augment,
          tier: normalizeTier(augment.tier) || augment.tier,
        })
      );
    } catch (error) {
      res.status(500).json(errorResponse('获取强化详情失败', error.message));
    }
  })
);

module.exports = router;
