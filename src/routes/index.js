/**
 * 主路由文件
 * 整合所有子路由模块，提供统一的API入口
 * 负责路由分组和中间件应用
 */

const express = require('express');
const router = express.Router();

// 导入各个功能模块的路由
const apiRoutes = require('./api');            // API统一管理路由
// ==================== 路由注册 ====================

// API统一管理路由 - 所有API接口都在 /api 路径下
// 路径: /api/*
router.use('/api', apiRoutes);

// ==================== 默认路由 ====================
// 根路径访问，返回API信息和使用说明
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to LYL API Server',
    version: '1.0.0',
    // 可用的API端点列表
    endpoints: {
      api: '/api',                         // API统一入口
      apiDocs: '/api',                     // API文档和端点列表
      apiStatus: '/api/status',            // API状态检查
      apiStats: '/api/stats'               // API统计信息
    },
    // 快速访问链接
    quickAccess: {
      apiList: '/api',                     // 查看所有API端点
      apiStatus: '/api/status'             // API模块状态
    }
  });
});

// ==================== 404处理 ====================
// 处理未匹配的路由
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的路径不存在',
    requestedPath: req.originalUrl,
    availablePaths: {
      root: '/',
      api: '/api'
    },
    suggestion: '请访问 /api 查看所有可用的API端点'
  });
});

// 导出路由实例
module.exports = router; 