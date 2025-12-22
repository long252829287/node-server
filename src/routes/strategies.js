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
const HexItem = require('../models/HexItem')
const Rune = require('../models/Rune')
const { asyncHandler } = require('../utils/asyncHandler')
const { successResponse, errorResponse } = require('../utils/response')
const { protect: authMiddleware } = require('../middleware/authMiddleware')

const normalizeString = (value) => String(value ?? '').trim()

const normalizeStringArray = (value) => {
  if (!value) return []
  const raw = Array.isArray(value) ? value : [value]
  return raw
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean)
}

const isObjectIdString = (value) => mongoose.isValidObjectId(value) && String(value).trim().length === 24

const resolveStrategyItemLookup = (items) => {
  const identifiers = items.map((item) => normalizeString(item?.itemId))
  const objectIds = identifiers.filter((id) => isObjectIdString(id))
  const riotIds = identifiers.filter((id) => id && !isObjectIdString(id))

  if (objectIds.length > 0 && riotIds.length > 0) {
    return { identifiers, query: { $or: [{ _id: { $in: objectIds } }, { riotId: { $in: riotIds } }] } }
  }
  if (objectIds.length > 0) return { identifiers, query: { _id: { $in: objectIds } } }
  if (riotIds.length > 0) return { identifiers, query: { riotId: { $in: riotIds } } }
  return { identifiers, query: null }
}

const resolveStrategyItemPositions = (items) => {
  const rawPositions = items.map((item) => Number(item?.position)).filter((n) => Number.isFinite(n))
  const isAllIntegers = rawPositions.every((n) => Number.isInteger(n))
  const min = rawPositions.length > 0 ? Math.min(...rawPositions) : undefined
  const max = rawPositions.length > 0 ? Math.max(...rawPositions) : undefined
  const hasZeroBased = isAllIntegers && min === 0 && max <= 5
  return items.map((item, index) => {
    const raw = item?.position
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return index + 1
    if (hasZeroBased) return parsed + 1
    return parsed
  })
}

const handleMongooseWriteError = (res, error, message) => {
  const base = errorResponse(message)
  if (!error) return res.status(500).json({ ...base, reason: '未知错误' })

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors || {}).map((e) => ({
      path: e.path,
      message: e.message,
    }))
    return res.status(400).json({ ...base, reason: '校验失败', errors })
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      ...base,
      reason: '参数类型错误',
      error: { path: error.path, value: error.value, message: error.message },
    })
  }

  if (error.code === 11000) {
    return res.status(409).json({ ...base, reason: '数据已存在（唯一键冲突）', key: error.keyValue || undefined })
  }

  console.error('[strategies] write failed:', error)
  return res.status(500).json({ ...base, reason: '服务器内部错误' })
}

