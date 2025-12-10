---
description: 项目开发规范与最佳实践指南
---

# 开发规范与最佳实践

## 一、代码风格规范

### 1.1 统一响应格式

所有 API 响应必须使用 `src/utils/response.js` 中的函数：

```javascript
const { success, badRequest, notFound, unauthorized } = require('src/utils/response');

// ✅ 正确
success(res, data, '获取成功');
badRequest(res, '参数错误');
notFound(res, '资源不存在');

// ❌ 错误 - 不要直接使用 res.json()
res.json({ success: true, data });
```

### 1.2 异步错误处理

所有异步路由处理函数必须使用 `asyncHandler` 包装：

```javascript
const asyncHandler = require('src/utils/asyncHandler');

// ✅ 正确
router.get('/', asyncHandler(async (req, res) => {
  const data = await Model.find();
  success(res, data);
}));

// ❌ 错误 - 异步错误不会被全局错误处理器捕获
router.get('/', async (req, res) => {
  const data = await Model.find();
  res.json(data);
});
```

## 二、路由编写规范

### 2.1 路由文件结构

```javascript
/**
 * 模块名称路由
 * 功能描述
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('src/middleware/authMiddleware');
const asyncHandler = require('src/utils/asyncHandler');
const { success, badRequest, notFound } = require('src/utils/response');
const Model = require('src/models/Model');

// ==================== GET 请求 ====================

// 获取列表
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const data = await Model.find({ userId: req.user.id })
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });
  success(res, data, '获取成功');
}));

// 获取单个
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await Model.findOne({ _id: req.params.id, userId: req.user.id });
  if (!item) {
    return notFound(res, '资源不存在');
  }
  success(res, item);
}));

// ==================== POST 请求 ====================

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, content } = req.body;
  if (!name) {
    return badRequest(res, '名称不能为空');
  }
  const item = await Model.create({ name, content, userId: req.user.id });
  success(res, item, '创建成功', 201);
}));

// ==================== PUT 请求 ====================

router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await Model.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    req.body,
    { new: true }
  );
  if (!item) {
    return notFound(res, '资源不存在');
  }
  success(res, item, '更新成功');
}));

// ==================== DELETE 请求 ====================

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await Model.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!item) {
    return notFound(res, '资源不存在');
  }
  success(res, null, '删除成功');
}));

module.exports = router;
```

### 2.2 注册新路由

在 `src/routes/api.js` 中添加：

```javascript
// 引入路由
const newFeatureRoutes = require('./newFeature');

// 注册路由
router.use('/new-feature', newFeatureRoutes);
```

## 三、Model 编写规范

### 3.1 Schema 定义

```javascript
const mongoose = require('mongoose');

const ExampleSchema = new mongoose.Schema({
  // 必填字段带验证
  name: {
    type: String,
    required: [true, '名称不能为空'],
    trim: true,
    maxlength: [100, '名称不能超过100个字符']
  },
  
  // 枚举字段
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  
  // 用户关联（必须）
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 数组字段
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
ExampleSchema.index({ userId: 1, createdAt: -1 });
ExampleSchema.index({ name: 'text' }); // 全文搜索索引

// 虚拟字段
ExampleSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.status})`;
});

// 静态方法
ExampleSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Example', ExampleSchema);
```

## 四、Git 提交规范

### 4.1 提交格式

```
<type>(<scope>): <subject>

[可选 body]

[可选 footer]
```

### 4.2 Type 类型

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响运行） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具 |

### 4.3 示例

```bash
feat(auth): 添加用户注册功能
fix(notes): 修复删除时未检查权限
docs(api): 更新接口文档
refactor(utils): 重构响应工具函数
```

## 五、文件命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| Model | 大驼峰单数 | `User.js`, `SharedNote.js` |
| Route | 驼峰复数 | `notes.js`, `sharedNotes.js` |
| Middleware | 驼峰+Middleware | `authMiddleware.js` |
| Util | 驼峰 | `asyncHandler.js` |
| Config | 小写 | `app.js`, `database.js` |

## 六、新功能开发流程

// turbo-all

```bash
# 1. 创建 Model（如需要）
touch src/models/NewFeature.js

# 2. 创建路由文件
touch src/routes/newFeature.js

# 3. 在 api.js 中注册路由
# router.use('/new-feature', require('./newFeature'));

# 4. 启动开发服务器测试
npm run dev

# 5. 更新 API 文档
# 编辑 API接口文档.md

# 6. 提交代码
git add .
git commit -m "feat(new-feature): 添加新功能模块"
```

## 七、代码审查清单

在提交 PR 前确认：

- [ ] 使用 `asyncHandler` 包装异步函数
- [ ] 使用统一响应格式
- [ ] 敏感接口添加 `authenticate` 中间件
- [ ] 有必要的输入验证
- [ ] 添加适当的代码注释
- [ ] 更新相关文档
- [ ] 没有 console.log 调试代码
- [ ] 没有硬编码的敏感信息

## 八、常用命令

```bash
# 安装依赖
npm install

# 开发环境（热重载）
npm run dev

# 生产环境
npm start

# LOL 数据采集
npm run collect:champions
npm run collect:items
npm run collect:all
```
