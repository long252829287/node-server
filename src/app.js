/**
 * Express应用主配置文件
 * 负责配置中间件、路由和错误处理
 */

// 加载环境变量配置
require('dotenv').config();
// 设置项目根路径，简化模块导入
require('rootpath')();

const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');

// 导入配置文件
const config = require('./config/app');
const { connectDB } = require('./config/database');

// 导入中间件
const { securityHeaders, corsOptions, rateLimiter, apiRateLimiter } = require('./middleware/security');
const logger = require('./middleware/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// 导入路由配置
const routes = require('./routes');

// 创建Express应用实例
const app = express();

// 连接数据库
// 在应用启动时建立MongoDB连接
connectDB();

// ==================== 安全中间件配置 ====================
// 设置安全HTTP头，防止常见攻击
app.use(securityHeaders);
// 配置CORS，允许跨域请求
app.use(cors(corsOptions));

// ==================== 性能优化中间件 ====================
// 启用响应压缩，减少传输数据量
// 支持gzip、deflate等压缩算法
app.use(compression());

// ==================== 请求解析中间件 ====================
// 解析JSON请求体，限制大小为1MB防止大文件上传
app.use(express.json({ limit: '1mb' }));
// 解析URL编码的请求体（表单数据）
app.use(express.urlencoded({ extended: true }));

// ==================== 日志中间件 ====================
// 记录HTTP请求日志，包括方法、URL、状态码、响应时间等
app.use(logger);

// ==================== 静态文件服务 ====================
// 提供静态文件访问，如图片、CSS、JS等
// 文件路径相对于public目录
app.use(express.static(path.join(__dirname, '../public')));

// ==================== 限流中间件 ====================
// 全局限流：防止API滥用和DDoS攻击
app.use(rateLimiter);

// API专用限流：对API路由应用更严格的限流策略
// 健康检查等路由不受此限流影响
app.use('/api', apiRateLimiter);

// ==================== 路由配置 ====================
// 注册所有应用路由
// 包括健康检查等
app.use('/', routes);

// ==================== 错误处理中间件 ====================
// 404错误处理：请求的路由不存在
app.use(notFound);
// 全局错误处理：捕获所有未处理的错误
app.use(errorHandler);

// 导出Express应用实例
module.exports = app; 