const invalidItemsResponse = (mapType, missing) => {
  const response = { ...errorResponse('包含无效的装备'), missing }
  if (mapType === 'hex_brawl') {
    response.hint = '请确认已同步海克斯装备池（npm run sync:items -- --mode hex_brawl），并使用 /api/items?mode=hex_brawl 返回的 riotId'
  }
  return response
}

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
      mode,
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
    const andConditions = []

    // 英雄过滤
    if (championKey) {
      query.championKey = championKey
    }

    // 地图过滤
    const resolvedMode = mode || mapType
    if (resolvedMode && ['sr', 'aram', 'hex_brawl', 'both'].includes(resolvedMode)) {
      andConditions.push({ $or: [{ mapType: resolvedMode }, { mapType: 'both' }] })
    }

    // 创建者过滤
    if (creatorId) {
      query.creator = creatorId
    }

    // 搜索过滤
    if (search) {
      andConditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { championName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      })
    }

    // 推荐攻略过滤
    if (isRecommended === 'true') {
      query.isRecommended = true
    }

    if (andConditions.length > 0) {
      query.$and = andConditions
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
 * @desc    创建新攻略报告
 * @access  需要认证
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { title, championId, items, runes, mapType = 'sr', mode, augmentIds, description, tags = [] } = req.body

    const resolvedMapType = mode || mapType
    if (resolvedMapType && !['sr', 'aram', 'hex_brawl', 'both'].includes(resolvedMapType)) {
      return res.status(400).json(errorResponse('mode/mapType 参数无效'))
    }

    const normalizedAugmentIds = Array.isArray(augmentIds)
      ? [...new Set(augmentIds.map((id) => String(id).trim()).filter(Boolean))]
      : []

    const normalizedTags = normalizeStringArray(tags)

    // 验证必填字段
    if (!championId) {
      return res.status(400).json(errorResponse('必须选择一个英雄'))
    }

    if (!mongoose.isValidObjectId(championId)) {
      return res.status(400).json(errorResponse('championId 参数无效'))
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json(errorResponse('必须至少选择一个装备'))
    }

    if (items.length > 6) {
      return res.status(400).json(errorResponse('装备数量不能超过6个'))
    }

    const normalizedItems = items
      .map((item) => ({
        itemId: normalizeString(item?.itemId),
        position: item?.position,
      }))
      .filter((item) => item.itemId)

    if (normalizedItems.length !== items.length) {
      return res.status(400).json(errorResponse('装备参数缺失 itemId'))
    }

    try {
      // 验证英雄存在
      const champion = await Champion.findById(championId)
      if (!champion) {
        return res.status(404).json(errorResponse('英雄不存在'))
      }

      // 验证装备存在并获取装备信息
      const itemLookup = resolveStrategyItemLookup(normalizedItems)
      if (!itemLookup.query) {
        return res.status(400).json(errorResponse('必须至少选择一个有效装备'))
      }

      const ItemModel = resolvedMapType === 'hex_brawl' ? HexItem : Item
      const validItems = await ItemModel.find({ ...itemLookup.query, isEnabled: true })
        .select('riotId name image')
        .lean()

      const itemByIdentifier = new Map()
      for (const item of validItems) {
        itemByIdentifier.set(String(item._id), item)
        if (item.riotId) itemByIdentifier.set(String(item.riotId), item)
      }

      const missingItems = itemLookup.identifiers.filter((id) => !itemByIdentifier.has(id))
      if (missingItems.length > 0) {
        return res.status(400).json(invalidItemsResponse(resolvedMapType, missingItems))
      }

      // 构建装备列表
      const positions = resolveStrategyItemPositions(normalizedItems)
      const strategyItems = normalizedItems.map((item, index) => {
        const itemData = itemByIdentifier.get(item.itemId)
        return {
          item: itemData._id,
          itemName: itemData.name,
          itemImage: itemData.image,
          position: positions[index] || index + 1,
        }
      })

      // 验证装备位置唯一性
      const positionValues = strategyItems.map((item) => item.position)
      const uniquePositions = [...new Set(positionValues)]
      if (positionValues.length !== uniquePositions.length) {
        return res.status(400).json(errorResponse('装备位置不能重复'))
      }

      if (strategyItems.some((item) => item.position < 1 || item.position > 6)) {
        return res.status(400).json(errorResponse('装备位置必须在 1-6 之间'))
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
        championKey: champion.key,
        championName: champion.name,
        items: strategyItems,
        runes: runeConfig,
        mapType: resolvedMapType,
        augmentIds: normalizedAugmentIds,
        description,
        tags: normalizedTags,
        creator: req.user.userId,
        creatorName: req.user.username,
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
      return handleMongooseWriteError(res, error, '创建攻略失败')
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
      const query = { creator: req.user.userId }
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
    const { title, championId, items, runes, mapType, mode, augmentIds, description, tags, isPublic } = req.body

    try {
      const strategy = await Strategy.findById(id)

      if (!strategy) {
        return res.status(404).json(errorResponse('攻略不存在'))
      }

      // 检查权限
      if (strategy.creator.toString() !== String(req.user.userId)) {
        return res.status(403).json(errorResponse('只能修改自己创建的攻略'))
      }

      // 更新基础字段
      if (title !== undefined) strategy.title = title
      const nextMapType = mode !== undefined ? mode : mapType
      const effectiveMapType = nextMapType !== undefined ? nextMapType : strategy.mapType
      if (nextMapType !== undefined) {
        if (!['sr', 'aram', 'hex_brawl', 'both'].includes(nextMapType)) {
          return res.status(400).json(errorResponse('mode/mapType 参数无效'))
        }
        strategy.mapType = nextMapType
      }
      if (description !== undefined) strategy.description = description
      if (tags !== undefined) strategy.tags = normalizeStringArray(tags)
      if (isPublic !== undefined) strategy.isPublic = isPublic

      if (augmentIds !== undefined) {
        if (!Array.isArray(augmentIds)) {
          return res.status(400).json(errorResponse('augmentIds 必须是数组'))
        }
        const normalizedAugmentIds = [...new Set(augmentIds.map((id) => String(id).trim()).filter(Boolean))]

        strategy.augmentIds = normalizedAugmentIds
      }

      // 更新英雄
      if (championId && championId !== strategy.champion.toString()) {
        if (!mongoose.isValidObjectId(championId)) {
          return res.status(400).json(errorResponse('championId 参数无效'))
        }
        const champion = await Champion.findById(championId)
        if (!champion) {
          return res.status(404).json(errorResponse('英雄不存在'))
        }
        strategy.champion = championId
        strategy.championKey = champion.key
        strategy.championName = champion.name
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
        const normalizedItems = items
          .map((item) => ({
            itemId: normalizeString(item?.itemId),
            position: item?.position,
          }))
          .filter((item) => item.itemId)

        if (normalizedItems.length !== items.length) {
          return res.status(400).json(errorResponse('装备参数缺失 itemId'))
        }

        const itemLookup = resolveStrategyItemLookup(normalizedItems)
        if (!itemLookup.query) {
          return res.status(400).json(errorResponse('必须至少选择一个有效装备'))
        }

        const ItemModel = effectiveMapType === 'hex_brawl' ? HexItem : Item
        const validItems = await ItemModel.find({ ...itemLookup.query, isEnabled: true })
          .select('riotId name image')
          .lean()

        const itemByIdentifier = new Map()
        for (const item of validItems) {
          itemByIdentifier.set(String(item._id), item)
          if (item.riotId) itemByIdentifier.set(String(item.riotId), item)
        }

        const missingItems = itemLookup.identifiers.filter((id) => !itemByIdentifier.has(id))
        if (missingItems.length > 0) {
          return res.status(400).json(invalidItemsResponse(effectiveMapType, missingItems))
        }

        // 构建装备列表
        const positions = resolveStrategyItemPositions(normalizedItems)
        const strategyItems = normalizedItems.map((item, index) => {
          const itemData = itemByIdentifier.get(item.itemId)
          return {
            item: itemData._id,
            itemName: itemData.name,
            itemImage: itemData.image,
            position: positions[index] || index + 1,
          }
        })

        // 验证装备位置唯一性
        const positionValues = strategyItems.map((item) => item.position)
        const uniquePositions = [...new Set(positionValues)]
        if (positionValues.length !== uniquePositions.length) {
          return res.status(400).json(errorResponse('装备位置不能重复'))
        }

        if (strategyItems.some((item) => item.position < 1 || item.position > 6)) {
          return res.status(400).json(errorResponse('装备位置必须在 1-6 之间'))
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
      return handleMongooseWriteError(res, error, '更新攻略失败')
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
      if (strategy.creator.toString() !== String(req.user.userId)) {
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
    const { mapType, mode } = req.query

    try {
      const resolvedMapType = mode || mapType
      const strategies = await Strategy.getByChampion(championKey, resolvedMapType)

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
 * @access  公开
 */
router.post(
  '/:id/like',
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
          likeCount: strategy.stats.likeCount,
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
