/**
 * 攻略管理路由
 * 提供英雄出装攻略的CRUD功能
 */

const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Strategy = require('../models/Strategy')
const Champion = require('../models/Champion')
const Item = require('../models/Item')
const Rune = require('../models/Rune')
const { asyncHandler } = require('../utils/asyncHandler')
const { successResponse, errorResponse } = require('../utils/response')
const { protect: authMiddleware } = require('../middleware/authMiddleware')

/**
 * @route   GET /api/strategies
 * @desc    获取攻略列表
 * @access  公开
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const {
      championKey,
      mapType,
      creatorId,
      search,
      isRecommended,
      sort = 'createdAt',
      order = 'desc',
    } = req.query

    // 构建查询条件
    const query = {
      status: 'published',
      isPublic: true,
    }

    // 英雄过滤
    if (championKey) {
      query.championKey = championKey
    }

    // 地图过滤
    if (mapType && ['sr', 'aram', 'both'].includes(mapType)) {
      query.$or = [{ mapType }, { mapType: 'both' }]
    }

    // 创建者过滤
    if (creatorId) {
      query.creator = creatorId
    }

    // 搜索过滤
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { championName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    // 推荐攻略过滤
    if (isRecommended === 'true') {
      query.isRecommended = true
    }

    // 排序参数
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'stats.viewCount',
      'stats.favoriteCount',
      'stats.likeCount',
    ]
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt'
    const sortOrder = order === 'asc' ? 1 : -1
    const sortObj = { [sortField]: sortOrder }

    try {
      const strategies = await Strategy.find(query)
        .populate('champion', 'key name images.square')
        .populate('items.item', 'name image gold.total')
        .populate('creator', 'username profile.displayName')
        .select('-items.item.description') // 减少数据传输
        .sort(sortObj)
        .lean()

      res.json(
        successResponse('攻略列表获取成功', {
          strategies,
          total: strategies.length,
        })
      )
    } catch (error) {
      res.status(500).json(errorResponse('获取攻略列表失败', error.message))
    }
  })
)

/**
 * @route   POST /api/strategies
 * @desc    创建新攻略
 * @access  需要认证
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { title, championId, items, runes, mapType = 'sr', description, tags = [] } = req.body

    // 验证必填字段
    if (!championId) {
      return res.status(400).json(errorResponse('必须选择一个英雄'))
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json(errorResponse('必须至少选择一个装备'))
    }

    if (items.length > 6) {
      return res.status(400).json(errorResponse('装备数量不能超过6个'))
    }

    try {
      // 验证英雄存在
      const champion = await Champion.findById(championId)
      if (!champion) {
        return res.status(404).json(errorResponse('英雄不存在'))
      }

      // 验证装备存在并获取装备信息
      const itemIds = items.map((item) => item.itemId)
      const validItems = await Item.find({
        _id: { $in: itemIds },
        isEnabled: true,
      })

      if (validItems.length !== itemIds.length) {
        return res.status(400).json(errorResponse('包含无效的装备'))
      }

      // 构建装备列表
      const strategyItems = items.map((item, index) => {
        const itemData = validItems.find((i) => i._id.toString() === item.itemId)
        return {
          item: itemData._id,
          itemName: itemData.name,
          itemImage: itemData.image,
          position: item.position || index + 1,
        }
      })

      // 验证装备位置唯一性
      const positions = strategyItems.map((item) => item.position)
      const uniquePositions = [...new Set(positions)]
      if (positions.length !== uniquePositions.length) {
        return res.status(400).json(errorResponse('装备位置不能重复'))
      }

      // 验证并构建符文配置
      let runeConfig = null
      if (runes && runes.primaryTreeId && runes.secondaryTreeId) {
        // 验证符文配置
        const primaryRuneIds = runes.primaryRunes?.map((r) => r.id) || []
        const secondaryRuneIds = runes.secondaryRunes?.map((r) => r.id) || []

        const validation = await Rune.validateRuneConfig(
          runes.primaryTreeId,
          primaryRuneIds,
          runes.secondaryTreeId,
          secondaryRuneIds
        )

        if (!validation.valid) {
          return res.status(400).json(errorResponse(validation.error))
        }

        // 获取符文树信息
        const [primaryTree, secondaryTree] = await Promise.all([
          Rune.getTreeById(runes.primaryTreeId),
          Rune.getTreeById(runes.secondaryTreeId),
        ])

        // 构建符文配置
        runeConfig = {
          primaryTreeId: primaryTree.id,
          primaryTreeName: primaryTree.name,
          primaryTreeIcon: primaryTree.icon,
          primaryRunes: runes.primaryRunes || [],
          secondaryTreeId: secondaryTree.id,
          secondaryTreeName: secondaryTree.name,
          secondaryTreeIcon: secondaryTree.icon,
          secondaryRunes: runes.secondaryRunes || [],
        }
      }

      // 创建攻略
      const strategy = new Strategy({
        title,
        champion: championId,
        items: strategyItems,
        runes: runeConfig,
        mapType,
        description,
        tags,
        creator: req.user._id,
      })

      await strategy.save()

      // 加载关联数据并返回
      await strategy.populate([
        { path: 'champion', select: 'key name images.square' },
        { path: 'items.item', select: 'name image gold.total' },
        { path: 'creator', select: 'username profile.displayName' },
      ])

      res.status(201).json(successResponse('攻略创建成功', strategy))
    } catch (error) {
      res.status(500).json(errorResponse('创建攻略失败', error.message))
    }
  })
)

/**
 * @route   GET /api/strategies/my
 * @desc    获取当前用户的攻略（包括私有）
 * @access  需要认证
 */
