/**
 * 共享笔记本路由模块
 * 提供共享笔记本和共享笔记项的完整管理功能
 * 支持多人协作和权限控制
 */

const express = require('express');
const SharedNote = require('../models/SharedNote');
const SharedQuadrantNote = require('../models/SharedQuadrantNote');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/asyncHandler');

// 创建路由器实例
const router = express.Router();

// ==================== 共享笔记本管理接口 ====================

/**
 * 获取共享笔记本列表
 * GET /api/shared-notes
 * 功能：获取当前用户可访问的所有共享笔记本
 */
router.get('/', protect, asyncHandler(async (req, res) => {
    const username = req.user.username;

    // 获取用户可访问的共享笔记本
    const notes = await SharedNote.getUserAccessibleNotes(username);

    res.status(200).json({
        code: 200,
        message: 'success',
        data: {
            notes,
            count: notes.length
        }
    });
}));

/**
 * 创建共享笔记本
 * POST /api/shared-notes
 * 功能：创建新的共享笔记本
 */
router.post('/', protect, asyncHandler(async (req, res) => {
    const { title, participants } = req.body;
    const createdBy = req.user.username;

    // 验证必需字段
    if (!title) {
        return res.status(400).json({
            code: 400,
            message: '笔记本标题不能为空'
        });
    }

    // 验证参与者是否存在
    if (participants && participants.length > 0) {
        const existingUsers = await User.find({
            username: { $in: participants }
        }).select('username');

        const existingUsernames = existingUsers.map(u => u.username);
        const invalidUsers = participants.filter(p => !existingUsernames.includes(p));

        if (invalidUsers.length > 0) {
            return res.status(400).json({
                code: 400,
                message: `用户不存在: ${invalidUsers.join(', ')}`
            });
        }
    }

    // 创建共享笔记本
    const sharedNote = new SharedNote({
        title,
        createdBy,
        participants: participants || []
    });

    await sharedNote.save();

    res.status(200).json({
        code: 200,
        message: '共享笔记本创建成功',
        data: sharedNote
    });
}));

/**
 * 获取单个共享笔记本信息
 * GET /api/shared-notes/:id
 * 功能：获取指定共享笔记本的基本信息
 */
router.get('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const username = req.user.username;

    const sharedNote = await SharedNote.findById(id);

    if (!sharedNote) {
        return res.status(404).json({
            code: 404,
            message: '共享笔记本不存在'
        });
    }

    // 检查访问权限
    if (!sharedNote.hasAccessPermission(username)) {
        return res.status(403).json({
            code: 403,
            message: '无权访问此共享笔记本'
        });
    }

    res.status(200).json({
        code: 200,
        message: 'success',
        data: sharedNote
    });
}));

/**
 * 更新共享笔记本
 * PUT /api/shared-notes/:id
 * 功能：更新共享笔记本信息（仅创建者可操作）
 */
router.put('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, participants } = req.body;
    const username = req.user.username;

    const sharedNote = await SharedNote.findById(id);

    if (!sharedNote) {
        return res.status(404).json({
            code: 404,
            message: '共享笔记本不存在'
        });
    }

    // 检查编辑权限（仅创建者）
    if (!sharedNote.hasEditPermission(username)) {
        return res.status(403).json({
            code: 403,
            message: '只有创建者可以编辑共享笔记本'
        });
    }

    // 验证参与者是否存在
    if (participants && participants.length > 0) {
        const existingUsers = await User.find({
            username: { $in: participants }
        }).select('username');

        const existingUsernames = existingUsers.map(u => u.username);
        const invalidUsers = participants.filter(p => !existingUsernames.includes(p));

        if (invalidUsers.length > 0) {
            return res.status(400).json({
                code: 400,
                message: `用户不存在: ${invalidUsers.join(', ')}`
            });
        }
    }

    // 更新字段
    if (title) sharedNote.title = title;
    if (participants) await sharedNote.updateParticipants(participants);

    await sharedNote.save();

    res.status(200).json({
        code: 200,
        message: '更新成功',
        data: sharedNote
    });
}));

/**
 * 删除共享笔记本
 * DELETE /api/shared-notes/:id
 * 功能：删除共享笔记本（仅创建者可操作）
 */
router.delete('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const username = req.user.username;

    const sharedNote = await SharedNote.findById(id);

    if (!sharedNote) {
        return res.status(404).json({
            code: 404,
            message: '共享笔记本不存在'
        });
    }

    // 检查删除权限（仅创建者）
    if (!sharedNote.hasEditPermission(username)) {
        return res.status(403).json({
            code: 403,
            message: '只有创建者可以删除共享笔记本'
        });
    }

    // 删除共享笔记本下的所有笔记项
    await SharedQuadrantNote.deleteMany({ sharedNoteId: id });

    // 删除共享笔记本
    await SharedNote.findByIdAndDelete(id);

    res.status(200).json({
        code: 200,
        message: '删除成功'
    });
}));

