/**
 * 笔记管理路由模块
 * 提供笔记的增删改查功能
 * 支持用户权限验证和数据验证
 */

const express = require('express');
const Note = require('../models/Note');
const { protect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/asyncHandler');

// 创建路由器实例
const router = express.Router();

/**
 * 获取用户所有笔记
 * GET /api/notes/notes
 * 功能：获取当前认证用户的所有笔记，按创建时间倒序排列
 */
router.get('/notes', protect, asyncHandler(async (req, res) => {
    // 从认证中间件获取用户信息
    const userId = req.user.userId;
    
    // 查询用户的所有笔记，并关联用户信息
    const notes = await Note.find({ user: userId })
        .populate('user', 'username')  // 关联用户表，只返回用户名
        .sort({ createdAt: 'desc' })   // 按创建时间倒序排列
        .lean();                       // 转换为普通 JavaScript 对象，提高性能
    
    // 返回成功响应
    res.status(200).json({
        success: true,
        message: '获取笔记成功',
        data: {
            notes: notes,
            count: notes.length,
            userId: userId
        }
    });
}));

/**
 * 创建新笔记
 * POST /api/notes/notes
 * 功能：为当前认证用户创建新的笔记
 */
router.post('/notes', protect, asyncHandler(async (req, res) => {
    // 从请求体中提取笔记内容
    const { content, title, tags } = req.body;
    
    // 输入验证：检查必需字段
    if (!content || content.trim() === '') {
        return res.status(400).json({
            success: false,
            message: '笔记内容不能为空',
            required: ['content']
        });
    }
    
    // 输入验证：检查内容长度
    if (content.length > 10000) {
        return res.status(400).json({
            success: false,
            message: '笔记内容不能超过 10000 个字符'
        });
    }
    
    // 从认证中间件获取用户信息
    const userId = req.user.userId;
    
    // 创建新笔记实例
    const newNote = new Note({
        content: content.trim(),        // 去除首尾空格
        user: userId,                   // 关联用户 ID
        title: title || undefined,      // 可选的标题字段
        tags: tags || [],               // 可选的标签字段
        x_axis: 0,
        y_axis: 0,
    });

    // 保存笔记到数据库
    await newNote.save();
    
    // 重新查询笔记，包含关联的用户信息
    const populatedNote = await newNote.populate('user', 'username');
    
    // 返回成功响应
    res.status(201).json({
        success: true,
        message: '笔记创建成功',
        data: {
            note: populatedNote,
            userId: userId
        }
    });
}));

/**
 * 更新笔记
 * PUT /api/notes/notes/:id
 * 功能：更新指定 ID 的笔记内容
 */
router.put('/notes/:id', protect, asyncHandler(async (req, res) => {
    // 从 URL 参数中获取笔记 ID
    const noteId = req.params.id;
    
    // 从请求体中提取更新数据
    const { content, title, tags, x_axis, y_axis } = req.body;
    
    // 输入验证：检查内容
    if (content !== undefined && content.trim() === '') {
        return res.status(400).json({
            success: false,
            message: '笔记内容不能为空'
        });
    }
    
    // 输入验证：检查内容长度
    if (content && content.length > 10000) {
        return res.status(400).json({
            success: false,
            message: '笔记内容不能超过 10000 个字符'
        });
    }
    
    // 从认证中间件获取用户信息
    const userId = req.user.userId;
    
    // 查找笔记并验证所有权
    const note = await Note.findOne({ _id: noteId, user: userId });
    if (!note) {
        return res.status(404).json({
            success: false,
            message: '笔记未找到或无权修改'
        });
    }
    
    // 构建更新数据
    const updateData = {};
    if (content !== undefined) updateData.content = content.trim();
    if (title !== undefined) updateData.title = title;
    if (tags !== undefined) updateData.tags = tags;
    if (x_axis !== undefined) updateData.x_axis = x_axis;
    if (y_axis !== undefined) updateData.y_axis = y_axis;
    
    // 更新笔记
    const updatedNote = await Note.findByIdAndUpdate(
        noteId,
        { ...updateData, updatedAt: new Date() },
        { 
            new: true,                    // 返回更新后的文档
            runValidators: true           // 运行验证器
        }
    ).populate('user', 'username');
    
    // 返回成功响应
    res.status(200).json({
        success: true,
        message: '笔记更新成功',
        data: {
            note: updatedNote,
            userId: userId
        }
    });
}));

/**
 * 删除笔记
 * DELETE /api/notes/notes/:id
 * 功能：删除指定 ID 的笔记
 */
router.delete('/notes/:id', protect, asyncHandler(async (req, res) => {
    // 从 URL 参数中获取笔记 ID
    const noteId = req.params.id;
    
    // 从认证中间件获取用户信息
    const userId = req.user.userId;
    
    // 查找笔记并验证所有权
    const note = await Note.findOne({ _id: noteId, user: userId });
    if (!note) {
        return res.status(404).json({
            success: false,
            message: '笔记未找到或无权删除'
        });
    }

    // 删除笔记
    await Note.findByIdAndDelete(noteId);
    
    // 返回成功响应
    res.status(200).json({
        success: true,
        message: '笔记删除成功',
        data: {
            deletedNoteId: noteId,
            userId: userId
        }
    });
}));

/**
 * 获取单个笔记详情
 * GET /api/notes/notes/:id
 * 功能：获取指定 ID 的笔记详细信息
 */
router.get('/notes/:id', protect, asyncHandler(async (req, res) => {
    // 从 URL 参数中获取笔记 ID
    const noteId = req.params.id;
    
    // 从认证中间件获取用户信息
    const userId = req.user.userId;
    
    // 查找笔记并验证所有权
    const note = await Note.findOne({ _id: noteId, user: userId })
        .populate('user', 'username')
        .lean();
        
    if (!note) {
        return res.status(404).json({
            success: false,
            message: '笔记未找到或无权访问'
        });
    }
    
    // 返回成功响应
    res.status(200).json({
        success: true,
        message: '获取笔记详情成功',
        data: {
            note: note,
            userId: userId
        }
    });
}));

// 导出路由器
module.exports = router; 