router.get(
  '/my',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { status } = req.query

    try {
      // 构建查询条件
      const query = { creator: req.user._id }
      if (status && ['draft', 'published', 'archived'].includes(status)) {
        query.status = status
      }

      const strategies = await Strategy.find(query)
        .populate('champion', 'key name images.square')
        .populate('items.item', 'name image gold.total')
        .sort({ updatedAt: -1 })
        .lean()

      res.json(
        successResponse('我的攻略获取成功', {
          strategies,
          total: strategies.length,
        })
      )
    } catch (error) {
      res.status(500).json(errorResponse('获取我的攻略失败', error.message))
    }
  })
)

/**
 * @route   GET /api/strategies/:id
 * @desc    获取攻略详情
 * @access  公开
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params

    try {
      const strategy = await Strategy.findById(id)
        .populate('champion', 'key name title description images tags stats.difficulty')
        .populate('items.item', 'name description plaintext image gold tags depth')
        .populate('creator', 'username profile.displayName profile.avatar')
        .lean()

      if (!strategy) {
        return res.status(404).json(errorResponse('攻略不存在'))
      }

      // 增加查看次数（异步执行，不影响响应）
      Strategy.findByIdAndUpdate(id, {
        $inc: { 'stats.viewCount': 1 },
      })
        .exec()
        .catch(console.error)

      res.json(successResponse('攻略详情获取成功', strategy))
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(404).json(errorResponse('攻略不存在'))
      }
      res.status(500).json(errorResponse('获取攻略详情失败', error.message))
    }
  })
)

/**
 * @route   PUT /api/strategies/:id
 * @desc    更新攻略
 * @access  需要认证，仅创建者可修改
 */
router.put(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { title, championId, items, runes, mapType, description, tags, isPublic } = req.body

    try {
      const strategy = await Strategy.findById(id)

      if (!strategy) {
        return res.status(404).json(errorResponse('攻略不存在'))
      }

      // 检查权限
      if (strategy.creator.toString() !== req.user._id.toString()) {
        return res.status(403).json(errorResponse('只能修改自己创建的攻略'))
      }

      // 更新基础字段
      if (title !== undefined) strategy.title = title
      if (mapType !== undefined) strategy.mapType = mapType
      if (description !== undefined) strategy.description = description
      if (tags !== undefined) strategy.tags = tags
      if (isPublic !== undefined) strategy.isPublic = isPublic

      // 更新英雄
      if (championId && championId !== strategy.champion.toString()) {
        const champion = await Champion.findById(championId)
        if (!champion) {
          return res.status(404).json(errorResponse('英雄不存在'))
        }
        strategy.champion = championId
      }

      // 更新装备列表
      if (items && Array.isArray(items)) {
        if (items.length === 0) {
          return res.status(400).json(errorResponse('必须至少选择一个装备'))
        }

        if (items.length > 6) {
          return res.status(400).json(errorResponse('装备数量不能超过6个'))
        }

        // 验证装备存在
        const itemIds = items.map((item) => item.itemId)
        const validItems = await Item.find({
          _id: { $in: itemIds },
          isEnabled: true,
        })

        if (validItems.length !== itemIds.length) {
          return res.status(400).json(errorResponse('包含无效的装备'))
        }

        // 构建装备列表
        const strategyItems = items.map((item, index) => {
          const itemData = validItems.find((i) => i._id.toString() === item.itemId)
          return {
            item: itemData._id,
            itemName: itemData.name,
            itemImage: itemData.image,
            position: item.position || index + 1,
          }
        })

        // 验证装备位置唯一性
        const positions = strategyItems.map((item) => item.position)
        const uniquePositions = [...new Set(positions)]
        if (positions.length !== uniquePositions.length) {
          return res.status(400).json(errorResponse('装备位置不能重复'))
        }

        strategy.items = strategyItems
      }

      // 更新符文配置
      if (runes !== undefined) {
        if (runes && runes.primaryTreeId && runes.secondaryTreeId) {
          // 验证符文配置
          const primaryRuneIds = runes.primaryRunes?.map((r) => r.id) || []
          const secondaryRuneIds = runes.secondaryRunes?.map((r) => r.id) || []

          const validation = await Rune.validateRuneConfig(
            runes.primaryTreeId,
            primaryRuneIds,
            runes.secondaryTreeId,
            secondaryRuneIds
          )

          if (!validation.valid) {
            return res.status(400).json(errorResponse(validation.error))
          }

          // 获取符文树信息
          const [primaryTree, secondaryTree] = await Promise.all([
            Rune.getTreeById(runes.primaryTreeId),
            Rune.getTreeById(runes.secondaryTreeId),
          ])

          // 构建符文配置
          strategy.runes = {
            primaryTreeId: primaryTree.id,
            primaryTreeName: primaryTree.name,
            primaryTreeIcon: primaryTree.icon,
            primaryRunes: runes.primaryRunes || [],
            secondaryTreeId: secondaryTree.id,
            secondaryTreeName: secondaryTree.name,
            secondaryTreeIcon: secondaryTree.icon,
            secondaryRunes: runes.secondaryRunes || [],
          }
        } else {
          // 清除符文配置
          strategy.runes = undefined
        }
      }

      await strategy.save()

      // 加载关联数据并返回
      await strategy.populate([
        { path: 'champion', select: 'key name images.square' },
        { path: 'items.item', select: 'name image gold.total' },
        { path: 'creator', select: 'username profile.displayName' },
      ])

      res.json(successResponse('攻略更新成功', strategy))
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(404).json(errorResponse('攻略不存在'))
      }
      res.status(500).json(errorResponse('更新攻略失败', error.message))
    }
  })
)

