/**
 * 装备数据模型
 * 存储英雄联盟装备信息（召唤师峡谷和大乱斗）
 */

const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  // Riot 官方装备 ID
  riotId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // 装备名称
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, '装备名称不能超过100个字符'],
    index: true
  },

  // 装备描述
  description: {
    type: String,
    trim: true,
    maxlength: [2000, '装备描述不能超过2000个字符']
  },

  // 装备简短描述
  plaintext: {
    type: String,
    trim: true,
    maxlength: [500, '装备简短描述不能超过500个字符']
  },

  // 装备图标 URL
  image: {
    type: String,
    trim: true,
    required: true
  },

  // 装备价格信息
  gold: {
    // 总价格
    total: {
      type: Number,
      default: 0,
      min: [0, '价格不能为负数']
    },
    // 基础价格
    base: {
      type: Number,
      default: 0,
      min: [0, '基础价格不能为负数']
    },
    // 合成价格
    sell: {
      type: Number,
      default: 0,
      min: [0, '出售价格不能为负数']
    },
    // 是否可购买
    purchasable: {
      type: Boolean,
      default: true
    }
  },

  // 装备标签
  tags: [{
    type: String,
    enum: [
      'Damage', 'CriticalStrike', 'AttackSpeed', 'OnHit',
      'ArmorPenetration', 'SpellDamage', 'Mana', 'ManaRegen',
      'SpellVamp', 'CooldownReduction', 'MagicPenetration',
      'Health', 'HealthRegen', 'Armor', 'SpellBlock',
      'Slow', 'Boots', 'Trinket', 'Consumable',
      'Active', 'Stealth', 'Vision', 'NonbootsMovement',
      'MagicResist', 'AbilityHaste', 'Omnivamp', 'GoldPer',
      'Lane', 'Jungle', 'LifeSteal', 'Tenacity', 'Aura'
    ]
  }],

  // 适用地图
  maps: {
    // 召唤师峡谷 (Summoner's Rift)
    'sr': {
      type: Boolean,
      default: true
    },
    // 嚎哭深渊 (Howling Abyss - ARAM)
    'ha': {
      type: Boolean,
      default: true
    },
    // 极地大乱斗
    'aram': {
      type: Boolean,
      default: true
    }
  },

  // 深度信息
  depth: {
    type: Number,
    default: 1,
    min: 1,
    max: 4
  },

  // 合成路径 (装备ID数组)
  from: [{
    type: String
  }],

  // 升级路径 (装备ID数组)
  into: [{
    type: String
  }],

  // 特殊属性
  specialRecipe: {
    type: Number,
    default: 0
  },

  // 装备组别
  group: {
    type: String,
    trim: true
  },

  // 是否为神话装备
  isMythic: {
    type: Boolean,
    default: false
  },

  // 是否为传说装备
  isLegendary: {
    type: Boolean,
    default: false
  },

  // 是否为靴子
  isBoots: {
    type: Boolean,
    default: false
  },

  // 数据版本
  version: {
    type: String,
    required: true
  },

  // 是否启用
  isEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
itemSchema.index({ name: 'text' });
itemSchema.index({ tags: 1 });
itemSchema.index({ 'maps.sr': 1, 'maps.ha': 1, 'maps.aram': 1 });
itemSchema.index({ depth: 1 });
itemSchema.index({ 'gold.total': 1 });
itemSchema.index({ version: 1 });

// 虚拟字段：是否为完成装备
itemSchema.virtual('isCompleted').get(function() {
  return this.depth >= 3;
});

// 静态方法：按地图获取装备
itemSchema.statics.getByMap = function(mapKey) {
  const query = { isEnabled: true };
  query[`maps.${mapKey}`] = true;
  return this.find(query);
};

// 静态方法：按标签获取装备
itemSchema.statics.getByTags = function(tags) {
  return this.find({
    tags: { $in: tags },
    isEnabled: true
  });
};

// 静态方法：按价格范围获取装备
itemSchema.statics.getByPriceRange = function(minPrice, maxPrice) {
  return this.find({
    'gold.total': { $gte: minPrice, $lte: maxPrice },
    'gold.purchasable': true,
    isEnabled: true
  });
};

// 静态方法：搜索装备
itemSchema.statics.search = function(keyword) {
  return this.find({
    $or: [
      { name: { $regex: keyword, $options: 'i' } },
      { plaintext: { $regex: keyword, $options: 'i' } }
    ],
    isEnabled: true
  });
};

// 静态方法：获取可购买的装备
itemSchema.statics.getPurchasable = function() {
  return this.find({
    'gold.purchasable': true,
    isEnabled: true
  });
};

module.exports = mongoose.model('Item', itemSchema);