/**
 * 学习记录管理路由
 */

const express = require('express');
const Subject = require('../models/Subject');
const StudyFile = require('../models/StudyFile');
const { protect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/asyncHandler');
const { success, created, updated, deleted, badRequest, notFound, error } = require('../utils/response');

const router = express.Router();

// 统一应用鉴权
router.use(protect);

// ==================== 科目管理 ====================

/**
 * 创建科目
 * POST /api/study/subjects
 */
router.post('/subjects', asyncHandler(async (req, res) => {
  const { name, description, color, icon } = req.body || {};

  if (!name) {
    return badRequest(res, '科目名称不能为空');
  }

  const doc = await Subject.create({
    user: req.user.userId,
    name: String(name).trim(),
    description: description ? String(description).trim() : undefined,
    color: color || '#3B82F6',
    icon: icon ? String(icon).trim() : undefined
  });

  return created(res, {
    id: doc._id,
    name: doc.name,
    description: doc.description,
    color: doc.color,
    icon: doc.icon,
    isPinned: doc.isPinned,
    fileCount: 0,
    createdAt: doc.createdAt
  }, '科目创建成功');
}));

/**
 * 获取科目列表
 * GET /api/study/subjects
 */
router.get('/subjects', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, sort = 'createdAt', order = 'desc' } = req.query;

  const query = { user: req.user.userId };
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const sortObj = {};
  sortObj[sort] = order === 'desc' ? -1 : 1;
  if (sort !== 'isPinned') {
    sortObj.isPinned = -1;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  const [subjects, total] = await Promise.all([
    Subject.find(query)
      .select('name description color icon isPinned sortWeight createdAt updatedAt lastEditedAt')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Subject.countDocuments(query)
  ]);

  // 获取每个科目的文件数量
  const subjectsWithFileCount = await Promise.all(
    subjects.map(async (subject) => {
      const fileCount = await StudyFile.countDocuments({ subject: subject._id });
      return {
        ...subject,
        fileCount
      };
    })
  );

  return success(res, {
    items: subjectsWithFileCount,
    pagination: {
      page: parseInt(page),
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  }, '获取科目列表成功');
}));

/**
 * 获取科目详情
 * GET /api/study/subjects/:id
 */
router.get('/subjects/:id', asyncHandler(async (req, res) => {
  const doc = await Subject.findOne({ _id: req.params.id, user: req.user.userId })
    .select('name description color icon isPinned sortWeight createdAt updatedAt lastEditedAt')
    .lean();

  if (!doc) return notFound(res, '科目不存在');

  // 获取文件数量
  const fileCount = await StudyFile.countDocuments({ subject: req.params.id });

  return success(res, {
    ...doc,
    fileCount
  }, '获取科目详情成功');
}));

/**
 * 更新科目
 * PUT /api/study/subjects/:id
 */
router.put('/subjects/:id', asyncHandler(async (req, res) => {
  const { name, description, color, icon, isPinned, sortWeight } = req.body || {};

  const update = {};
  
  if (name !== undefined) update.name = String(name).trim();
  if (description !== undefined) update.description = description ? String(description).trim() : undefined;
  if (color !== undefined) update.color = color;
  if (icon !== undefined) update.icon = icon ? String(icon).trim() : undefined;
  if (isPinned !== undefined) update.isPinned = isPinned === 'true' || isPinned === true;
  if (sortWeight !== undefined) update.sortWeight = parseInt(sortWeight) || 0;

  const doc = await Subject.findOneAndUpdate(
    { _id: req.params.id, user: req.user.userId },
    { $set: update },
    { new: true }
  ).select('name description color icon isPinned sortWeight createdAt updatedAt lastEditedAt');

  if (!doc) return notFound(res, '科目不存在或无权限');
  
  return updated(res, doc, '科目更新成功');
}));

/**
 * 删除科目
 * DELETE /api/study/subjects/:id
 */
router.delete('/subjects/:id', asyncHandler(async (req, res) => {
  const doc = await Subject.findOne({ _id: req.params.id, user: req.user.userId });
  if (!doc) return notFound(res, '科目不存在或已删除');

  // 删除科目下的所有文件
  await StudyFile.deleteMany({ subject: req.params.id });

  // 删除科目
  await Subject.findByIdAndDelete(req.params.id);
  
  return deleted(res, '科目删除成功');
}));

/**
 * 切换科目置顶状态
 * PATCH /api/study/subjects/:id/pin
 */
router.patch('/subjects/:id/pin', asyncHandler(async (req, res) => {
  const doc = await Subject.findOneAndUpdate(
    { _id: req.params.id, user: req.user.userId },
    [{ $set: { isPinned: { $not: '$isPinned' } } }],
    { new: true }
  ).select('isPinned');

  if (!doc) return notFound(res, '科目不存在');
  
  return success(res, { isPinned: doc.isPinned }, `已${doc.isPinned ? '置顶' : '取消置顶'}`);
}));

// ==================== 文件管理 ====================

/**
 * 创建文件
 * POST /api/study/subjects/:id/files
 */
