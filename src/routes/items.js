/**
 * 装备查询路由
 * 提供英雄联盟装备数据查询功能
 */

const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { asyncHandler } = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * @route   GET /api/items
 * @desc    获取所有装备列表
 * @access  公开
 * @query   {string} search - 搜索关键词
 * @query   {string[]} tags - 装备标签过滤 (多个用逗号分隔)
 * @query   {string} map - 地图过滤 (sr, ha, aram)
 * @query   {number} minPrice - 最低价格
 * @query   {number} maxPrice - 最高价格
 * @query   {number} depth - 装备深度 (1-4)
 * @query   {boolean} purchasable - 是否可购买
 * @query   {boolean} mythic - 是否为神话装备
 * @query   {boolean} legendary - 是否为传说装备
 * @query   {boolean} boots - 是否为靴子
 * @query   {number} page - 页码 (默认1)
 * @query   {number} limit - 每页数量 (默认50)
 * @query   {string} sort - 排序字段 (name, gold.total, depth)
 * @query   {string} order - 排序方式 (asc, desc)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const {
      search,
      tags,
      map,
      minPrice,
      maxPrice,
      depth,
      purchasable,
      mythic,
      legendary,
      boots,
      sort = 'name',
      order = 'asc'
    } = req.query;

    // 构建查询条件
    const query = { isEnabled: true };

    // 搜索条件
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { plaintext: { $regex: search, $options: 'i' } }
      ];
    }

    // 标签过滤
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagArray };
    }

    // 地图过滤
    if (map && ['sr', 'ha', 'aram'].includes(map)) {
      query[`maps.${map}`] = true;
    }

    // 价格范围过滤
    if (minPrice || maxPrice) {
      query['gold.total'] = {};
      if (minPrice) query['gold.total'].$gte = parseInt(minPrice);
      if (maxPrice) query['gold.total'].$lte = parseInt(maxPrice);
    }

    // 装备深度过滤
    if (depth) {
      query.depth = parseInt(depth);
    }

    // 布尔值过滤
    if (purchasable !== undefined) {
      query['gold.purchasable'] = purchasable === 'true';
    }
    if (mythic !== undefined) {
      query.isMythic = mythic === 'true';
    }
    if (legendary !== undefined) {
      query.isLegendary = legendary === 'true';
    }
    if (boots !== undefined) {
      query.isBoots = boots === 'true';
    }

    // 排序参数
    const validSortFields = ['name', 'gold.total', 'depth', 'createdAt'];
    const sortField = validSortFields.includes(sort) ? sort : 'name';
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sortField]: sortOrder };

    try {
      // 执行查询
      const items = await Item.find(query)
        .select('riotId name description plaintext image gold tags maps depth isMythic isLegendary isBoots version')
        .sort(sortObj)
        .lean();

      res.json(successResponse('装备列表获取成功', {
        items,
        total: items.length,
        filters: {
          search,
          tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : null,
          map,
          priceRange: { min: minPrice, max: maxPrice },
          depth,
          purchasable,
          mythic,
          legendary,
          boots
        }
      }));

    } catch (error) {
      res.status(500).json(errorResponse('获取装备列表失败', error.message));
    }
  })
);

/**
 * @route   GET /api/items/:identifier
 * @desc    获取单个装备详情
 * @access  公开
 * @param   {string} identifier - 装备ID或riotId
 */
router.get(
  '/:identifier',
  asyncHandler(async (req, res) => {
    const { identifier } = req.params;

    try {
      // 尝试多种方式查找装备
      const query = {
        $or: [
          { _id: identifier },
          { riotId: identifier }
        ],
        isEnabled: true
      };

      const item = await Item.findOne(query).lean();

      if (!item) {
        return res.status(404).json(errorResponse('装备不存在'));
      }

      // 如果有合成路径，获取合成材料信息
      let fromItems = [];
      if (item.from && item.from.length > 0) {
        fromItems = await Item.find({
          riotId: { $in: item.from },
          isEnabled: true
        }).select('riotId name image gold.total').lean();
      }

      // 如果有升级路径，获取升级装备信息
      let intoItems = [];
      if (item.into && item.into.length > 0) {
        intoItems = await Item.find({
          riotId: { $in: item.into },
          isEnabled: true
        }).select('riotId name image gold.total').lean();
      }

      res.json(successResponse('装备详情获取成功', {
        ...item,
        fromItems,
        intoItems
      }));

    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(404).json(errorResponse('装备不存在'));
      }
      res.status(500).json(errorResponse('获取装备详情失败', error.message));
    }
  })
);

