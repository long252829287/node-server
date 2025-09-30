/**
 * LOL 数据导入脚本
 * 将 JSON 文件中的英雄、装备、符文数据导入到 MongoDB 数据库
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('rootpath')();

// 加载环境变量
require('dotenv').config();

// 导入模型
const Champion = require('../models/Champion');
const Item = require('../models/Item');
const Rune = require('../models/Rune');

// JSON 文件路径
const CHAMPION_JSON = path.join(__dirname, '../assets/json/lol/champion.json');
const ITEMS_JSON = path.join(__dirname, '../assets/json/lol/items.json');
const RUNES_JSON = path.join(__dirname, '../assets/json/lol/runes.json');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

// 导入英雄数据
async function importChampions() {
  try {
    console.log('\n📥 开始导入英雄数据...');

    const rawData = fs.readFileSync(CHAMPION_JSON, 'utf8');
    const data = JSON.parse(rawData);

    // 检查数据结构
    let championList = [];
    if (data.champions && Array.isArray(data.champions)) {
      championList = data.champions;
    } else if (typeof data === 'object') {
      // 如果是对象格式，转换为数组
      championList = Object.values(data);
    }

    console.log(`  找到 ${championList.length} 个英雄`);

    // 清空现有数据
    await Champion.deleteMany({});
    console.log('  已清空现有英雄数据');

    // 批量插入
    let successCount = 0;
    for (const champ of championList) {
      try {
        const championDoc = new Champion({
          riotId: champ.id?.toString() || `${Date.now()}_${Math.random()}`,
          key: champ.name || 'Unknown',
          name: champ.name || '未知英雄',
          title: champ.title || '',
          description: champ.description || '',
          images: {
            square: champ.image || ''
          },
          tags: [],
          version: '1.0.0',
          isEnabled: true
        });

        await championDoc.save();
        successCount++;
      } catch (err) {
        console.error(`  ⚠️  导入英雄失败: ${champ.name}`, err.message);
      }
    }

    console.log(`✅ 英雄数据导入完成: ${successCount}/${championList.length}`);
    return successCount;

  } catch (error) {
    console.error('❌ 导入英雄数据失败:', error.message);
    throw error;
  }
}

// 导入装备数据
async function importItems() {
  try {
    console.log('\n📥 开始导入装备数据...');

    const rawData = fs.readFileSync(ITEMS_JSON, 'utf8');
    const data = JSON.parse(rawData);

    // 检查数据结构
    let itemList = [];
    if (data.items && Array.isArray(data.items)) {
      itemList = data.items;
    } else if (Array.isArray(data)) {
      itemList = data;
    }

    console.log(`  找到 ${itemList.length} 个装备`);

    // 清空现有数据
    await Item.deleteMany({});
    console.log('  已清空现有装备数据');

    // 批量插入
    let successCount = 0;
    for (const item of itemList) {
      try {
        const itemDoc = new Item({
          riotId: item.id?.toString() || `${Date.now()}_${Math.random()}`,
          name: item.name || '未知装备',
          description: item.description || '',
          plaintext: item.plaintext || '',
          image: item.image || item.icon || '',
          gold: {
            total: item.gold?.total || item.price || 0,
            base: item.gold?.base || 0,
            sell: item.gold?.sell || 0,
            purchasable: item.gold?.purchasable !== false
          },
          tags: item.tags || [],
          maps: {
            sr: true,
            ha: true,
            aram: true
          },
          depth: item.depth || 1,
          from: item.from || [],
          into: item.into || [],
          version: '1.0.0',
          isEnabled: true
        });

        await itemDoc.save();
        successCount++;
      } catch (err) {
        console.error(`  ⚠️  导入装备失败: ${item.name}`, err.message);
      }
    }

    console.log(`✅ 装备数据导入完成: ${successCount}/${itemList.length}`);
    return successCount;

  } catch (error) {
    console.error('❌ 导入装备数据失败:', error.message);
    throw error;
  }
}

// 导入符文数据
async function importRunes() {
  try {
    console.log('\n📥 开始导入符文数据...');

    const rawData = fs.readFileSync(RUNES_JSON, 'utf8');
    const data = JSON.parse(rawData);

    // 检查数据结构
    let runeTreeList = [];
    if (data.rune_trees && Array.isArray(data.rune_trees)) {
      runeTreeList = data.rune_trees;
    } else if (data.runeTrees && Array.isArray(data.runeTrees)) {
      runeTreeList = data.runeTrees;
    }

    console.log(`  找到 ${runeTreeList.length} 个符文树`);

    // 清空现有数据
    await Rune.deleteMany({});
    console.log('  已清空现有符文数据');

    // 批量插入
    let successCount = 0;
    for (const tree of runeTreeList) {
      try {
        const runeDoc = new Rune({
          id: tree.id,
          name: tree.name,
          icon: tree.icon,
          slots: tree.slots || [],
          version: '1.0.0',
          isEnabled: true
        });

        await runeDoc.save();
        successCount++;
      } catch (err) {
        console.error(`  ⚠️  导入符文树失败: ${tree.name}`, err.message);
      }
    }

    console.log(`✅ 符文数据导入完成: ${successCount}/${runeTreeList.length}`);
    return successCount;

  } catch (error) {
    console.error('❌ 导入符文数据失败:', error.message);
    throw error;
  }
}

// 主函数
async function main() {
  console.log('🚀 LOL 数据导入工具');
  console.log('====================\n');

  try {
    // 连接数据库
    await connectDB();

    // 检查 JSON 文件是否存在
    const files = [
      { path: CHAMPION_JSON, name: '英雄数据' },
      { path: ITEMS_JSON, name: '装备数据' },
      { path: RUNES_JSON, name: '符文数据' }
    ];

    console.log('📋 检查数据文件...');
    for (const file of files) {
      if (fs.existsSync(file.path)) {
        console.log(`  ✅ ${file.name}: ${file.path}`);
      } else {
        console.log(`  ❌ ${file.name}文件不存在: ${file.path}`);
      }
    }

    // 导入数据
    const results = {
      champions: 0,
      items: 0,
      runes: 0
    };

    // 导入英雄
    if (fs.existsSync(CHAMPION_JSON)) {
      results.champions = await importChampions();
    }

    // 导入装备
    if (fs.existsSync(ITEMS_JSON)) {
      results.items = await importItems();
    }

    // 导入符文
    if (fs.existsSync(RUNES_JSON)) {
      results.runes = await importRunes();
    }

    // 打印汇总
    console.log('\n📊 导入结果汇总');
    console.log('====================');
    console.log(`  英雄: ${results.champions} 个`);
    console.log(`  装备: ${results.items} 个`);
    console.log(`  符文树: ${results.runes} 个`);
    console.log('\n✨ 所有数据导入完成！\n');

  } catch (error) {
    console.error('\n❌ 导入过程出错:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('🔌 数据库连接已关闭');
  }
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { importChampions, importItems, importRunes };