router.post('/subjects/:subjectId/files', asyncHandler(async (req, res) => {
  const { fileName, title, content } = req.body || {};

  if (!fileName || !title) {
    return badRequest(res, '文件名和标题不能为空');
  }

  // 检查文件名格式
  if (!fileName.endsWith('.md')) {
    return badRequest(res, '文件名必须以.md结尾');
  }

  // 检查科目是否存在
  const subject = await Subject.findOne({ _id: req.params.subjectId, user: req.user.userId });
  if (!subject) return notFound(res, '科目不存在');

  const doc = await StudyFile.create({
    subject: req.params.subjectId,
    user: req.user.userId,
    fileName: String(fileName).trim(),
    title: String(title).trim(),
    content: content || ''
  });

  return created(res, {
    id: doc._id,
    fileName: doc.fileName,
    title: doc.title,
    content: doc.content,
    size: doc.size,
    isPinned: doc.isPinned,
    createdAt: doc.createdAt
  }, '文件创建成功');
}));

/**
 * 获取科目下的文件列表
 * GET /api/study/subjects/:id/files
 */
router.get('/subjects/:subjectId/files', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, sort = 'createdAt', order = 'desc' } = req.query;

  // 检查科目是否存在
  const subject = await Subject.findOne({ _id: req.params.subjectId, user: req.user.userId });
  if (!subject) return notFound(res, '科目不存在');

  const query = { subject: req.params.subjectId };
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];
  }

  const sortObj = {};
  sortObj[sort] = order === 'desc' ? -1 : 1;
  if (sort !== 'isPinned') {
    sortObj.isPinned = -1;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);

  const [files, total] = await Promise.all([
    StudyFile.find(query)
      .select('fileName title content size isPinned sortWeight createdAt updatedAt lastEditedAt')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    StudyFile.countDocuments(query)
  ]);

  return success(res, {
    items: files,
    pagination: {
      page: parseInt(page),
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  }, '获取文件列表成功');
}));

/**
 * 获取文件内容
 * GET /api/study/subjects/:id/files/:fileName
 */
router.get('/subjects/:subjectId/files/:fileName', asyncHandler(async (req, res) => {
  const { fileName } = req.params;

  // 检查科目是否存在
  const subject = await Subject.findOne({ _id: req.params.subjectId, user: req.user.userId });
  if (!subject) return notFound(res, '科目不存在');

  const doc = await StudyFile.findOne({ 
    subject: req.params.subjectId, 
    fileName: fileName 
  }).select('fileName title content size isPinned createdAt updatedAt lastEditedAt');

  if (!doc) return notFound(res, '文件不存在');

  return success(res, doc, '获取文件内容成功');
}));

/**
 * 更新文件
 * PUT /api/study/subjects/:id/files/:fileName
 */
router.put('/subjects/:subjectId/files/:fileName', asyncHandler(async (req, res) => {
  const { fileName } = req.params;
  const { title, content, isPinned, sortWeight } = req.body || {};

  // 检查科目是否存在
  const subject = await Subject.findOne({ _id: req.params.subjectId, user: req.user.userId });
  if (!subject) return notFound(res, '科目不存在');

  const update = {};
  
  if (title !== undefined) update.title = String(title).trim();
  if (content !== undefined) update.content = content;
  if (isPinned !== undefined) update.isPinned = isPinned === 'true' || isPinned === true;
  if (sortWeight !== undefined) update.sortWeight = parseInt(sortWeight) || 0;

  const doc = await StudyFile.findOneAndUpdate(
    { subject: req.params.subjectId, fileName: fileName },
    { $set: update },
    { new: true }
  ).select('fileName title content size isPinned createdAt updatedAt lastEditedAt');

  if (!doc) return notFound(res, '文件不存在');
  
  return updated(res, doc, '文件更新成功');
}));

/**
 * 删除文件
 * DELETE /api/study/subjects/:id/files/:fileName
 */
router.delete('/subjects/:subjectId/files/:fileName', asyncHandler(async (req, res) => {
  const { fileName } = req.params;

  // 检查科目是否存在
  const subject = await Subject.findOne({ _id: req.params.subjectId, user: req.user.userId });
  if (!subject) return notFound(res, '科目不存在');

  const doc = await StudyFile.findOneAndDelete({ 
    subject: req.params.subjectId, 
    fileName: fileName 
  });

  if (!doc) return notFound(res, '文件不存在或已删除');
  
  return deleted(res, '文件删除成功');
}));

/**
 * 切换文件置顶状态
 * PATCH /api/study/subjects/:id/files/:fileName/pin
 */
router.patch('/subjects/:subjectId/files/:fileName/pin', asyncHandler(async (req, res) => {
  const { fileName } = req.params;

  // 检查科目是否存在
  const subject = await Subject.findOne({ _id: req.params.subjectId, user: req.user.userId });
  if (!subject) return notFound(res, '科目不存在');

  const doc = await StudyFile.findOneAndUpdate(
    { subject: req.params.subjectId, fileName: fileName },
    [{ $set: { isPinned: { $not: '$isPinned' } } }],
    { new: true }
  ).select('isPinned');

  if (!doc) return notFound(res, '文件不存在');
  
  return success(res, { isPinned: doc.isPinned }, `已${doc.isPinned ? '置顶' : '取消置顶'}`);
}));

// ==================== 统计信息 ====================

/**
 * 获取学习记录统计
 * GET /api/study/stats
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const [subjectStats, fileStats] = await Promise.all([
    Subject.getUserStats(req.user.userId),
    StudyFile.getUserStats(req.user.userId)
  ]);

  return success(res, {
    subjects: subjectStats[0] || {},
    files: fileStats[0] || {}
  }, '获取统计信息成功');
}));

module.exports = router;