// ==================== 共享笔记项管理接口 ====================

/**
 * 获取共享笔记本内的所有笔记项
 * GET /api/shared-notes/:id/notes
 * 功能：获取指定共享笔记本内的所有笔记项
 */
router.get('/:id/notes', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const username = req.user.username;

    // 检查共享笔记本是否存在和访问权限
    const sharedNote = await SharedNote.findById(id);

    if (!sharedNote) {
        return res.status(404).json({
            code: 404,
            message: '共享笔记本不存在'
        });
    }

    if (!sharedNote.hasAccessPermission(username)) {
        return res.status(403).json({
            code: 403,
            message: '无权访问此共享笔记本'
        });
    }

    // 获取笔记项
    const notes = await SharedQuadrantNote.getBySharedNoteId(id);

    res.status(200).json({
        code: 200,
        message: 'success',
        data: {
            notes,
            count: notes.length
        }
    });
}));

/**
 * 创建共享笔记项
 * POST /api/shared-notes/:id/notes
 * 功能：在指定共享笔记本中创建新的笔记项
 */
router.post('/:id/notes', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, content, tags, x_axis, y_axis, order } = req.body;
    const createdBy = req.user.username;

    // 检查共享笔记本是否存在和访问权限
    const sharedNote = await SharedNote.findById(id);

    if (!sharedNote) {
        return res.status(404).json({
            code: 404,
            message: '共享笔记本不存在'
        });
    }

    if (!sharedNote.hasAccessPermission(createdBy)) {
        return res.status(403).json({
            code: 403,
            message: '无权在此共享笔记本中创建笔记'
        });
    }

    // 验证必需字段
    if (!content) {
        return res.status(400).json({
            code: 400,
            message: '笔记内容不能为空'
        });
    }

    // 创建笔记项
    const note = new SharedQuadrantNote({
        title: title || '',
        content,
        tags: tags || [],
        x_axis: x_axis !== undefined ? x_axis : 0,
        y_axis: y_axis !== undefined ? y_axis : 0,
        order: order !== undefined ? order : 0,
        createdBy,
        sharedNoteId: id
    });

    await note.save();

    res.status(200).json({
        code: 200,
        message: '笔记创建成功',
        data: note
    });
}));

/**
 * 更新共享笔记项
 * PUT /api/shared-notes/notes/:noteId
 * 功能：更新指定的共享笔记项
 */
router.put('/notes/:noteId', protect, asyncHandler(async (req, res) => {
    const { noteId } = req.params;
    const { title, content, tags, x_axis, y_axis, order } = req.body;
    const username = req.user.username;

    const note = await SharedQuadrantNote.findById(noteId);

    if (!note) {
        return res.status(404).json({
            code: 404,
            message: '笔记项不存在'
        });
    }

    // 检查共享笔记本访问权限
    const sharedNote = await SharedNote.findById(note.sharedNoteId);
    if (!sharedNote || !sharedNote.hasAccessPermission(username)) {
        return res.status(403).json({
            code: 403,
            message: '无权访问此共享笔记本'
        });
    }

    // 对于内容和标题的修改，只有创建者才能操作
    if ((title !== undefined || content !== undefined || tags !== undefined) && !note.isCreator(username)) {
        return res.status(403).json({
            code: 403,
            message: '只有创建者可以修改笔记内容和标题'
        });
    }

    // 更新字段
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (tags !== undefined) note.tags = tags;
    if (x_axis !== undefined) note.x_axis = x_axis;
    if (y_axis !== undefined) note.y_axis = y_axis;
    if (order !== undefined) note.order = order;

    await note.save();

    res.status(200).json({
        code: 200,
        message: '更新成功',
        data: note
    });
}));

/**
 * 删除共享笔记项
 * DELETE /api/shared-notes/notes/:noteId
 * 功能：删除指定的共享笔记项（仅创建者可删除自己的笔记）
 */
router.delete('/notes/:noteId', protect, asyncHandler(async (req, res) => {
    const { noteId } = req.params;
    const username = req.user.username;

    const note = await SharedQuadrantNote.findById(noteId);

    if (!note) {
        return res.status(404).json({
            code: 404,
            message: '笔记项不存在'
        });
    }

    // 检查共享笔记本访问权限
    const sharedNote = await SharedNote.findById(note.sharedNoteId);
    if (!sharedNote || !sharedNote.hasAccessPermission(username)) {
        return res.status(403).json({
            code: 403,
            message: '无权访问此共享笔记本'
        });
    }

    // 只有创建者可以删除自己的笔记
    if (!note.isCreator(username)) {
        return res.status(403).json({
            code: 403,
            message: '只有创建者可以删除自己的笔记'
        });
    }

    await SharedQuadrantNote.findByIdAndDelete(noteId);

    res.status(200).json({
        code: 200,
        message: '删除成功'
    });
}));

// 导出路由器
module.exports = router;