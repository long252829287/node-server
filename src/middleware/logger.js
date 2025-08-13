/**
 * 日志中间件配置
 * 使用Morgan中间件记录HTTP请求日志
 * 支持开发和生产环境不同的日志格式
 * 提供自定义日志令牌和过滤功能
 */

const morgan = require('morgan');

// ==================== 自定义日志令牌 ====================

/**
 * 响应时间令牌
 * 计算请求处理时间，精确到毫秒
 * 用于性能监控和调试
 * 
 * @returns {string} 响应时间字符串，格式如 "15ms"
 */
morgan.token('response-time', (req, res) => {
  if (!res._header || !req._startAt) return '';
  const diff = process.hrtime(req._startAt);
  const time = Math.round(diff[0] * 1000 + diff[1] / 1000000);
  return `${time}ms`;
});

/**
 * 请求体令牌
 * 记录请求体内容，用于调试和审计
 * 只在开发环境显示，生产环境不记录敏感信息
 * 
 * @returns {string} 请求体JSON字符串或空字符串
 */
morgan.token('body', (req) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return JSON.stringify(req.body);
  }
  return '';
});

// ==================== 日志格式定义 ====================

/**
 * 开发环境日志格式
 * 包含详细的请求信息，便于开发和调试
 * 
 * 格式说明：
 * - :method - HTTP方法（GET、POST等）
 * - :url - 请求URL路径
 * - :status - HTTP状态码
 * - :response-time - 响应时间
 * - :body - 请求体内容
 * 
 * 示例输出：
 * POST /api/douyu/room 200 45ms - {"rid":"123456"}
 */
const devFormat = ':method :url :status :response-time - :body';

/**
 * 生产环境日志格式
 * 符合标准访问日志格式，便于日志分析和监控
 * 
 * 格式说明：
 * - :remote-addr - 客户端IP地址
 * - :remote-user - 远程用户（通常为空）
 * - :date[clf] - 时间戳（CLF格式）
 * - :method - HTTP方法
 * - :url - 请求URL
 * - :http-version - HTTP版本
 * - :status - HTTP状态码
 * - :res[content-length] - 响应内容长度
 * - :referrer - 引用页面
 * - :user-agent - 用户代理字符串
 * 
 * 示例输出：
 * 192.168.1.1 - - [01/Jan/2024:00:00:00 +0000] "POST /api/douyu/room HTTP/1.1" 200 156 "-" "Mozilla/5.0..."
 */
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

// ==================== 日志中间件配置 ====================

/**
 * Morgan日志中间件
 * 根据环境选择不同的日志格式
 * 支持请求过滤和自定义配置
 */
const logger = morgan(process.env.NODE_ENV === 'production' ? prodFormat : devFormat, {
  // 跳过某些请求的日志记录
  skip: (req, res) => {
    // 跳过健康检查请求的日志记录
    // 避免健康检查产生过多日志，保持日志的清晰性
    return req.url === '/health';
  }
});

// 导出配置好的日志中间件
module.exports = logger; 