/**
 * @route   GET /api/items/tags/list
 * @desc    获取所有可用的装备标签
 * @access  公开
 */
router.get(
  '/tags/list',
  asyncHandler(async (req, res) => {
    try {
      // 聚合查询获取所有不重复的标签
      const tagsData = await Item.aggregate([
        { $match: { isEnabled: true } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        {
          $project: {
            _id: 0,
            tag: '$_id',
            count: 1
          }
        }
      ]);

      const tags = tagsData.map(item => item.tag);
      const tagStats = tagsData.reduce((acc, item) => {
        acc[item.tag] = item.count;
        return acc;
      }, {});

      res.json(successResponse('装备标签获取成功', {
        tags,
        stats: tagStats,
        total: tags.length
      }));

    } catch (error) {
      res.status(500).json(errorResponse('获取装备标签失败', error.message));
    }
  })
);

/**
 * @route   GET /api/items/map/:mapType
 * @desc    根据地图获取装备
 * @access  公开
 * @param   {string} mapType - 地图类型 (sr, ha, aram)
 */
router.get(
  '/map/:mapType',
  asyncHandler(async (req, res) => {
    const { mapType } = req.params;

    if (!['sr', 'ha', 'aram'].includes(mapType)) {
      return res.status(400).json(errorResponse('无效的地图类型，支持：sr, ha, aram'));
    }

    try {
      const items = await Item.getByMap(mapType)
        .select('riotId name description plaintext image gold tags depth isMythic isLegendary isBoots')
        .sort({ name: 1 })
        .lean();

      res.json(successResponse('按地图获取装备成功', {
        mapType,
        items,
        total: items.length
      }));

    } catch (error) {
      res.status(500).json(errorResponse('按地图获取装备失败', error.message));
    }
  })
);

/**
 * @route   GET /api/items/search/:keyword
 * @desc    搜索装备
 * @access  公开
 * @param   {string} keyword - 搜索关键词
 */
router.get(
  '/search/:keyword',
  asyncHandler(async (req, res) => {
    const { keyword } = req.params;

    if (!keyword || keyword.trim().length < 1) {
      return res.status(400).json(errorResponse('搜索关键词不能为空'));
    }

    try {
      const items = await Item.search(keyword.trim())
        .select('riotId name description plaintext image gold tags depth isMythic isLegendary isBoots')
        .limit(20)
        .lean();

      res.json(successResponse('装备搜索完成', {
        keyword: keyword.trim(),
        items,
        total: items.length
      }));

    } catch (error) {
      res.status(500).json(errorResponse('装备搜索失败', error.message));
    }
  })
);

/**
 * @route   GET /api/items/by-tags/:tags
 * @desc    根据标签获取装备
 * @access  公开
 * @param   {string} tags - 标签列表 (用逗号分隔)
 */
router.get(
  '/by-tags/:tags',
  asyncHandler(async (req, res) => {
    const { tags } = req.params;

    if (!tags) {
      return res.status(400).json(errorResponse('标签参数不能为空'));
    }

    try {
      const tagArray = tags.split(',').filter(tag => tag.trim());

      if (tagArray.length === 0) {
        return res.status(400).json(errorResponse('至少需要提供一个有效标签'));
      }

      const items = await Item.getByTags(tagArray)
        .select('riotId name description plaintext image gold tags depth isMythic isLegendary isBoots')
        .sort({ name: 1 })
        .lean();

      res.json(successResponse('按标签获取装备成功', {
        tags: tagArray,
        items,
        total: items.length
      }));

    } catch (error) {
      res.status(500).json(errorResponse('按标签获取装备失败', error.message));
    }
  })
);

/**
 * @route   GET /api/items/price-range/:minPrice/:maxPrice
 * @desc    根据价格范围获取装备
 * @access  公开
 * @param   {number} minPrice - 最低价格
 * @param   {number} maxPrice - 最高价格
 */
router.get(
  '/price-range/:minPrice/:maxPrice',
  asyncHandler(async (req, res) => {
    const { minPrice, maxPrice } = req.params;

    const min = parseInt(minPrice);
    const max = parseInt(maxPrice);

    if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
      return res.status(400).json(errorResponse('价格参数无效'));
    }

    try {
      const items = await Item.getByPriceRange(min, max)
        .select('riotId name description plaintext image gold tags depth isMythic isLegendary isBoots')
        .sort({ 'gold.total': 1 })
        .lean();

      res.json(successResponse('按价格范围获取装备成功', {
        priceRange: { min, max },
        items,
        total: items.length
      }));

    } catch (error) {
      res.status(500).json(errorResponse('按价格范围获取装备失败', error.message));
    }
  })
);

