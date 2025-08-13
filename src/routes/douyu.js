/**
 * 斗鱼直播平台路由配置
 * 提供斗鱼直播房间信息查询的API接口
 * 包含数据验证和异步错误处理
 */

const express = require('express');
const router = express.Router();

// 导入相关模块
const douyuController = require('../controllers/douyuController');        // 斗鱼业务逻辑控制器
const { validateDouyuRoom } = require('../validators/douyuValidator');   // 斗鱼数据验证器
const asyncHandler = require('../utils/asyncHandler');                   // 异步错误处理包装器

// ==================== 路由定义 ====================

/**
 * POST /api/douyu/room
 * 获取斗鱼直播房间信息
 * 
 * 请求体参数:
 * - rid: string - 房间ID（必填）
 * 
 * 响应格式:
 * {
 *   "success": true,
 *   "message": "Room information retrieved successfully",
 *   "data": {
 *     "rid": "房间ID",
 *     "fileUrl": "直播流地址",
 *     "timestamp": "获取时间"
 *   }
 * }
 * 
 * 中间件执行顺序:
 * 1. validateDouyuRoom - 验证请求数据
 * 2. asyncHandler - 包装异步控制器，统一错误处理
 * 3. douyuController.getRoomInfo - 执行业务逻辑
 */
router.post('/room', 
  validateDouyuRoom,                                    // 数据验证中间件
  asyncHandler(douyuController.getRoomInfo)             // 异步控制器包装器
);

// 导出路由实例
module.exports = router; 