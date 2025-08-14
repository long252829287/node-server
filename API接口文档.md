# API接口文档

## 概述
本文档详细描述了Node.js服务器提供的所有API接口，包括认证、笔记管理、健康检查等功能的完整使用说明。

## 基础信息
- **基础URL**: `http://localhost:3000`
- **API前缀**: `/api`
- **认证方式**: JWT Token (Bearer Token)
- **响应格式**: JSON
- **字符编码**: UTF-8

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误描述",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": "详细错误信息"
}
```

## 认证相关接口

### 1. 用户注册
- **接口**: `POST /api/auth/register`
- **描述**: 用户注册（支持昵称nickname，自动生成唯一uid）
- **认证**: 无需认证
- **请求参数**:
  ```json
  {
    "username": "string",     // 用户名（必填）
    "password": "string",     // 密码（必填）
    "nickname": "string",     // 昵称（可选）
    "email": "string"         // 邮箱（可选）
  }
  ```
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "用户注册成功",
    "data": {
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "uid": "u_abc12345",
        "username": "testuser",
        "nickname": "测试用户",
        "email": "test@example.com",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

### 2. 用户登录
- **接口**: `POST /api/auth/login`
- **描述**: 用户登录
- **认证**: 无需认证
- **请求参数**:
  ```json
  {
    "username": "string",     // 用户名
    "password": "string"      // 密码
  }
  ```
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "登录成功",
    "data": {
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "uid": "u_abc12345",
        "username": "testuser",
        "nickname": "测试用户",
        "email": "test@example.com"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

### 3. 用户登出
- **接口**: `POST /api/auth/logout`
- **描述**: 用户登出
- **认证**: 需要认证
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "登出成功"
  }
  ```

### 4. 获取当前用户信息
- **接口**: `GET /api/auth/me`
- **描述**: 获取当前登录用户信息
- **认证**: 需要认证
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "获取用户信息成功",
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "uid": "u_abc12345",
      "username": "testuser",
      "nickname": "测试用户",
      "email": "test@example.com",
      "role": "user",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### 5. 更新用户资料
- **接口**: `PUT /api/auth/profile`
- **描述**: 更新用户资料
- **认证**: 需要认证
- **请求参数**:
  ```json
  {
    "nickname": "string",     // 昵称（可选）
    "email": "string",        // 邮箱（可选）
    "bio": "string",          // 个人简介（可选）
    "gender": "string",       // 性别（可选）
    "birthDate": "string",    // 生日（可选）
    "location": "string",     // 位置（可选）
    "website": "string"       // 个人网站（可选）
  }
  ```
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "资料更新成功",
    "data": {
      "profile": {
        "displayName": "新昵称",
        "bio": "个人简介",
        "gender": "male",
        "birthDate": "1990-01-01",
        "location": "北京",
        "website": "https://example.com"
      }
    }
  }
  ```

### 6. 刷新令牌
- **接口**: `POST /api/auth/refresh`
- **描述**: 刷新JWT令牌
- **认证**: 需要认证
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "令牌刷新成功",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

## 笔记管理接口

### 1. 获取笔记列表
- **接口**: `GET /api/notes`
- **描述**: 获取当前用户的笔记列表
- **认证**: 需要认证
- **请求参数**:
  - `page` (可选): 页码，默认1
  - `limit` (可选): 每页数量，默认10
  - `status` (可选): 状态筛选 (draft, published, archived)
  - `type` (可选): 类型筛选 (note, article, todo)
  - `tags` (可选): 标签筛选，多个标签用逗号分隔
  - `search` (可选): 搜索关键词
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "笔记列表获取成功",
    "data": {
      "notes": [
        {
          "_id": "507f1f77bcf86cd799439011",
          "title": "笔记标题",
          "content": "笔记内容",
          "tags": ["标签1", "标签2"],
          "status": "published",
          "type": "note",
          "isPinned": false,
          "isPublic": false,
          "readCount": 0,
          "favoriteCount": 0,
          "createdAt": "2024-01-01T00:00:00.000Z",
          "updatedAt": "2024-01-01T00:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 1,
        "pages": 1
      }
    }
  }
  ```