/**
 * @route   GET /api/items/purchasable
 * @desc    获取所有可购买装备
 * @access  公开
 */
router.get(
  '/purchasable',
  asyncHandler(async (req, res) => {
    try {
      const items = await Item.getPurchasable()
        .select('riotId name description plaintext image gold tags depth isMythic isLegendary isBoots')
        .sort({ 'gold.total': 1 })
        .lean();

      res.json(successResponse('可购买装备获取成功', {
        items,
        total: items.length
      }));

    } catch (error) {
      res.status(500).json(errorResponse('获取可购买装备失败', error.message));
    }
  })
);

/**
 * @route   GET /api/items/stats/summary
 * @desc    获取装备统计信息
 * @access  公开
 */
router.get(
  '/stats/summary',
  asyncHandler(async (req, res) => {
    try {
      // 并行执行多个统计查询
      const [
        totalCount,
        enabledCount,
        purchasableCount,
        mythicCount,
        legendaryCount,
        bootsCount,
        tagStats,
        depthStats,
        priceStats,
        mapStats,
        versionStats
      ] = await Promise.all([
        // 总装备数
        Item.countDocuments(),

        // 启用的装备数
        Item.countDocuments({ isEnabled: true }),

        // 可购买装备数
        Item.countDocuments({ 'gold.purchasable': true, isEnabled: true }),

        // 神话装备数
        Item.countDocuments({ isMythic: true, isEnabled: true }),

        // 传说装备数
        Item.countDocuments({ isLegendary: true, isEnabled: true }),

        // 靴子数
        Item.countDocuments({ isBoots: true, isEnabled: true }),

        // 标签统计
        Item.aggregate([
          { $match: { isEnabled: true } },
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // 深度统计
        Item.aggregate([
          { $match: { isEnabled: true } },
          {
            $group: {
              _id: '$depth',
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),

        // 价格统计
        Item.aggregate([
          { $match: { isEnabled: true, 'gold.purchasable': true } },
          {
            $group: {
              _id: null,
              avgPrice: { $avg: '$gold.total' },
              minPrice: { $min: '$gold.total' },
              maxPrice: { $max: '$gold.total' }
            }
          }
        ]),

        // 地图统计
        Item.aggregate([
          { $match: { isEnabled: true } },
          {
            $project: {
              sr: '$maps.sr',
              ha: '$maps.ha',
              aram: '$maps.aram'
            }
          },
          {
            $group: {
              _id: null,
              srCount: { $sum: { $cond: ['$sr', 1, 0] } },
              haCount: { $sum: { $cond: ['$ha', 1, 0] } },
              aramCount: { $sum: { $cond: ['$aram', 1, 0] } }
            }
          }
        ]),

        // 版本统计
        Item.aggregate([
          { $match: { isEnabled: true } },
          {
            $group: {
              _id: '$version',
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: -1 } }
        ])
      ]);

      const priceStatsData = priceStats[0] || { avgPrice: 0, minPrice: 0, maxPrice: 0 };
      const mapStatsData = mapStats[0] || { srCount: 0, haCount: 0, aramCount: 0 };

      res.json(successResponse('装备统计信息获取成功', {
        total: {
          all: totalCount,
          enabled: enabledCount,
          disabled: totalCount - enabledCount,
          purchasable: purchasableCount,
          mythic: mythicCount,
          legendary: legendaryCount,
          boots: bootsCount
        },
        byTags: tagStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byDepth: depthStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        priceStats: {
          average: Math.round(priceStatsData.avgPrice || 0),
          min: priceStatsData.minPrice || 0,
          max: priceStatsData.maxPrice || 0
        },
        byMap: {
          sr: mapStatsData.srCount,
          ha: mapStatsData.haCount,
          aram: mapStatsData.aramCount
        },
        byVersion: versionStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        lastUpdated: new Date().toISOString()
      }));

    } catch (error) {
      res.status(500).json(errorResponse('获取装备统计信息失败', error.message));
    }
  })
);

module.exports = router;