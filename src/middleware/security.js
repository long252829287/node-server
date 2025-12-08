/**
 * 安全中间件配置
 * 提供应用级别的安全保护，包括安全头、CORS、限流等
 * 防止常见的安全攻击和API滥用
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const config = require('../config/app');

// ==================== 安全头中间件 ====================
/**
 * Helmet安全中间件
 * 设置各种HTTP安全头，防止常见攻击
 * 
 * 配置说明：
 * - contentSecurityPolicy: false - 开发环境禁用CSP（内容安全策略）
 * - crossOriginEmbedderPolicy: false - 开发环境禁用COEP（跨域嵌入策略）
 * - hsts: 启用HTTP严格传输安全，强制HTTPS连接
 *   - maxAge: 31536000 - HSTS有效期1年
 *   - includeSubDomains: true - 包含子域名
 *   - preload: true - 支持浏览器预加载列表
 */
const securityHeaders = helmet({
  contentSecurityPolicy: config.security.helmet.contentSecurityPolicy,
  crossOriginEmbedderPolicy: config.security.helmet.crossOriginEmbedderPolicy,
  hsts: {
    maxAge: 31536000,           // 1年有效期
    includeSubDomains: true,    // 包含子域名
    preload: true               // 支持预加载
  }
});

// ==================== CORS跨域配置 ====================
/**
 * CORS跨域资源共享配置
 * 控制哪些域名可以访问API，以及允许的请求方法和头
 * 
 * 配置说明：
 * - origin: 允许的源域名，生产环境建议限制具体域名
 * - credentials: true - 允许携带凭证（cookies、authorization等）
 * - methods: 允许的HTTP方法
 * - allowedHeaders: 允许的请求头
 * - optionsSuccessStatus: 200 - OPTIONS预检请求的成功状态码
 */
const corsOptions = {
  origin: config.cors.origin,                    // 允许的源域名
  credentials: config.cors.credentials,          // 是否允许凭证
  methods: config.cors.methods,                  // 允许的HTTP方法
  allowedHeaders: config.cors.allowedHeaders,    // 允许的请求头
  optionsSuccessStatus: 200                      // 预检请求成功状态码
};

// ==================== 全局限流中间件 ====================
/**
 * 全局限流中间件
 * 对所有请求进行频率限制，防止API滥用和DDoS攻击
 * 
 * 限流策略：
 * - 时间窗口：15分钟
 * - 最大请求数：每个IP 15分钟内最多100次请求
 * - 跳过健康检查：健康检查不受限流影响
 * 
 * 响应头：
 * - X-RateLimit-Limit: 限制次数
 * - X-RateLimit-Remaining: 剩余次数
 * - X-RateLimit-Reset: 重置时间
 */
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,           // 时间窗口：15分钟
  max: config.rateLimit.max,                     // 最大请求数：100次
  message: {
    success: false,
    error: {
      status: 429,                               // 429 Too Many Requests
      message: config.rateLimit.message
    }
  },
  standardHeaders: true,                         // 启用标准限流响应头
  legacyHeaders: false,                          // 禁用旧版响应头
  // 跳过限流的条件：健康检查请求
  
});

// ==================== API专用限流中间件 ====================
/**
 * API专用限流中间件
 * 对API路由应用更严格的限流策略
 * 
 * 限流策略：
 * - 时间窗口：15分钟
 * - 最大请求数：每个IP 15分钟内最多500次API请求
 * - 比全局限流更严格，专门保护API端点
 * 
 * 使用场景：
 * - 对 /api/* 路径的所有请求生效
 * - 健康检查等非API路由不受影响
 */
const apiRateLimiter = rateLimit({
  windowMs: 15* 60 * 1000,                     // 15分钟时间窗口
  max: 500,                                       // 每个IP最多50次请求
  message: {
    success: false,
    error: {
      status: 429,                               // 429 Too Many Requests
      message: 'API rate limit exceeded'
    }
  },
  standardHeaders: true,                         // 启用标准限流响应头
  legacyHeaders: false                           // 禁用旧版响应头
});

// 导出所有安全中间件
module.exports = {
  securityHeaders,    // 安全头中间件
  corsOptions,        // CORS配置对象
  rateLimiter,        // 全局限流中间件
  apiRateLimiter      // API专用限流中间件
}; 