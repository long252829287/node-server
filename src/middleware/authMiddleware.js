/**
 * 认证中间件
 * 提供JWT令牌验证和用户权限检查功能
 * 用于保护需要认证的API端点
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { unauthorized, error } = require('../utils/response');

/**
 * 保护路由中间件
 * 验证JWT令牌并提取用户信息
 * 将用户信息添加到 req.user 中
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 从请求头中获取Authorization令牌
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 检查令牌是否存在
    if (!token) {
      return unauthorized(res, '未登录，请先登录');
    }

    try {
      // 验证JWT令牌
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // 从令牌中提取用户信息
      const { userId, username } = decoded;

      // 检查用户是否仍然存在
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return unauthorized(res, '用户不存在或已被删除');
      }

      // 将用户信息添加到请求对象中
      req.user = {
        userId: user._id,
        username: user.username,
        email: user.email
      };

      next();
    } catch (jwtError) {
      // JWT验证失败
      if (jwtError.name === 'TokenExpiredError') {
        return unauthorized(res, '登录已过期，请重新登录');
      } else if (jwtError.name === 'JsonWebTokenError') {
        return unauthorized(res, '无效的登录身份');
      } else {
        return unauthorized(res, '登录失败');
      }
    }

  } catch (error) {
    console.error('认证中间件错误:', error);
    return error(res, '服务器内部错误，认证失败', 500, error.message);
  }
};

/**
 * 可选认证中间件
 * 如果提供了有效令牌，则验证用户；如果没有令牌，则继续执行
 * 用于可选认证的API端点
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // 从请求头中获取Authorization令牌
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 如果没有令牌，直接继续
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      // 验证JWT令牌
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // 从令牌中提取用户信息
      const { userId, username } = decoded;

      // 检查用户是否仍然存在
      const user = await User.findById(userId).select('-password');
      if (user) {
        // 将用户信息添加到请求对象中
        req.user = {
          userId: user._id,
          username: user.username,
          email: user.email
        };
      } else {
        req.user = null;
      }

      next();
    } catch (jwtError) {
      // JWT验证失败，但不阻止请求继续
      req.user = null;
      next();
    }

  } catch (error) {
    console.error('可选认证中间件错误:', error);
    // 即使出错也继续执行，只是不设置用户信息
    req.user = null;
    next();
  }
};

/**
 * 角色验证中间件
 * 检查用户是否具有特定角色
 * @param {string|Array} roles - 允许的角色或角色数组
 */
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, '需要登录才能访问此资源');
    }

    // 如果roles是字符串，转换为数组
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    // 检查用户角色（这里假设用户模型中有role字段）
    // 如果没有role字段，可以根据需要修改逻辑
    if (req.user.role && !allowedRoles.includes(req.user.role)) {
      return unauthorized(res, '权限不足，无法访问此资源');
    }

    next();
  };
};

/**
 * 资源所有权验证中间件
 * 检查用户是否拥有特定资源
 * @param {Function} resourceFinder - 查找资源的函数
 * @param {string} resourceIdParam - 资源ID参数名
 */
const checkOwnership = (resourceFinder, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return unauthorized(res, '需要登录才能访问此资源');
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return error(res, '资源ID缺失', 400);
      }

      // 查找资源
      const resource = await resourceFinder(resourceId);
      if (!resource) {
        return error(res, '资源不存在', 404);
      }

      // 检查资源是否属于当前用户
      if (resource.user && resource.user.toString() !== req.user.userId) {
        return unauthorized(res, '无权访问此资源');
      }

      // 将资源添加到请求对象中，供后续中间件使用
      req.resource = resource;
      next();

    } catch (error) {
      console.error('资源所有权验证错误:', error);
      return error(res, '服务器内部错误，验证失败', 500, error.message);
    }
  };
};

/**
 * 速率限制中间件（针对认证用户）
 * 为认证用户提供更宽松的限流策略
 */
const authRateLimit = (req, res, next) => {
  // 这里可以添加针对认证用户的限流逻辑
  // 例如：认证用户可以获得更高的请求配额
  
  // 暂时直接通过，可以根据需要实现具体的限流逻辑
  next();
};

// 导出所有认证中间件
module.exports = {
  protect,           // 必需认证
  optionalAuth,      // 可选认证
  authorize,         // 角色验证
  checkOwnership,    // 资源所有权验证
  authRateLimit      // 认证用户限流
}; 