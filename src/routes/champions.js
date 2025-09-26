/**
 * 英雄查询路由
 * 提供英雄联盟英雄数据查询功能
 */

const express = require('express');
const router = express.Router();
const Champion = require('../models/Champion');
const { asyncHandler } = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * @route   GET /api/champions
 * @desc    获取所有英雄列表
 * @access  公开
 * @query   {string} search - 搜索关键词
 * @query   {string[]} tags - 英雄标签过滤 (多个用逗号分隔)
 * @query   {number} page - 页码 (默认1)
 * @query   {number} limit - 每页数量 (默认50)
 * @query   {string} sort - 排序字段 (name, createdAt)
 * @query   {string} order - 排序方式 (asc, desc)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const {
      search,
      tags,
      page = 1,
      limit = 50,
      sort = 'name',
      order = 'asc'
    } = req.query;

    // 构建查询条件
    const query = { isEnabled: true };

    // 搜索条件
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { key: { $regex: search, $options: 'i' } }
      ];
    }

    // 标签过滤
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagArray };
    }

    // 分页参数
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // 排序参数
    const sortField = ['name', 'createdAt', 'key'].includes(sort) ? sort : 'name';
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sortField]: sortOrder };

    try {
      // 执行查询
      const [champions, total] = await Promise.all([
        Champion.find(query)
          .select('riotId key name title description images tags stats.difficulty version')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Champion.countDocuments(query)
      ]);

      // 计算分页信息
      const totalPages = Math.ceil(total / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      res.json(successResponse('英雄列表获取成功', {
        champions,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount: total,
          limit: limitNum,
          hasNext,
          hasPrev
        }
      }));

    } catch (error) {
      res.status(500).json(errorResponse('获取英雄列表失败', error.message));
    }
  })
);

/**
 * @route   GET /api/champions/:identifier
 * @desc    获取单个英雄详情
 * @access  公开
 * @param   {string} identifier - 英雄ID、key或riotId
 */
router.get(
  '/:identifier',
  asyncHandler(async (req, res) => {
    const { identifier } = req.params;

    try {
      // 尝试多种方式查找英雄
      const query = {
        $or: [
          { _id: identifier },
          { key: identifier },
          { riotId: identifier }
        ],
        isEnabled: true
      };

      const champion = await Champion.findOne(query).lean();

      if (!champion) {
        return res.status(404).json(errorResponse('英雄不存在'));
      }

      res.json(successResponse('英雄详情获取成功', champion));

    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(404).json(errorResponse('英雄不存在'));
      }
      res.status(500).json(errorResponse('获取英雄详情失败', error.message));
    }
  })
);

/**
 * @route   GET /api/champions/tags/list
 * @desc    获取所有可用的英雄标签
 * @access  公开
 */
router.get(
  '/tags/list',
  asyncHandler(async (req, res) => {
    try {
      // 聚合查询获取所有不重复的标签
      const tagsData = await Champion.aggregate([
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

      res.json(successResponse('英雄标签获取成功', {
        tags,
        stats: tagStats,
        total: tags.length
      }));

    } catch (error) {
      res.status(500).json(errorResponse('获取英雄标签失败', error.message));
    }
  })
);

/**
 * @route   GET /api/champions/search/:keyword
 * @desc    搜索英雄
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
      const champions = await Champion.search(keyword.trim())
        .select('riotId key name title description images tags stats.difficulty')
        .limit(20)
        .lean();

      res.json(successResponse('英雄搜索完成', {
        keyword: keyword.trim(),
        champions,
        total: champions.length
      }));

    } catch (error) {
      res.status(500).json(errorResponse('英雄搜索失败', error.message));
    }
  })
);

/**
 * @route   GET /api/champions/by-tags/:tags
 * @desc    根据标签获取英雄
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

      const champions = await Champion.getByTags(tagArray)
        .select('riotId key name title description images tags stats.difficulty')
        .sort({ name: 1 })
        .lean();

      res.json(successResponse('按标签获取英雄成功', {
        tags: tagArray,
        champions,
        total: champions.length
      }));

    } catch (error) {
      res.status(500).json(errorResponse('按标签获取英雄失败', error.message));
    }
  })
);

/**
 * @route   GET /api/champions/stats/summary
 * @desc    获取英雄统计信息
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
        tagStats,
        difficultyStats,
        versionStats
      ] = await Promise.all([
        // 总英雄数
        Champion.countDocuments(),

        // 启用的英雄数
        Champion.countDocuments({ isEnabled: true }),

        // 标签统计
        Champion.aggregate([
          { $match: { isEnabled: true } },
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),

        // 难度统计
        Champion.aggregate([
          { $match: { isEnabled: true } },
          {
            $group: {
              _id: '$stats.difficulty',
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),

        // 版本统计
        Champion.aggregate([
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

      res.json(successResponse('英雄统计信息获取成功', {
        total: {
          all: totalCount,
          enabled: enabledCount,
          disabled: totalCount - enabledCount
        },
        byTags: tagStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byDifficulty: difficultyStats.reduce((acc, item) => {
          acc[item._id || 'unknown'] = item.count;
          return acc;
        }, {}),
        byVersion: versionStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        lastUpdated: new Date().toISOString()
      }));

    } catch (error) {
      res.status(500).json(errorResponse('获取英雄统计信息失败', error.message));
    }
  })
);

module.exports = router;