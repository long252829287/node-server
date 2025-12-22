# Node.js 直播平台API服务器

## 🏗️ 项目架构

```json
src/
├── server.js          # 服务器启动文件
├── app.js             # Express应用配置
├── config/            # 配置文件目录
├── routes/            # 路由层
├── controllers/       # 控制器层
├── services/          # 服务层
├── middleware/        # 中间件
├── utils/             # 工具类
└── validators/        # 数据验证器
```

## 📦 技术栈

### 核心框架

- **Node.js**: JavaScript运行时环境
- **Express**: Web应用框架
- **MongoDB**: 数据库（通过Mongoose）

### 安全中间件
- **Helmet**: 安全头设置
- **CORS**: 跨域资源共享
- **express-rate-limit**: 请求频率限制

### 性能优化
- **compression**: 响应压缩
- **morgan**: HTTP请求日志

### 开发工具
- **nodemon**: 开发环境自动重启
- **dotenv**: 环境变量管理

## 🛠️ 安装和运行

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB (本地或远程)

### 安装依赖
```bash
npm install
```

### 环境配置
1. 复制环境变量示例文件：
```bash
cp .env.example .env
```

2. 修改 `.env` 文件中的配置：
```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/lyl_dev

# CORS配置
CORS_ORIGIN=*
```

### 启动服务

#### 开发环境
```bash
npm run dev
```
使用nodemon自动重启，适合开发调试。

#### 生产环境
```bash
npm start
```
直接启动Node.js服务。

## 📡 API接口

### 基础信息
- **根路径**: `GET /` - 返回API信息和使用说明




## 🔒 安全特性

### 请求限流
- **全局限流**: 每个IP 15分钟内最多100次请求
- **API限流**: 每个IP 15分钟内最多50次API请求
- **健康检查**: 不受限流影响

### 安全头设置
- 防止XSS、CSRF等常见攻击
- 支持HTTPS和HSTS
- 可配置内容安全策略

### CORS配置
- 可配置允许的源域名
- 支持凭证传递
- 限制允许的HTTP方法

## 🗄️ 数据库配置

### 开发环境
- 本地MongoDB实例
- 连接池大小：10
- 超时配置：5秒选择，45秒Socket

### 生产环境
- 生产MongoDB实例
- 连接池大小：50
- 支持SSL连接
- 更严格的超时配置

## 📊 日志系统

### 开发环境
- 详细请求信息
- 包含请求体内容
- 响应时间记录

### 生产环境
- 标准访问日志格式
- 跳过健康检查日志
- 支持日志级别配置

## 🚀 性能优化

- **响应压缩**: 支持gzip、deflate等压缩算法
- **连接池管理**: 数据库连接复用
- **请求限流**: 防止过载和滥用
- **静态文件服务**: 高效的静态资源访问

## 🔧 配置说明

### 应用配置 (`src/config/app.js`)
- 端口和环境设置
- CORS和限流配置
- 安全和日志配置

### 数据库配置 (`src/config/database.js`)
- 连接URI和选项
- 环境相关配置
- 连接池和超时设置

## 📝 开发指南

### 添加新路由
1. 在 `src/routes/` 目录创建路由文件
2. 在 `src/routes/index.js` 中注册路由
3. 创建对应的控制器和服务

### 添加新中间件
1. 在 `src/middleware/` 目录创建中间件文件
2. 在 `src/app.js` 中注册中间件
3. 注意中间件的执行顺序

### 错误处理
- 使用 `src/utils/response.js` 中的统一响应函数
- 异步函数使用 `asyncHandler` 包装
- 全局错误处理在 `src/middleware/errorHandler.js`

## 🚀 部署说明

### 生产环境部署
1. 设置正确的环境变量
2. 配置MongoDB连接
3. 启用所有安全配置
4. 配置反向代理（如Nginx）
5. 使用进程管理器（如PM2）

### Docker部署
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 测试

### 运行测试
```bash
npm test
```

### API测试
使用Postman或其他API测试工具测试各个端点。

## 📚 相关文档

- [项目详细说明](./项目详细说明.md) - 完整的项目架构和代码说明
- [踩坑记录](./踩坑记录.md) - 开发过程中遇到的问题和解决方案
- [Node学习记录](./node学习记录.md) - Node.js学习笔记

## 同步脚本

- 同步海克斯大乱斗装备： npm run sync:items -- --mode hex_brawl --locale zh_CN
