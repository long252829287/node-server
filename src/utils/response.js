/**
 * 统一API响应工具类
 * 提供标准化的成功和错误响应格式
 * 确保所有API端点返回一致的响应结构
 * 支持开发环境显示详细错误信息
 */

// ==================== 成功响应函数 ====================

/**
 * 通用成功响应
 * 返回成功状态的标准响应格式
 * 
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据，可以是任何类型
 * @param {string} message - 成功消息
 * @param {number} statusCode - HTTP状态码，默认200
 * @returns {Object} 标准化的成功响应
 * 
 * @example
 * // 基本用法
 * success(res, { id: 1, name: 'test' }, 'Operation successful');
 * 
 * // 自定义状态码
 * success(res, null, 'Created successfully', 201);
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,                    // 成功标志
    message,                          // 成功消息
    data,                            // 响应数据
    timestamp: new Date().toISOString() // 响应时间戳
  });
};

/**
 * 资源创建成功响应
 * 专门用于POST请求创建资源成功的情况
 * 
 * @param {Object} res - Express响应对象
 * @param {*} data - 创建的资源数据
 * @param {string} message - 创建成功消息
 * @returns {Object} 201状态码的成功响应
 */
const created = (res, data = null, message = 'Resource created successfully') => {
  return success(res, data, message, 201);
};

/**
 * 资源更新成功响应
 * 专门用于PUT/PATCH请求更新资源成功的情况
 * 
 * @param {Object} res - Express响应对象
 * @param {*} data - 更新后的资源数据
 * @param {string} message - 更新成功消息
 * @returns {Object} 200状态码的成功响应
 */
const updated = (res, data = null, message = 'Resource updated successfully') => {
  return success(res, data, message, 200);
};

/**
 * 资源删除成功响应
 * 专门用于DELETE请求删除资源成功的情况
 * 
 * @param {Object} res - Express响应对象
 * @param {string} message - 删除成功消息
 * @returns {Object} 200状态码的成功响应
 */
const deleted = (res, message = 'Resource deleted successfully') => {
  return success(res, null, message, 200);
};

// ==================== 错误响应函数 ====================

/**
 * 通用错误响应
 * 返回错误状态的标准响应格式
 * 
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码，默认500
 * @param {*} details - 错误详情，仅在开发环境显示
 * @returns {Object} 标准化的错误响应
 * 
 * @example
 * // 基本用法
 * error(res, 'Internal server error', 500);
 * 
 * // 包含错误详情（仅开发环境）
 * error(res, 'Validation failed', 400, { field: 'email', issue: 'invalid format' });
 */
const error = (res, message = 'Internal Server Error', statusCode = 500, details = null) => {
  const response = {
    success: false,                   // 失败标志
    message,                          // 错误消息
    timestamp: new Date().toISOString() // 响应时间戳
  };
  
  // 仅在开发环境显示错误详情，生产环境隐藏敏感信息
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * 400 Bad Request 错误响应
 * 用于请求参数错误、格式错误等情况
 * 
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情
 * @returns {Object} 400状态码的错误响应
 */
const badRequest = (res, message = 'Bad Request', details = null) => {
  return error(res, message, 400, details);
};

/**
 * 401 Unauthorized 错误响应
 * 用于身份验证失败、缺少认证信息等情况
 * 
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情
 * @returns {Object} 401状态码的错误响应
 */
const unauthorized = (res, message = 'Unauthorized', details = null) => {
  return error(res, message, 401, details);
};

/**
 * 403 Forbidden 错误响应
 * 用于权限不足、访问被拒绝等情况
 * 
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情
 * @returns {Object} 403状态码的错误响应
 */
const forbidden = (res, message = 'Forbidden', details = null) => {
  return error(res, message, 403, details);
};

/**
 * 404 Not Found 错误响应
 * 用于请求的资源不存在等情况
 * 
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情
 * @returns {Object} 404状态码的错误响应
 */
const notFound = (res, message = 'Resource not found', details = null) => {
  return error(res, message, 404, details);
};

/**
 * 409 Conflict 错误响应
 * 用于资源冲突、重复创建等情况
 * 
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情
 * @returns {Object} 409状态码的错误响应
 */
const conflict = (res, message = 'Conflict', details = null) => {
  return error(res, message, 409, details);
};

/**
 * 422 Unprocessable Entity 错误响应
 * 用于数据验证失败、格式正确但语义错误等情况
 * 
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情
 * @returns {Object} 422状态码的错误响应
 */
const validationError = (res, message = 'Validation failed', details = null) => {
  return error(res, message, 422, details);
};

/**
 * 429 Too Many Requests 错误响应
 * 用于请求频率超限、限流触发等情况
 * 
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情
 * @returns {Object} 429状态码的错误响应
 */
const tooManyRequests = (res, message = 'Too many requests', details = null) => {
  return error(res, message, 429, details);
};

// ==================== 模块导出 ====================

// 导出所有响应函数
module.exports = {
  // 成功响应函数
  success,           // 通用成功响应
  created,           // 创建成功响应
  updated,           // 更新成功响应
  deleted,           // 删除成功响应
  
  // 错误响应函数
  error,             // 通用错误响应
  badRequest,        // 400 请求错误
  unauthorized,      // 401 未授权
  forbidden,         // 403 禁止访问
  notFound,          // 404 未找到
  conflict,          // 409 冲突
  validationError,   // 422 验证失败
  tooManyRequests    // 429 请求过多
}; 