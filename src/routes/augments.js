/**
 * 海克斯强化查询路由
 * 提供海克斯强化（Augments）列表查询功能
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const Augment = require('../models/Augment');
const { asyncHandler } = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/response');
const { readFirstJson } = require('../utils/localJsonCache');

const coerceString = (value) => String(value ?? '').trim();

const normalizeFallbackAugment = (raw, meta) => {
  if (!raw) return null;
  const augmentId = raw.id !== undefined ? coerceString(raw.id) : '';
  if (!augmentId) return null;

  const name = coerceString(raw.nameTRA || raw.name);
  const icon = coerceString(raw.augmentSmallIconPath || raw.icon);
  const rarity = coerceString(raw.rarity);
  if (!name || !rarity) return null;

  return {
    augmentId,
    name,
    icon,
    rarity,
    version: coerceString(meta?.version),
    sourceUrl: coerceString(meta?.sourceUrl),
  };
};

const fallbackAugmentData = () => {
  const data = readFirstJson([
    path.join(__dirname, '../assets/json/lol/augment.json'),
  ]);

  const list = Array.isArray(data?.augments) ? data.augments : Array.isArray(data) ? data : [];
  const meta = {
    version: data?.syncId || data?.scraped_at || data?.updatedAt || data?.version || 'local',
    sourceUrl: data?.sourceUrl || data?.source || '',
  };

  const augments = list.map((a) => normalizeFallbackAugment(a, meta)).filter(Boolean);
  return { augments, meta };
};

/**
 * @route   GET /api/augments
 * @desc    获取海克斯强化列表
 * @access  公开
 * @query   {string} search - 搜索关键词（匹配强化名/ID）
 * @query   {string} rarity - 稀有度过滤（silver/gold/prismatic）
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, rarity } = req.query;

    const query = { isEnabled: true };
    const resolvedRarity = rarity ? coerceString(rarity).toLowerCase() : '';
    if (resolvedRarity && ['silver', 'gold', 'prismatic'].includes(resolvedRarity)) {
      query.rarity = resolvedRarity;
    }

    if (search) {
      const keyword = coerceString(search);
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { nameTRA: { $regex: keyword, $options: 'i' } },
        { augmentId: { $regex: keyword, $options: 'i' } },
        { id: { $regex: keyword, $options: 'i' } },
        { riotId: { $regex: keyword, $options: 'i' } },
      ];
    }

    try {
      const docs = await Augment.find(query)
        .select('augmentId id riotId name nameTRA icon augmentSmallIconPath iconSmall iconLarge rarity version sourceUrl')
        .sort({ rarity: 1, name: 1 })
        .lean();

      if (docs.length > 0) {
        const augments = docs
          .map((doc) => ({
            augmentId: coerceString(doc.augmentId || doc.id || doc.riotId),
            name: coerceString(doc.name || doc.nameTRA),
            icon: coerceString(doc.icon || doc.augmentSmallIconPath),
            iconSmall: coerceString(doc.iconSmall),
            iconLarge: coerceString(doc.iconLarge),
            rarity: coerceString(doc.rarity),
          }))
          .filter((a) => a.augmentId && a.name);

        return res.json(
          successResponse('海克斯强化列表获取成功', {
            augments,
            total: augments.length,
            version: coerceString(docs[0]?.version),
          })
        );
      }

      const fallback = fallbackAugmentData();
      let list = fallback.augments;

      if (resolvedRarity) {
        list = list.filter((a) => a.rarity === resolvedRarity);
      }
      if (search) {
        const re = new RegExp(coerceString(search), 'i');
        list = list.filter((a) => re.test(a.name || '') || re.test(a.augmentId || ''));
      }

      return res.json(
        successResponse('海克斯强化列表获取成功（本地回退）', {
          augments: list.map(({ augmentId, name, icon, rarity }) => ({ augmentId, name, icon, rarity })),
          total: list.length,
          version: coerceString(fallback.meta?.version),
        })
      );
    } catch (error) {
      const fallback = fallbackAugmentData();
      if (fallback.augments.length > 0) {
        return res.json(
          successResponse('海克斯强化列表获取成功（本地回退）', {
            augments: fallback.augments.map(({ augmentId, name, icon, rarity }) => ({ augmentId, name, icon, rarity })),
            total: fallback.augments.length,
            version: coerceString(fallback.meta?.version),
          })
        );
      }
      res.status(500).json(errorResponse('获取海克斯强化列表失败', error.message));
    }
  })
);

module.exports = router;
