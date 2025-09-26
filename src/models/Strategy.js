/**
 * 攻略数据模型
 * 存储英雄出装攻略信息
 */

const mongoose = require('mongoose');

const strategySchema = new mongoose.Schema({
  // 攻略标题
  title: {
    type: String,
    trim: true,
    maxlength: [200, '攻略标题不能超过200个字符']
  },

  // 关联英雄ID
  champion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Champion',
    required: [true, '必须选择一个英雄'],
    index: true
  },

  // 关联英雄key (冗余字段，方便查询)
  championKey: {
    type: String,
    required: true,
    index: true
  },

  // 关联英雄名称 (冗余字段，方便显示)
  championName: {
    type: String,
    required: true
  },

  // 装备列表 (最多6个)
  items: [{
    // 装备ID
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
    },
    // 装备名称 (冗余字段)
    itemName: {
      type: String,
      required: true
    },
    // 装备图标 (冗余字段)
    itemImage: {
      type: String,
      required: true
    },
    // 装备在攻略中的位置 (1-6)
    position: {
      type: Number,
      required: true,
      min: 1,
      max: 6
    }
  }],

  // 适用地图
  mapType: {
    type: String,
    enum: ['sr', 'aram', 'both'],
    default: 'sr',
    required: true
  },

  // 攻略描述/说明
  description: {
    type: String,
    trim: true,
    maxlength: [1000, '攻略描述不能超过1000个字符']
  },

  // 攻略标签
  tags: [{
    type: String,
    enum: ['early', 'mid', 'late', 'tank', 'damage', 'support', 'jungle', 'lane']
  }],

  // 创建者
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 创建者用户名 (冗余字段)
  creatorName: {
    type: String,
    required: true
  },

  // 统计信息
  stats: {
    // 查看次数
    viewCount: {
      type: Number,
      default: 0,
      min: [0, '查看次数不能为负数']
    },
    // 收藏次数
    favoriteCount: {
      type: Number,
      default: 0,
      min: [0, '收藏次数不能为负数']
    },
    // 点赞次数
    likeCount: {
      type: Number,
      default: 0,
      min: [0, '点赞次数不能为负数']
    }
  },

  // 攻略状态
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },

  // 是否公开
  isPublic: {
    type: Boolean,
    default: true
  },

  // 是否推荐
  isRecommended: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
strategySchema.index({ champion: 1, mapType: 1 });
strategySchema.index({ championKey: 1, mapType: 1 });
strategySchema.index({ creator: 1, status: 1 });
strategySchema.index({ createdAt: -1 });
strategySchema.index({ 'stats.viewCount': -1 });
strategySchema.index({ 'stats.favoriteCount': -1 });
strategySchema.index({ 'stats.likeCount': -1 });
strategySchema.index({ isPublic: 1, status: 1 });
strategySchema.index({ isRecommended: 1, status: 1 });

// 复合索引
strategySchema.index({ championKey: 1, mapType: 1, isPublic: 1, status: 1 });

// 验证器：装备数量不超过6个
strategySchema.path('items').validate(function(items) {
  return items && items.length <= 6;
}, '装备数量不能超过6个');

// 验证器：装备位置唯一性
strategySchema.path('items').validate(function(items) {
  if (!items || items.length === 0) return true;

  const positions = items.map(item => item.position);
  const uniquePositions = [...new Set(positions)];
  return positions.length === uniquePositions.length;
}, '装备位置不能重复');

// 虚拟字段：装备总价值
strategySchema.virtual('totalValue').get(function() {
  if (!this.populated('items.item')) return 0;

  return this.items.reduce((total, strategyItem) => {
    const item = strategyItem.item;
    return total + (item?.gold?.total || 0);
  }, 0);
});

// 虚拟字段：攻略评分 (基于统计数据计算)
strategySchema.virtual('rating').get(function() {
  const { viewCount, favoriteCount, likeCount } = this.stats;

  // 简单的评分算法：点赞权重最高，收藏次之，查看最低
  const score = (likeCount * 3) + (favoriteCount * 2) + (viewCount * 0.1);
  return Math.min(Math.round(score * 10) / 10, 10); // 最高10分
});

