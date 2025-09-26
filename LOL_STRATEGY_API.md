# 英雄联盟攻略系统 API 文档

## 概述

英雄联盟攻略系统提供完整的英雄、装备和出装攻略管理功能。系统包含英雄数据查询、装备信息获取、攻略创建与管理等核心功能。

**基础URL**: `http://localhost:3000/api`

## 认证

部分接口需要用户认证，在请求头中包含JWT令牌：

```
Authorization: Bearer <your_jwt_token>
```

## 响应格式

### 成功响应
```json
{
  "success": true,
  "message": "操作成功",
  "data": {...}
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误信息",
  "error": "详细错误信息"
}
```

---

## 英雄接口 (Champions)

### 1. 获取英雄列表

**GET** `/api/champions`

获取所有英雄列表，支持搜索、过滤和分页。

**查询参数**:
- `search` (string, 可选): 搜索关键词，匹配英雄名称、标题或key
- `tags` (string[], 可选): 英雄标签过滤，多个用逗号分隔
- `page` (number, 可选, 默认1): 页码
- `limit` (number, 可选, 默认50): 每页数量，最大100
- `sort` (string, 可选, 默认name): 排序字段 (name, createdAt, key)
- `order` (string, 可选, 默认asc): 排序方式 (asc, desc)

**响应示例**:
```json
{
  "success": true,
  "message": "英雄列表获取成功",
  "data": {
    "champions": [
      {
        "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
        "riotId": "266",
        "key": "Aatrox",
        "name": "暗裔剑魔",
        "title": "亚托克斯",
        "description": "曾经是恕瑞玛最受崇敬的战士之一...",
        "images": {
          "square": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Aatrox.png",
          "splash": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aatrox_0.jpg",
          "loading": "https://ddragon.leagueoflegends.com/cdn/img/champion/loading/Aatrox_0.jpg"
        },
        "tags": ["Fighter", "Tank"],
        "stats": {
          "difficulty": 4
        },
        "version": "13.24.1"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 4,
      "totalCount": 168,
      "limit": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 2. 获取英雄详情

**GET** `/api/champions/{identifier}`

根据英雄ID、key或riotId获取英雄详细信息。

**路径参数**:
- `identifier` (string): 英雄的ID、key或riotId

**响应示例**:
```json
{
  "success": true,
  "message": "英雄详情获取成功",
  "data": {
    "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
    "riotId": "266",
    "key": "Aatrox",
    "name": "暗裔剑魔",
    "title": "亚托克斯",
    "description": "曾经是恕瑞玛最受崇敬的战士之一，亚托克斯是一个传奇的战士，带着古老的诅咒。",
    "images": {
      "square": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Aatrox.png",
      "splash": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aatrox_0.jpg",
      "loading": "https://ddragon.leagueoflegends.com/cdn/img/champion/loading/Aatrox_0.jpg",
      "passive": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/passive/Aatrox_Passive.png"
    },
    "tags": ["Fighter", "Tank"],
    "stats": {
      "difficulty": 4
    },
    "version": "13.24.1",
    "createdAt": "2024-09-26T06:00:00.000Z",
    "updatedAt": "2024-09-26T06:00:00.000Z"
  }
}
```

### 3. 获取英雄标签列表

**GET** `/api/champions/tags/list`

获取所有可用的英雄标签和统计信息。

**响应示例**:
```json
{
  "success": true,
  "message": "英雄标签获取成功",
  "data": {
    "tags": ["Fighter", "Mage", "Assassin", "Tank", "Marksman", "Support"],
    "stats": {
      "Fighter": 45,
      "Mage": 42,
      "Assassin": 20,
      "Tank": 18,
      "Marksman": 25,
      "Support": 30
    },
    "total": 6
  }
}
```

### 4. 搜索英雄

**GET** `/api/champions/search/{keyword}`

根据关键词搜索英雄。

**路径参数**:
- `keyword` (string): 搜索关键词，至少1个字符

**响应示例**:
```json
{
  "success": true,
  "message": "英雄搜索完成",
  "data": {
    "keyword": "剑魔",
    "champions": [
      {
        "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
        "riotId": "266",
        "key": "Aatrox",
        "name": "暗裔剑魔",
        "title": "亚托克斯",
        "images": {...},
        "tags": ["Fighter", "Tank"],
        "stats": {
          "difficulty": 4
        }
      }
    ],
    "total": 1
  }
}
```

### 5. 根据标签获取英雄

**GET** `/api/champions/by-tags/{tags}`

根据标签获取英雄列表。

**路径参数**:
- `tags` (string): 标签列表，多个用逗号分隔

**示例**: `/api/champions/by-tags/Fighter,Tank`

### 6. 英雄统计信息

**GET** `/api/champions/stats/summary`

获取英雄的各种统计信息。

**响应示例**:
```json
{
  "success": true,
  "message": "英雄统计信息获取成功",
  "data": {
    "total": {
      "all": 168,
      "enabled": 168,
      "disabled": 0
    },
    "byTags": {
      "Fighter": 45,
      "Mage": 42,
      "Assassin": 20,
      "Tank": 18,
      "Marksman": 25,
      "Support": 30
    },
    "byDifficulty": {
      "1": 5,
      "2": 15,
      "3": 25,
      "4": 30,
      "5": 20
    },
    "byVersion": {
      "13.24.1": 168
    },
    "lastUpdated": "2024-09-26T06:00:00.000Z"
  }
}
```

---

## 装备接口 (Items)

### 1. 获取装备列表

**GET** `/api/items`

获取所有装备列表，支持多种过滤条件。

**查询参数**:
- `search` (string): 搜索关键词
- `tags` (string[]): 装备标签过滤
- `map` (string): 地图过滤 (sr, ha, aram)
- `minPrice` (number): 最低价格
- `maxPrice` (number): 最高价格
- `depth` (number): 装备深度 (1-4)
- `purchasable` (boolean): 是否可购买
- `mythic` (boolean): 是否为神话装备
- `legendary` (boolean): 是否为传说装备
- `boots` (boolean): 是否为靴子
- `page` (number, 默认1): 页码
- `limit` (number, 默认50): 每页数量
- `sort` (string, 默认name): 排序字段
- `order` (string, 默认asc): 排序方式

**响应示例**:
```json
{
  "success": true,
  "message": "装备列表获取成功",
  "data": {
    "items": [
      {
        "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
        "riotId": "1001",
        "name": "靴子",
        "description": "增加移动速度",
        "plaintext": "略微增加移动速度",
        "image": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/1001.png",
        "gold": {
          "total": 300,
          "base": 300,
          "sell": 210,
          "purchasable": true
        },
        "tags": ["Boots", "NonbootsMovement"],
        "maps": {
          "sr": true,
          "ha": true,
          "aram": true
        },
        "depth": 1,
        "isBoots": true,
        "version": "13.24.1"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 8,
      "totalCount": 400,
      "limit": 50,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "search": null,
      "tags": null,
      "map": null,
      "priceRange": { "min": null, "max": null },
      "purchasable": null
    }
  }
}
```

### 2. 获取装备详情

**GET** `/api/items/{identifier}`

获取单个装备的详细信息，包括合成路径。

**路径参数**:
- `identifier` (string): 装备ID或riotId

**响应示例**:
```json
{
  "success": true,
  "message": "装备详情获取成功",
  "data": {
    "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
    "riotId": "3031",
    "name": "无尽之刃",
    "description": "大幅度提升攻击力和暴击几率",
    "plaintext": "大幅度提升攻击力和暴击几率",
    "image": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/3031.png",
    "gold": {
      "total": 3400,
      "base": 625,
      "sell": 2380,
      "purchasable": true
    },
    "tags": ["CriticalStrike", "Damage"],
    "from": ["1037", "1018", "1037"],
    "into": [],
    "depth": 3,
    "fromItems": [
      {
        "_id": "64f8a1b2c3d4e5f6g7h8i9j2",
        "riotId": "1037",
        "name": "镐子",
        "image": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/1037.png",
        "gold": { "total": 875 }
      }
    ],
    "intoItems": []
  }
}
```

### 3. 其他装备接口

- `GET /api/items/tags/list` - 获取装备标签列表
- `GET /api/items/map/{mapType}` - 根据地图获取装备
- `GET /api/items/search/{keyword}` - 搜索装备
- `GET /api/items/by-tags/{tags}` - 根据标签获取装备
- `GET /api/items/price-range/{minPrice}/{maxPrice}` - 根据价格范围获取装备
- `GET /api/items/purchasable` - 获取可购买装备
- `GET /api/items/stats/summary` - 装备统计信息

---

## 攻略接口 (Strategies)

### 1. 获取攻略列表

**GET** `/api/strategies`

获取攻略列表，支持多种过滤条件。

**查询参数**:
- `championKey` (string): 英雄key过滤
- `mapType` (string): 地图类型 (sr, aram, both)
- `creatorId` (string): 创建者ID
- `search` (string): 搜索关键词
- `isRecommended` (boolean): 是否为推荐攻略
- `page` (number, 默认1): 页码
- `limit` (number, 默认20): 每页数量
- `sort` (string, 默认createdAt): 排序字段
- `order` (string, 默认desc): 排序方式

**响应示例**:
```json
{
  "success": true,
  "message": "攻略列表获取成功",
  "data": {
    "strategies": [
      {
        "_id": "64f8a1b2c3d4e5f6g7h8i9j2",
        "title": "暗裔剑魔 召唤师峡谷出装",
        "champion": {
          "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
          "key": "Aatrox",
          "name": "暗裔剑魔",
          "images": {
            "square": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Aatrox.png"
          }
        },
        "championKey": "Aatrox",
        "championName": "暗裔剑魔",
        "items": [
          {
            "item": {
              "_id": "64f8a1b2c3d4e5f6g7h8i9j3",
              "name": "朔极之矛",
              "image": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/6632.png",
              "gold": { "total": 3200 }
            },
            "itemName": "朔极之矛",
            "itemImage": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/6632.png",
            "position": 1
          }
        ],
        "mapType": "sr",
        "description": "适合上单暗裔剑魔的标准出装",
        "tags": ["tank", "damage"],
        "creator": {
          "_id": "64f8a1b2c3d4e5f6g7h8i9j4",
          "username": "testuser",
          "profile": {
            "displayName": "测试用户"
          }
        },
        "creatorName": "testuser",
        "stats": {
          "viewCount": 156,
          "favoriteCount": 23,
          "likeCount": 18
        },
        "status": "published",
        "isPublic": true,
        "isRecommended": false,
        "createdAt": "2024-09-26T06:00:00.000Z",
        "updatedAt": "2024-09-26T06:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 89,
      "limit": 20,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 2. 创建攻略

**POST** `/api/strategies`

创建新的出装攻略。**需要认证**

**请求体**:
```json
{
  "title": "暗裔剑魔 召唤师峡谷出装",
  "championId": "64f8a1b2c3d4e5f6g7h8i9j0",
  "items": [
    {
      "itemId": "64f8a1b2c3d4e5f6g7h8i9j3",
      "position": 1
    },
    {
      "itemId": "64f8a1b2c3d4e5f6g7h8i9j5",
      "position": 2
    }
  ],
  "mapType": "sr",
  "description": "适合上单的标准出装",
  "tags": ["tank", "damage"]
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "攻略创建成功",
  "data": {
    "_id": "64f8a1b2c3d4e5f6g7h8i9j2",
    "title": "暗裔剑魔 召唤师峡谷出装",
    "champion": {...},
    "items": [...],
    "mapType": "sr",
    "description": "适合上单的标准出装",
    "stats": {
      "viewCount": 0,
      "favoriteCount": 0,
      "likeCount": 0
    },
    "createdAt": "2024-09-26T06:00:00.000Z"
  }
}
```

### 3. 获取攻略详情

**GET** `/api/strategies/{id}`

获取单个攻略的详细信息。

**路径参数**:
- `id` (string): 攻略ID

**响应示例**:
```json
{
  "success": true,
  "message": "攻略详情获取成功",
  "data": {
    "_id": "64f8a1b2c3d4e5f6g7h8i9j2",
    "title": "暗裔剑魔 召唤师峡谷出装",
    "champion": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
      "key": "Aatrox",
      "name": "暗裔剑魔",
      "title": "亚托克斯",
      "description": "曾经是恕瑞玛最受崇敬的战士之一...",
      "images": {
        "square": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/Aatrox.png",
        "splash": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aatrox_0.jpg"
      },
      "tags": ["Fighter", "Tank"],
      "stats": {
        "difficulty": 4
      }
    },
    "items": [
      {
        "item": {
          "_id": "64f8a1b2c3d4e5f6g7h8i9j3",
          "name": "朔极之矛",
          "description": "提供攻击力、生命值和冷却缩减",
          "plaintext": "提供攻击力、生命值和独特的主动效果",
          "image": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/6632.png",
          "gold": {
            "total": 3200,
            "base": 400,
            "sell": 2240,
            "purchasable": true
          },
          "tags": ["Health", "Damage", "CooldownReduction"],
          "depth": 3
        },
        "itemName": "朔极之矛",
        "itemImage": "https://ddragon.leagueoflegends.com/cdn/13.24.1/img/item/6632.png",
        "position": 1
      }
    ],
    "mapType": "sr",
    "description": "适合上单暗裔剑魔的标准出装",
    "tags": ["tank", "damage"],
    "creator": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j4",
      "username": "testuser",
      "profile": {
        "displayName": "测试用户",
        "avatar": null
      }
    },
    "stats": {
      "viewCount": 157,
      "favoriteCount": 23,
      "likeCount": 18
    },
    "status": "published",
    "isPublic": true,
    "isRecommended": false,
    "createdAt": "2024-09-26T06:00:00.000Z",
    "updatedAt": "2024-09-26T06:00:00.000Z"
  }
}
```

### 4. 更新攻略

**PUT** `/api/strategies/{id}`

更新攻略信息。**需要认证，仅创建者可修改**

**路径参数**:
- `id` (string): 攻略ID

**请求体** (所有字段都是可选的):
```json
{
  "title": "更新后的标题",
  "championId": "64f8a1b2c3d4e5f6g7h8i9j0",
  "items": [
    {
      "itemId": "64f8a1b2c3d4e5f6g7h8i9j3",
      "position": 1
    }
  ],
  "mapType": "aram",
  "description": "更新后的描述",
  "tags": ["updated", "strategy"],
  "isPublic": true
}
```

### 5. 删除攻略

**DELETE** `/api/strategies/{id}`

删除攻略。**需要认证，仅创建者可删除**

**路径参数**:
- `id` (string): 攻略ID

**响应示例**:
```json
{
  "success": true,
  "message": "攻略删除成功"
}
```

### 6. 按英雄获取攻略

**GET** `/api/strategies/champion/{championKey}`

获取指定英雄的所有攻略。

**路径参数**:
- `championKey` (string): 英雄key

**查询参数**:
- `mapType` (string, 可选): 地图类型过滤
- `page` (number, 默认1): 页码
- `limit` (number, 默认10): 每页数量

**示例**: `/api/strategies/champion/Aatrox?mapType=sr&page=1&limit=5`

### 7. 获取热门攻略

**GET** `/api/strategies/popular`

获取热门攻略列表，按点赞数、收藏数等排序。

**查询参数**:
- `limit` (number, 默认10): 返回数量

### 8. 获取推荐攻略

**GET** `/api/strategies/recommended`

获取官方推荐的攻略列表。

**查询参数**:
- `limit` (number, 默认10): 返回数量

### 9. 获取用户攻略

**GET** `/api/strategies/user/{userId}`

获取指定用户创建的公开攻略。

**路径参数**:
- `userId` (string): 用户ID

### 10. 获取我的攻略

**GET** `/api/strategies/my`

获取当前用户的所有攻略（包括私有）。**需要认证**

**查询参数**:
- `status` (string, 可选): 状态过滤 (draft, published, archived)
- `page` (number, 默认1): 页码
- `limit` (number, 默认10): 每页数量

### 11. 点赞攻略

**POST** `/api/strategies/{id}/like`

点赞或取消点赞攻略。**需要认证**

**路径参数**:
- `id` (string): 攻略ID

---

## 数据收集脚本

系统提供了数据收集脚本来获取英雄联盟的最新数据：

### 运行数据收集

```bash
# 收集英雄数据
npm run collect:champions

# 收集装备数据
npm run collect:items

# 收集所有数据
npm run collect:all
```

### 数据来源

- 英雄数据：Riot Games Data Dragon API
- 装备数据：Riot Games Data Dragon API
- 数据更新频率：跟随游戏版本更新

---

## 错误码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 使用示例

### 前端页面实现建议

1. **英雄选择页面**:
   - 调用 `GET /api/champions` 获取英雄列表
   - 使用 `search` 参数实现搜索功能
   - 使用 `tags` 参数实现按位置过滤

2. **装备选择页面**:
   - 调用 `GET /api/items` 获取装备列表
   - 使用 `map` 参数过滤地图专用装备
   - 使用 `purchasable=true` 只显示可购买装备

3. **创建攻略页面**:
   - 先选择英雄，再选择装备
   - 装备最多6个，每个有固定位置
   - 调用 `POST /api/strategies` 创建攻略

4. **攻略浏览页面**:
   - 调用 `GET /api/strategies` 获取攻略列表
   - 调用 `GET /api/strategies/{id}` 查看详情
   - 支持按英雄、地图类型过滤

### JavaScript 示例

```javascript
// 获取英雄列表
async function getChampions() {
  const response = await fetch('/api/champions?limit=20');
  const data = await response.json();
  return data;
}

// 创建攻略
async function createStrategy(strategyData, token) {
  const response = await fetch('/api/strategies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(strategyData)
  });
  const data = await response.json();
  return data;
}
```

---

## 部署说明

1. **环境变量配置**:
   ```
   NODE_ENV=production
   MONGO_URI=mongodb://localhost:27017/lol_strategy
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```

2. **启动服务**:
   ```bash
   npm install
   npm run collect:all  # 首次部署时收集数据
   npm start
   ```

3. **数据更新**:
   - 定期运行数据收集脚本更新英雄和装备数据
   - 建议在每次游戏版本更新后运行

---

## 更新日志

### v1.0.0 (2024-09-26)
- 初始版本发布
- 完整的英雄、装备、攻略管理功能
- 支持数据自动收集和更新
- 提供完整的RESTful API接口