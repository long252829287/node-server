/**
 * Swagger API 文档配置
 * 使用 swagger-jsdoc 自动从 JSDoc 注释生成 OpenAPI 规范文档
 */

const swaggerJsdoc = require('swagger-jsdoc');

// Swagger 定义
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'LYL API Server',
    version: '1.0.0',
    description: `
## 项目介绍
LYL API Server 是一个多功能后端 API 服务器，提供以下核心功能：

- 🔐 **用户认证** - 注册、登录、JWT 认证
- 📝 **笔记管理** - 个人笔记 CRUD
- 👥 **共享笔记** - 多人协作笔记本
- 🔑 **凭据管理** - 账号密码加密存储
- 🎮 **LOL 数据** - 英雄、装备、符文、攻略查询

## 认证方式
除公开接口外，所有接口需要在请求头中携带 JWT Token：
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## 响应格式
所有接口返回统一的 JSON 格式：
\`\`\`json
{
  "success": true/false,
  "message": "操作结果描述",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`
    `,
    contact: {
      name: 'LYL API Support',
      email: 'support@example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: '开发环境'
    },
    {
      url: 'https://api.example.com',
      description: '生产环境'
    }
  ],
  tags: [
    {
      name: 'Auth',
      description: '用户认证相关接口'
    },
    {
      name: 'Notes',
      description: '笔记管理接口'
    },
    {
      name: 'SharedNotes',
      description: '共享笔记接口'
    },
    {
      name: 'Credentials',
      description: '凭据管理接口'
    },
    {
      name: 'Champions',
      description: 'LOL 英雄数据接口'
    },
    {
      name: 'Items',
      description: 'LOL 装备数据接口'
    },
    {
      name: 'Runes',
      description: 'LOL 符文数据接口'
    },
    {
      name: 'Strategies',
      description: 'LOL 攻略数据接口'
    },
    {
      name: 'System',
      description: '系统状态接口'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '在下方输入 JWT Token（不需要 Bearer 前缀）'
      }
    },
    schemas: {
      // 通用响应格式
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: '操作成功'
          },
          data: {
            type: 'object'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: '操作失败'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      // 用户相关
      User: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          uid: {
            type: 'string',
            example: 'u_abc12345'
          },
          username: {
            type: 'string',
            example: 'testuser'
          },
          nickname: {
            type: 'string',
            example: '测试用户'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'test@example.com'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      RegisterInput: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 20,
            example: 'testuser'
          },
          password: {
            type: 'string',
            minLength: 6,
            example: 'password123'
          },
          nickname: {
            type: 'string',
            example: '测试用户'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'test@example.com'
          }
        }
      },
      LoginInput: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: {
            type: 'string',
            example: 'testuser'
          },
          password: {
            type: 'string',
            example: 'password123'
          }
        }
      },
      // 笔记相关
      Note: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          },
          title: {
            type: 'string',
            example: '我的笔记'
          },
          content: {
            type: 'string',
            example: '笔记内容...'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['工作', '学习']
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            example: 'published'
          },
          type: {
            type: 'string',
            enum: ['note', 'article', 'todo'],
            example: 'note'
          },
          isPinned: {
            type: 'boolean',
            example: false
          },
          isPublic: {
            type: 'boolean',
            example: false
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      NoteInput: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title: {
            type: 'string',
            example: '新笔记'
          },
          content: {
            type: 'string',
            example: '笔记内容'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['工作']
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            default: 'draft'
          },
          type: {
            type: 'string',
            enum: ['note', 'article', 'todo'],
            default: 'note'
          },
          isPinned: {
            type: 'boolean',
            default: false
          },
          isPublic: {
            type: 'boolean',
            default: false
          }
        }
      },
      // 分页信息
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            example: 1
          },
          limit: {
            type: 'integer',
            example: 10
          },
          total: {
            type: 'integer',
            example: 100
          },
          pages: {
            type: 'integer',
            example: 10
          }
        }
      },
      // LOL 英雄
      Champion: {
        type: 'object',
        properties: {
          _id: {
            type: 'string'
          },
          id: {
            type: 'string',
            example: 'Ahri'
          },
          key: {
            type: 'string',
            example: '103'
          },
          name: {
            type: 'string',
            example: '阿狸'
          },
          title: {
            type: 'string',
            example: '九尾妖狐'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            example: ['Mage', 'Assassin']
          },
          difficulty: {
            type: 'integer',
            example: 5
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

// Swagger 选项
const options = {
  swaggerDefinition,
  // 扫描路由文件中的 JSDoc 注释
  apis: [
    './src/routes/*.js',
    './src/models/*.js'
  ]
};

// 生成 Swagger 规范
const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
