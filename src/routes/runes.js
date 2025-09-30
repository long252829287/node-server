/**
 * 符文查询路由
 * 提供英雄联盟符文数据查询功能
 */

const express = require('express');
const router = express.Router();
const Rune = require('../models/Rune');
const { asyncHandler } = require('../utils/asyncHandler');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * @route   GET /api/runes
 * @desc    获取所有符文树列表
 * @access  公开
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const runeTrees = await Rune.getAllTrees();

      res.json(successResponse('符文树列表获取成功', {
        runeTrees,
        total: runeTrees.length
      }));

    } catch (error) {
      res.status(500).json(errorResponse('获取符文树列表失败', error.message));
    }
  })
);

/**
 * @route   GET /api/runes/:treeId
 * @desc    获取指定符文树详情
 * @access  公开
 * @param   {string} treeId - 符文树 ID
 */
router.get(
  '/:treeId',
  asyncHandler(async (req, res) => {
    const { treeId } = req.params;

    try {
      const runeTree = await Rune.getTreeById(treeId);

      if (!runeTree) {
        return res.status(404).json(errorResponse('符文树不存在'));
      }

      res.json(successResponse('符文树详情获取成功', runeTree));

    } catch (error) {
      res.status(500).json(errorResponse('获取符文树详情失败', error.message));
    }
  })
);

/**
 * @route   GET /api/runes/rune/:runeId
 * @desc    获取指定符文详情
 * @access  公开
 * @param   {string} runeId - 符文 ID
 */
router.get(
  '/rune/:runeId',
  asyncHandler(async (req, res) => {
    const { runeId } = req.params;

    try {
      const rune = await Rune.getRuneById(runeId);

      if (!rune) {
        return res.status(404).json(errorResponse('符文不存在'));
      }

      res.json(successResponse('符文详情获取成功', rune));

    } catch (error) {
      res.status(500).json(errorResponse('获取符文详情失败', error.message));
    }
  })
);

/**
 * @route   POST /api/runes/validate
 * @desc    验证符文配置是否合法
 * @access  公开
 * @body    {string} primaryTreeId - 主系符文树 ID
 * @body    {string[]} primaryRuneIds - 主系符文 ID 列表（4个）
 * @body    {string} secondaryTreeId - 副系符文树 ID
 * @body    {string[]} secondaryRuneIds - 副系符文 ID 列表（2个）
 */
router.post(
  '/validate',
  asyncHandler(async (req, res) => {
    const {
      primaryTreeId,
      primaryRuneIds,
      secondaryTreeId,
      secondaryRuneIds
    } = req.body;

    // 基础验证
    if (!primaryTreeId || !secondaryTreeId) {
      return res.status(400).json(errorResponse('主系和副系符文树 ID 不能为空'));
    }

    if (!Array.isArray(primaryRuneIds) || !Array.isArray(secondaryRuneIds)) {
      return res.status(400).json(errorResponse('符文 ID 列表必须是数组'));
    }

    try {
      // 调用模型验证方法
      const result = await Rune.validateRuneConfig(
        primaryTreeId,
        primaryRuneIds,
        secondaryTreeId,
        secondaryRuneIds
      );

      if (result.valid) {
        res.json(successResponse('符文配置验证通过', { valid: true }));
      } else {
        res.status(400).json(errorResponse(result.error));
      }

    } catch (error) {
      res.status(500).json(errorResponse('符文配置验证失败', error.message));
    }
  })
);

/**
 * @route   GET /api/runes/trees/names
 * @desc    获取所有符文树的名称和 ID（简化版）
 * @access  公开
 */
router.get(
  '/trees/names',
  asyncHandler(async (req, res) => {
    try {
      const runeTrees = await Rune.find({ isEnabled: true })
        .select('id name icon')
        .lean();

      res.json(successResponse('符文树名称列表获取成功', {
        trees: runeTrees,
        total: runeTrees.length
      }));

    } catch (error) {
      res.status(500).json(errorResponse('获取符文树名称列表失败', error.message));
    }
  })
);

/**
 * @route   GET /api/runes/stats/summary
 * @desc    获取符文统计信息
 * @access  公开
 */
router.get(
  '/stats/summary',
  asyncHandler(async (req, res) => {
    try {
      const runeTrees = await Rune.find({ isEnabled: true }).lean();

      const stats = {
        totalTrees: runeTrees.length,
        totalRunes: 0,
        treeDetails: []
      };

      runeTrees.forEach(tree => {
        let treeRuneCount = 0;
        tree.slots.forEach(slot => {
          treeRuneCount += slot.runes.length;
        });

        stats.totalRunes += treeRuneCount;
        stats.treeDetails.push({
          id: tree.id,
          name: tree.name,
          runeCount: treeRuneCount,
          slotCount: tree.slots.length
        });
      });

      res.json(successResponse('符文统计信息获取成功', stats));

    } catch (error) {
      res.status(500).json(errorResponse('获取符文统计信息失败', error.message));
    }
  })
);

module.exports = router;