/**
 * 应用配置文件
 * 集中管理应用的各种配置参数，支持环境变量覆盖
 */

module.exports = {
  // 服务器端口配置
  // 优先使用环境变量PORT，默认3000
  port: process.env.PORT || 3000,
  
  // 运行环境配置
  // 影响日志格式、安全策略等行为
  env: process.env.NODE_ENV || 'development',
  
  // CORS跨域配置
  cors: {
    // 允许的源域名，生产环境建议限制具体域名
    origin: process.env.CORS_ORIGIN || '*',
    // 是否允许携带凭证（cookies、authorization headers等）
    credentials: true,
    // 允许的HTTP方法
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    // 允许的请求头
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // 请求限流配置
  rateLimit: {
    // 限流时间窗口：15分钟
    windowMs: 15 * 60 * 1000,
    // 每个IP在时间窗口内最大请求次数
    max: process.env.RATE_LIMIT_MAX || 100,
    // 超出限流时的错误消息
    message: 'Too many requests from this IP, please try again later.'
  },
  
  // 安全配置
  security: {
    // Helmet安全中间件配置
    helmet: {
      // 内容安全策略，false表示不启用（开发环境）
      contentSecurityPolicy: false,
      // 跨域嵌入策略，false表示不启用（开发环境）
      crossOriginEmbedderPolicy: false
    }
  },
  
  // 日志配置
  logging: {
    // 日志级别：info、debug、warn、error等
    level: process.env.LOG_LEVEL || 'info',
    // 日志格式：开发环境使用dev格式，生产环境使用combined格式
    format: process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
  }
}; 