// 实例方法：增加查看次数
strategySchema.methods.incrementViewCount = function() {
  this.stats.viewCount += 1;
  return this.save();
};

// 实例方法：增加收藏次数
strategySchema.methods.incrementFavoriteCount = function() {
  this.stats.favoriteCount += 1;
  return this.save();
};

// 实例方法：减少收藏次数
strategySchema.methods.decrementFavoriteCount = function() {
  if (this.stats.favoriteCount > 0) {
    this.stats.favoriteCount -= 1;
  }
  return this.save();
};

// 实例方法：增加点赞次数
strategySchema.methods.incrementLikeCount = function() {
  this.stats.likeCount += 1;
  return this.save();
};

// 实例方法：减少点赞次数
strategySchema.methods.decrementLikeCount = function() {
  if (this.stats.likeCount > 0) {
    this.stats.likeCount -= 1;
  }
  return this.save();
};

// 静态方法：按英雄获取攻略
strategySchema.statics.getByChampion = function(championKey, mapType = null) {
  const query = {
    championKey,
    status: 'published',
    isPublic: true
  };

  if (mapType) {
    query.$or = [
      { mapType },
      { mapType: 'both' }
    ];
  }

  return this.find(query)
    .populate('champion', 'name key images.square')
    .populate('items.item', 'name image gold.total')
    .sort({ 'stats.favoriteCount': -1, createdAt: -1 });
};

// 静态方法：获取热门攻略
strategySchema.statics.getPopular = function(limit = 10) {
  return this.find({
    status: 'published',
    isPublic: true
  })
  .populate('champion', 'name key images.square')
  .populate('items.item', 'name image gold.total')
  .sort({
    'stats.likeCount': -1,
    'stats.favoriteCount': -1,
    'stats.viewCount': -1
  })
  .limit(limit);
};

// 静态方法：获取推荐攻略
strategySchema.statics.getRecommended = function(limit = 10) {
  return this.find({
    status: 'published',
    isPublic: true,
    isRecommended: true
  })
  .populate('champion', 'name key images.square')
  .populate('items.item', 'name image gold.total')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// 静态方法：按创建者获取攻略
strategySchema.statics.getByCreator = function(creatorId, includePrivate = false) {
  const query = { creator: creatorId };

  if (!includePrivate) {
    query.isPublic = true;
    query.status = 'published';
  }

  return this.find(query)
    .populate('champion', 'name key images.square')
    .populate('items.item', 'name image gold.total')
    .sort({ createdAt: -1 });
};

// 静态方法：搜索攻略
strategySchema.statics.search = function(keyword) {
  return this.find({
    $or: [
      { title: { $regex: keyword, $options: 'i' } },
      { championName: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } }
    ],
    status: 'published',
    isPublic: true
  })
  .populate('champion', 'name key images.square')
  .populate('items.item', 'name image gold.total')
  .sort({ 'stats.likeCount': -1, createdAt: -1 });
};

// 保存前中间件：自动生成标题
strategySchema.pre('save', function(next) {
  if (this.isNew && !this.title) {
    const mapName = this.mapType === 'sr' ? '召唤师峡谷' :
                   this.mapType === 'aram' ? '大乱斗' : '通用';
    this.title = `${this.championName} ${mapName}出装`;
  }
  next();
});

// 保存前中间件：更新冗余字段
strategySchema.pre('save', async function(next) {
  if (this.isModified('champion') || this.isNew) {
    try {
      const champion = await mongoose.model('Champion').findById(this.champion);
      if (champion) {
        this.championKey = champion.key;
        this.championName = champion.name;
      }
    } catch (error) {
      return next(error);
    }
  }

  if (this.isModified('creator') || this.isNew) {
    try {
      const user = await mongoose.model('User').findById(this.creator);
      if (user) {
        this.creatorName = user.username;
      }
    } catch (error) {
      return next(error);
    }
  }

  next();
});

module.exports = mongoose.model('Strategy', strategySchema);