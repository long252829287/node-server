/**
 * 提供海克斯增幅器列表数据
 */

const express = require('express')
const router = express.Router()
const { successResponse } = require('../utils/response')
const hexData = require('../assets/json/lol/hex.json')

/**
 * @route   GET /api/hex
 * @desc    获取海克斯列表
 * @access  公开
 */
router.get('/', (req, res) => {
  const augments = Array.isArray(hexData?.augments) ? hexData.augments : []
  res.json(successResponse('海克斯获取成功', augments))
})

module.exports = router
