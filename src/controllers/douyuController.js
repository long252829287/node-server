/**
 * 斗鱼直播平台控制器
 * 处理斗鱼相关的业务逻辑，包括房间信息查询等
 * 负责请求参数验证、业务调用和响应格式化
 */

const douyuService = require('../services/douyuService');
const { success, badRequest, error } = require('../utils/response');

/**
 * 获取斗鱼直播房间信息
 * 接收房间ID，调用服务层获取房间信息，返回统一格式的响应
 * 
 * @param {Object} req - Express请求对象
 * @param {Object} req.body - 请求体
 * @param {string} req.body.rid - 房间ID
 * @param {Object} res - Express响应对象
 * @returns {Object} 统一格式的JSON响应
 * 
 * @example
 * // 请求示例
 * POST /api/douyu/room
 * {
 *   "rid": "123456"
 * }
 * 
 * // 成功响应示例
 * {
 *   "success": true,
 *   "message": "Room information retrieved successfully",
 *   "data": {
 *     "rid": "123456",
 *     "fileUrl": "https://example.com/stream.m3u8",
 *     "timestamp": "2024-01-01T00:00:00.000Z"
 *   },
 *   "timestamp": "2024-01-01T00:00:00.000Z"
 * }
 * 
 * // 错误响应示例
 * {
 *   "success": false,
 *   "message": "Room ID is required",
 *   "timestamp": "2024-01-01T00:00:00.000Z"
 * }
 */
const getRoomInfo = async (req, res) => {
  try {
    // 从请求体中提取房间ID
    const { rid } = req.body;
    
    // 参数验证：检查房间ID是否存在
    if (!rid) {
      return badRequest(res, 'Room ID is required');
    }
    
    // 调用服务层获取房间信息
    // 服务层负责具体的业务逻辑，包括调用Python脚本等
    const roomInfo = await douyuService.getRoomInfo(rid);
    
    // 检查服务层返回结果
    if (!roomInfo) {
      return badRequest(res, 'Failed to get room information');
    }
    
    // 返回成功响应，包含房间信息
    return success(res, roomInfo, 'Room information retrieved successfully');
    
  } catch (err) {
    // 捕获并记录所有未预期的错误
    console.error('Douyu controller error:', err);
    
    // 返回通用错误响应
    // 在生产环境中，不会暴露具体的错误信息
    return error(res, 'Failed to get room information', 500, err.message);
  }
};

// 导出控制器函数
module.exports = {
  getRoomInfo
}; 