/**
 * @route   DELETE /api/strategies/:id
 * @desc    删除攻略
 * @access  需要认证，仅创建者可删除
 */
router.delete(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params

    try {
      const strategy = await Strategy.findById(id)

      if (!strategy) {
        return res.status(404).json(errorResponse('攻略不存在'))
      }

      // 检查权限
      if (strategy.creator.toString() !== req.user._id.toString()) {
        return res.status(403).json(errorResponse('只能删除自己创建的攻略'))
      }

      await Strategy.findByIdAndDelete(id)

      res.json(successResponse('攻略删除成功'))
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(404).json(errorResponse('攻略不存在'))
      }
      res.status(500).json(errorResponse('删除攻略失败', error.message))
    }
  })
)

/**
 * @route   GET /api/strategies/champion/:championKey
 * @desc    获取指定英雄的攻略列表
 * @access  公开
 */
router.get(
  '/champion/:championKey',
  asyncHandler(async (req, res) => {
    const { championKey } = req.params
    const { mapType } = req.query

    try {
      const strategies = await Strategy.getByChampion(championKey, mapType)

      res.json(
        successResponse('英雄攻略获取成功', {
          championKey,
          strategies,
          total: strategies.length,
        })
      )
    } catch (error) {
      res.status(500).json(errorResponse('获取英雄攻略失败', error.message))
    }
  })
)

/**
 * @route   GET /api/strategies/popular
 * @desc    获取热门攻略
 * @access  公开
 */
router.get(
  '/popular',
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query

    try {
      const strategies = await Strategy.getPopular(parseInt(limit))

      res.json(
        successResponse('热门攻略获取成功', {
          strategies,
          total: strategies.length,
        })
      )
    } catch (error) {
      res.status(500).json(errorResponse('获取热门攻略失败', error.message))
    }
  })
)

/**
 * @route   GET /api/strategies/recommended
 * @desc    获取推荐攻略
 * @access  公开
 */
router.get(
  '/recommended',
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query

    try {
      const strategies = await Strategy.getRecommended(parseInt(limit))

      res.json(
        successResponse('推荐攻略获取成功', {
          strategies,
          total: strategies.length,
        })
      )
    } catch (error) {
      res.status(500).json(errorResponse('获取推荐攻略失败', error.message))
    }
  })
)

/**
 * @route   GET /api/strategies/user/:userId
 * @desc    获取用户创建的攻略
 * @access  公开（但只返回公开攻略）
 */
router.get(
  '/user/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params

    try {
      const strategies = await Strategy.getByCreator(userId, false)

      res.json(
        successResponse('用户攻略获取成功', {
          strategies,
          total: strategies.length,
        })
      )
    } catch (error) {
      res.status(500).json(errorResponse('获取用户攻略失败', error.message))
    }
  })
)

/**
 * @route   POST /api/strategies/:id/like
 * @desc    点赞/取消点赞攻略
 * @access  需要认证
 */
router.post(
  '/:id/like',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params

    try {
      const strategy = await Strategy.findById(id)

      if (!strategy) {
        return res.status(404).json(errorResponse('攻略不存在'))
      }

      // 这里可以实现点赞逻辑，可能需要一个用户点赞记录表
      // 简单起见，这里只是增加点赞数
      await strategy.incrementLikeCount()

      res.json(
        successResponse('点赞成功', {
          likeCount: strategy.stats.likeCount + 1,
        })
      )
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(404).json(errorResponse('攻略不存在'))
      }
      res.status(500).json(errorResponse('点赞失败', error.message))
    }
  })
)

module.exports = router
