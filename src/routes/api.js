/**
 * API路由统一管理文件
 * 集中管理所有API端点的路由配置
 * 提供逻辑URL与实际物理路径的映射关系
 */

const express = require('express');
const router = express.Router();

// 导入各个功能模块的路由

const notesRoutes = require('./notes');
const authRoutes = require('./auth');

// ========== 用户列表接口 ========== //
const User = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * @route   GET /api/users
 * @desc    查询所有用户，返回用户名与昵称
 * @access  公开（如需可改为仅管理员）
 */
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find({}, { username: 1, 'profile.displayName': 1 })
    .lean()
    .exec();
  const data = users.map(u => ({
    username: u.username,
    nickname: u.profile?.displayName || null
  }));
  res.json({
    success: true,
    message: '用户列表获取成功',
    data
  });
}));

// ==================== API路由映射表 ====================



/**
 */

/**
 */

/**
 * 笔记管理API路由组
 * 基础路径: /api/notes
 * 功能: 用户笔记的增删改查
 */
router.use('/notes', notesRoutes);

/**
 * 用户认证API路由组
 * 基础路径: /api/auth
 * 功能: 用户注册、登录、认证等
 */
router.use('/auth', authRoutes);

// ==================== API端点汇总 ====================

/**
 * 获取所有可用API端点信息
 * GET /api
 * 功能: 返回完整的API端点列表和说明
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LYL API Server - API端点列表',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {

      
      
      
      
      
      // 笔记管理API
      notes: {
        path: '/api/notes',
        description: '用户笔记管理服务',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        auth: true,
        rateLimit: true,
        routes: {
          'GET /api/notes/notes': {
            description: '获取用户所有笔记',
            params: '无',
            response: '笔记列表和数量'
          },
          'POST /api/notes/notes': {
            description: '创建新笔记',
            params: { content: 'string', title: 'string?', tags: 'array?' },
            response: '新创建的笔记信息'
          },
          'GET /api/notes/notes/:id': {
            description: '获取单个笔记详情',
            params: { id: 'string' },
            response: '笔记详细信息'
          },
          'PUT /api/notes/notes/:id': {
            description: '更新笔记',
            params: { id: 'string', content: 'string?', title: 'string?', tags: 'array?' },
            response: '更新后的笔记信息'
          },
          'DELETE /api/notes/notes/:id': {
            description: '删除笔记',
            params: { id: 'string' },
            response: '删除成功确认'
          }
        }
      },
      
      // 用户认证API
      auth: {
        path: '/api/auth',
        description: '用户认证和授权服务',
        methods: ['POST'],
        auth: false,
        rateLimit: true,
        routes: {
          'POST /api/auth/register': {
            description: '用户注册（支持昵称nickname，自动生成唯一uid）',
            params: { username: 'string', password: 'string', nickname: 'string?' },
            response: '注册成功确认'
          },
          'POST /api/auth/login': {
            description: '用户登录',
            params: { username: 'string', password: 'string' },
            response: '登录令牌和用户信息'
          },
          'POST /api/auth/logout': {
            description: '用户登出',
            params: '无',
            response: '登出成功确认'
          }
        }
      }
    },
    
    // 全局配置信息
    config: {
      rateLimit: {
        global: '100 requests per 15 minutes',
        api: '50 requests per 15 minutes',
        auth: '20 requests per 15 minutes'
      },
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
      },
      security: {
        helmet: 'enabled',
        https: 'recommended for production'
      }
    },
    
    // 使用说明
    usage: {
      authentication: '需要认证的接口请在请求头中添加 Authorization: Bearer <token>',
      rateLimit: '超出限流次数会返回 429 状态码',
      errorHandling: '所有错误响应都包含 success: false 和错误信息',
      pagination: '列表接口支持分页，使用 page 和 limit 参数'
    }
  });
});

// ==================== 路由状态检查 ====================

/**
 * 检查所有路由的健康状态
 * GET /api/status
 * 功能: 检查各个API模块的可用性
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      success: true,
      message: 'API状态检查完成',
      timestamp: new Date().toISOString(),
      modules: {
        
        
        
        notes: { status: 'active', path: '/api/notes' },
        auth: { status: 'active', path: '/api/auth' }
      },
      database: 'connected', // 这里可以添加实际的数据库连接状态检查
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '状态检查失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== 路由统计信息 ====================

/**
 * 获取API使用统计信息
 * GET /api/stats
 * 功能: 返回API的使用统计和性能指标
 */
router.get('/stats', (req, res) => {
  // 这里可以添加实际的统计逻辑，如请求次数、响应时间等
  const stats = {
    success: true,
    message: 'API统计信息',
    timestamp: new Date().toISOString(),
    stats: {
      totalRequests: 0, // 总请求数
      activeConnections: 0, // 活跃连接数
      averageResponseTime: 0, // 平均响应时间
      errorRate: 0, // 错误率
      topEndpoints: [] // 最受欢迎的端点
    }
  };
  
  res.status(200).json(stats);
});

// 导出路由实例
module.exports = router; 