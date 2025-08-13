/**
 * 主路由文件
 * 整合所有子路由模块，提供统一的API入口
 * 负责路由分组和中间件应用
 */

const express = require('express');
const router = express.Router();

// 导入各个功能模块的路由
const healthRoutes = require('./health');      // 健康检查路由
const douyuRoutes = require('./douyu');        // 斗鱼直播相关路由
const huyaRoutes = require('./huya');          // 虎牙直播相关路由

// ==================== 路由注册 ====================

// 健康检查路由 - 不受限流影响，用于监控和负载均衡
// 路径: /health
router.use('/health', healthRoutes);

// API路由 - 应用更严格的限流策略
// 斗鱼API路由组 - 路径: /api/douyu/*
router.use('/api/douyu', douyuRoutes);
// 虎牙API路由组 - 路径: /api/huya/*
router.use('/api/huya', huyaRoutes);

// ==================== 默认路由 ====================
// 根路径访问，返回API信息和使用说明
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to LYL API Server',
    version: '1.0.0',
    // 可用的API端点列表
    endpoints: {
      health: '/health',                    // 健康检查
      douyu: '/api/douyu',                 // 斗鱼相关API
      huya: '/api/huya'                    // 虎牙相关API
    }
  });
});

// 导出路由实例
module.exports = router; 