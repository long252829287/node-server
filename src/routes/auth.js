/**
 * 用户认证路由模块
 * 提供用户注册、登录、登出等认证功能
 * 支持JWT令牌认证和密码加密
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { success, badRequest, unauthorized, error } = require('../utils/response');

// 创建路由器实例
const router = express.Router();

// ==================== 用户注册 ====================

/**
 * 用户注册
 * POST /api/auth/register
 * 功能：创建新用户账户
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, nickname } = req.body;

    // 输入验证
    if (!username || !password) {
      return badRequest(res, '用户名和密码不能为空', {
        required: ['username', 'password']
      });
    }

    if (username.length < 3 || username.length > 20) {
      return badRequest(res, '用户名长度必须在3-20个字符之间');
    }

    if (password.length < 6) {
      return badRequest(res, '密码长度不能少于6个字符');
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return badRequest(res, '用户名已存在');
    }

    // 创建新用户（生成唯一业务ID，保存昵称到 profile.displayName）
    const newUser = new User({
      username: username.trim(),
      // 交由模型的 pre('save') 钩子进行加密，避免重复加密
      password: password,
      email: email || undefined,
      profile: { displayName: nickname && nickname.trim() ? nickname.trim() : undefined }
    });

    // 保存用户到数据库
    await newUser.save();

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: newUser._id, username: newUser.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 返回成功响应（不包含密码）
    const userResponse = {
      _id: newUser._id,
      uid: newUser.uid,
      username: newUser.username,
      nickname: newUser.profile?.displayName || null,
      email: newUser.email,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: '用户注册成功',
      data: {
        user: userResponse,
        token: token
      }
    });

  } catch (err) {
    console.error('用户注册错误:', err);
    
    // 处理验证错误
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return badRequest(res, '数据验证失败', validationErrors);
    }

    // 处理重复键错误
    if (err.code === 11000) {
      return badRequest(res, '用户名已存在');
    }

    return error(res, '服务器内部错误，注册失败', 500, err.message);
  }
});

// ==================== 用户登录 ====================

/**
 * 用户登录
 * POST /api/auth/login
 * 功能：验证用户凭据并生成访问令牌
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 输入验证
    if (!username || !password) {
      return badRequest(res, '用户名和密码不能为空');
    }

    // 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      return unauthorized(res, '用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return unauthorized(res, '用户名或密码错误');
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 返回成功响应
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        user: userResponse,
        token: token
      }
    });

  } catch (err) {
    console.error('用户登录错误:', err);
    return error(res, '服务器内部错误，登录失败', 500, err.message);
  }
});

// ==================== 用户登出 ====================

/**
 * 用户登出
 * POST /api/auth/logout
 * 功能：用户登出（客户端需要删除令牌）
 */
router.post('/logout', protect, async (req, res) => {
  try {
    // 这里可以添加令牌黑名单逻辑
    // 目前客户端只需要删除本地存储的令牌即可
    
    res.status(200).json({
      success: true,
      message: '登出成功',
      data: {
        userId: req.user.userId,
        logoutAt: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('用户登出错误:', err);
    return error(res, '服务器内部错误，登出失败', 500, err.message);
  }
});

// ==================== 获取当前用户信息 ====================

/**
 * 获取当前用户信息
 * GET /api/auth/me
 * 功能：获取当前认证用户的详细信息
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return unauthorized(res, '用户不存在');
    }

    res.status(200).json({
      success: true,
      message: '获取用户信息成功',
      data: {
        user: user
      }
    });

  } catch (err) {
    console.error('获取用户信息错误:', err);
    return error(res, '服务器内部错误，获取用户信息失败', 500, err.message);
  }
});

// ==================== 更新用户信息 ====================

/**
 * 更新用户信息
 * PUT /api/auth/profile
 * 功能：更新当前用户的个人信息
 */
router.put('/profile', protect, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return unauthorized(res, '用户不存在');
    }

    // 更新邮箱
    if (email !== undefined) {
      user.email = email;
    }

    // 更新密码
    if (currentPassword && newPassword) {
      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return badRequest(res, '当前密码错误');
      }

      // 验证新密码长度
      if (newPassword.length < 6) {
        return badRequest(res, '新密码长度不能少于6个字符');
      }

      // 加密新密码
      const saltRounds = 10;
      user.password = await bcrypt.hash(newPassword, saltRounds);
    }

    // 保存更新
    await user.save();

    // 返回更新后的用户信息（不包含密码）
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      message: '用户信息更新成功',
      data: {
        user: userResponse
      }
    });

  } catch (err) {
    console.error('更新用户信息错误:', err);
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return badRequest(res, '数据验证失败', validationErrors);
    }

    return error(res, '服务器内部错误，更新用户信息失败', 500, err.message);
  }
});

// ==================== 刷新令牌 ====================

/**
 * 刷新访问令牌
 * POST /api/auth/refresh
 * 功能：使用刷新令牌获取新的访问令牌
 */
router.post('/refresh', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 生成新的访问令牌
    const newToken = jwt.sign(
      { userId: userId, username: req.user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: '令牌刷新成功',
      data: {
        token: newToken,
        userId: userId
      }
    });

  } catch (err) {
    console.error('刷新令牌错误:', err);
    return error(res, '服务器内部错误，刷新令牌失败', 500, err.message);
  }
});

// 导出路由实例
module.exports = router; 