### 2. 创建笔记
- **接口**: `POST /api/notes`
- **描述**: 创建新笔记
- **认证**: 需要认证
- **请求参数**:
  ```json
  {
    "title": "string",        // 标题（必填）
    "content": "string",      // 内容（必填）
    "tags": ["string"],       // 标签（可选）
    "status": "string",       // 状态（可选，默认draft）
    "type": "string",         // 类型（可选，默认note）
    "isPinned": "boolean",    // 是否置顶（可选）
    "isPublic": "boolean"     // 是否公开（可选）
  }
  ```
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "笔记创建成功",
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "title": "新笔记",
      "content": "笔记内容",
      "tags": ["标签1"],
      "status": "draft",
      "type": "note",
      "isPinned": false,
      "isPublic": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### 3. 获取单个笔记
- **接口**: `GET /api/notes/:id`
- **描述**: 获取指定笔记详情
- **认证**: 需要认证
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "笔记获取成功",
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "title": "笔记标题",
      "content": "笔记内容",
      "tags": ["标签1", "标签2"],
      "status": "published",
      "type": "note",
      "isPinned": false,
      "isPublic": false,
      "readCount": 5,
      "favoriteCount": 2,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### 4. 更新笔记
- **接口**: `PUT /api/notes/:id`
- **描述**: 更新指定笔记
- **认证**: 需要认证
- **请求参数**:
  ```json
  {
    "title": "string",        // 标题（可选）
    "content": "string",      // 内容（可选）
    "tags": ["string"],       // 标签（可选）
    "status": "string",       // 状态（可选）
    "type": "string",         // 类型（可选）
    "isPinned": "boolean",    // 是否置顶（可选）
    "isPublic": "boolean"     // 是否公开（可选）
  }
  ```
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "笔记更新成功",
    "data": {
      "_id": "507f1f77bcf86cd799439011",
      "title": "更新后的标题",
      "content": "更新后的内容",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### 5. 删除笔记
- **接口**: `DELETE /api/notes/:id`
- **描述**: 删除指定笔记
- **认证**: 需要认证
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "笔记删除成功"
  }
  ```

## 用户管理接口

### 1. 获取用户列表
- **接口**: `GET /api/users`
- **描述**: 查询所有用户，返回用户名和昵称
- **认证**: 建议管理员权限
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "用户列表获取成功",
    "data": [
      {
        "username": "user1",
        "nickname": "用户一"
      },
      {
        "username": "user2",
        "nickname": "用户二"
      }
    ]
  }
  ```

## 系统接口


### 1. API状态
- **接口**: `GET /api/status`
- **描述**: 获取API服务状态
- **认证**: 无需认证
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "API服务运行正常",
    "data": {
      "status": "running",
      "version": "1.0.0",
      "environment": "development",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

### 2. API统计
- **接口**: `GET /api/stats`
- **描述**: 获取API使用统计
- **认证**: 无需认证
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "统计信息获取成功",
    "data": {
      "totalRequests": 1000,
      "activeUsers": 50,
      "totalNotes": 200,
      "totalUsers": 100,
      "uptime": 3600
    }
  }
  ```

### 3. API列表
- **接口**: `GET /api`
- **描述**: 获取所有可用的API接口列表
- **认证**: 无需认证
- **请求参数**: 无
- **响应示例**:
  ```json
  {
    "success": true,
    "message": "API列表获取成功",
    "data": {
      "endpoints": {
        "notes": {
          "path": "/api/notes",
          "description": "笔记管理API"
        },
        "auth": {
          "path": "/api/auth",
          "description": "用户认证和授权服务"
        }
      }
    }
  }
  ```

## 认证头设置

对于需要认证的接口，请在请求头中添加：

```
Authorization: Bearer <your_jwt_token>
```

示例：
```javascript
// JavaScript/TypeScript
const response = await fetch('/api/notes', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json'
  }
});
```

## 错误码说明

| HTTP状态码 | 说明 |
|------------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |

## 使用示例

### 前端JavaScript示例

#### 用户注册
```javascript
async function registerUser(userData) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    const result = await response.json();
    if (result.success) {
      // 保存token到localStorage
      localStorage.setItem('token', result.data.token);
      return result.data.user;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('注册失败:', error);
    throw error;
  }
}

// 使用示例
const userData = {
  username: 'testuser',
  password: 'password123',
  nickname: '测试用户',
  email: 'test@example.com'
};

registerUser(userData)
  .then(user => console.log('注册成功:', user))
  .catch(error => console.error('注册失败:', error));
