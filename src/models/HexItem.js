/**
 * 海克斯模式装备数据模型
 * 与 Item 使用同结构，但存储在独立集合中，避免与标准装备冲突
 */

const mongoose = require('mongoose');
const Item = require('./Item');

// 复用 Item 的 schema（保持字段一致）
const itemSchema = Item.schema;

module.exports = mongoose.models.HexItem || mongoose.model('HexItem', itemSchema, 'hex_items');