```

#### 用户登录
```javascript
async function loginUser(credentials) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    const result = await response.json();
    if (result.success) {
      localStorage.setItem('token', result.data.token);
      return result.data.user;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

// 使用示例
const credentials = {
  username: 'testuser',
  password: 'password123'
};

loginUser(credentials)
  .then(user => console.log('登录成功:', user))
  .catch(error => console.error('登录失败:', error));
```

#### 获取笔记列表
```javascript
async function getNotes(token, params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`/api/notes?${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('获取笔记失败:', error);
    throw error;
  }
}

// 使用示例
const token = localStorage.getItem('token');
const params = {
  page: 1,
  limit: 10,
  status: 'published',
  tags: '工作,学习'
};

getNotes(token, params)
  .then(data => console.log('笔记列表:', data))
  .catch(error => console.error('获取笔记失败:', error));
```

#### 创建笔记
```javascript
async function createNote(token, noteData) {
  try {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(noteData)
    });
    
    const result = await response.json();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('创建笔记失败:', error);
    throw error;
  }
}

// 使用示例
const noteData = {
  title: '新笔记',
  content: '这是笔记内容',
  tags: ['工作', '学习'],
  status: 'draft',
  type: 'note',
  isPinned: false,
  isPublic: false
};

createNote(token, noteData)
  .then(note => console.log('笔记创建成功:', note))
  .catch(error => console.error('创建笔记失败:', error));
```

### 前端Vue.js示例

#### 创建Vue组件
```vue
<template>
  <div class="notes-container">
    <div class="notes-header">
      <h2>我的笔记</h2>
      <button @click="showCreateForm = true">新建笔记</button>
    </div>
    
    <div class="notes-list">
      <div v-for="note in notes" :key="note._id" class="note-item">
        <h3>{{ note.title }}</h3>
        <p>{{ note.content }}</p>
        <div class="note-tags">
          <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
        <div class="note-actions">
          <button @click="editNote(note)">编辑</button>
          <button @click="deleteNote(note._id)">删除</button>
        </div>
      </div>
    </div>
    
    <!-- 创建笔记表单 -->
    <div v-if="showCreateForm" class="create-form">
      <h3>新建笔记</h3>
      <form @submit.prevent="handleCreateNote">
        <input v-model="newNote.title" placeholder="标题" required />
        <textarea v-model="newNote.content" placeholder="内容" required></textarea>
        <input v-model="newNote.tags" placeholder="标签（用逗号分隔）" />
        <button type="submit">创建</button>
        <button type="button" @click="showCreateForm = false">取消</button>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NotesList',
  data() {
    return {
      notes: [],
      showCreateForm: false,
      newNote: {
        title: '',
        content: '',
        tags: ''
      }
    };
  },
  async mounted() {
    await this.loadNotes();
  },
  methods: {
    async loadNotes() {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/notes', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        if (result.success) {
          this.notes = result.data.notes;
        }
      } catch (error) {
        console.error('加载笔记失败:', error);
      }
    },
    
    async handleCreateNote() {
      try {
        const token = localStorage.getItem('token');
        const noteData = {
          ...this.newNote,
          tags: this.newNote.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        };
        
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(noteData)
        });
        
        const result = await response.json();
        if (result.success) {
          this.notes.unshift(result.data);
          this.showCreateForm = false;
          this.newNote = { title: '', content: '', tags: '' };
        }
      } catch (error) {
        console.error('创建笔记失败:', error);
      }
    },
    
    editNote(note) {
      // 实现编辑功能
      console.log('编辑笔记:', note);
    },
    
    async deleteNote(noteId) {
      if (confirm('确定要删除这个笔记吗？')) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/notes/${noteId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          const result = await response.json();
          if (result.success) {
            this.notes = this.notes.filter(note => note._id !== noteId);
          }
        } catch (error) {
          console.error('删除笔记失败:', error);
        }
      }
    }
  }
};
</script>
```

## 注意事项

1. **Token管理**: JWT token有过期时间，建议在token过期前自动刷新
2. **错误处理**: 所有API调用都应该包含适当的错误处理
3. **请求频率**: 注意API的速率限制，避免过于频繁的请求
4. **数据验证**: 前端也应该进行基本的数据验证，提供更好的用户体验
5. **安全性**: 不要在客户端代码中硬编码敏感信息

## 更新日志

- **v1.0.0**: 初始版本，包含用户认证、笔记管理、系统接口等基础功能
- 支持用户注册、登录、登出
- 支持笔记的增删改查
- 提供系统健康检查和状态监控 