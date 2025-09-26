/**
 * 装备数据收集脚本
 * 从Riot Games Data Dragon API获取装备数据并存储到数据库
 */

const axios = require('axios');
const mongoose = require('mongoose');
const Item = require('../models/Item');
const { connectDB } = require('../config/database');

// Data Dragon 基础URL
const DATA_DRAGON_BASE = 'https://ddragon.leagueoflegends.com';

/**
 * 获取最新版本号
 */
async function getLatestVersion() {
  try {
    console.log('📡 获取最新游戏版本...');
    const response = await axios.get(`${DATA_DRAGON_BASE}/api/versions.json`);
    const latestVersion = response.data[0];
    console.log(`✅ 最新版本: ${latestVersion}`);
    return latestVersion;
  } catch (error) {
    console.error('❌ 获取版本失败:', error.message);
    throw error;
  }
}

/**
 * 获取所有装备数据
 */
async function getItemsData(version) {
  try {
    console.log(`📡 获取装备数据 (版本: ${version})...`);
    const response = await axios.get(
      `${DATA_DRAGON_BASE}/cdn/${version}/data/zh_CN/item.json`
    );

    const items = Object.entries(response.data.data).map(([id, item]) => ({
      id,
      ...item
    }));

    console.log(`✅ 获取到 ${items.length} 个装备`);
    return { items, version };
  } catch (error) {
    console.error('❌ 获取装备数据失败:', error.message);
    throw error;
  }
}

/**
 * 转换装备数据格式
 */
function transformItemData(item, version) {
  const imageUrl = `${DATA_DRAGON_BASE}/cdn/${version}/img/item/${item.image.full}`;

  // 处理地图适用性
  const maps = {
    sr: true,    // 召唤师峡谷默认都可用
    ha: true,    // 嚎哭深渊默认都可用
    aram: true   // 大乱斗默认都可用
  };

  // 如果有maps字段，则根据实际情况设置
  if (item.maps) {
    maps.sr = item.maps['11'] !== false;  // 召唤师峡谷 Map ID: 11
    maps.ha = item.maps['12'] !== false;  // 嚎哭深渊 Map ID: 12
    maps.aram = item.maps['12'] !== false; // 大乱斗也是Map ID: 12
  }

  // 判断特殊装备类型
  const isMythic = item.description && item.description.includes('神话');
  const isLegendary = item.description && item.description.includes('传说');
  const isBoots = item.tags && item.tags.includes('Boots');

  return {
    riotId: item.id.toString(),
    name: item.name,
    description: item.description || '',
    plaintext: item.plaintext || '',
    image: imageUrl,
    gold: {
      total: item.gold?.total || 0,
      base: item.gold?.base || 0,
      sell: item.gold?.sell || 0,
      purchasable: item.gold?.purchasable !== false
    },
    tags: item.tags || [],
    maps: maps,
    depth: item.depth || 1,
    from: item.from || [],
    into: item.into || [],
    specialRecipe: item.specialRecipe || 0,
    group: item.group || '',
    isMythic: isMythic,
    isLegendary: isLegendary,
    isBoots: isBoots,
    version: version,
    isEnabled: true
  };
}

/**
 * 保存装备数据到数据库
 */
async function saveItemData(itemData) {
  try {
    // 使用 upsert 操作：如果存在则更新，不存在则创建
    const result = await Item.findOneAndUpdate(
      { riotId: itemData.riotId },
      itemData,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return result;
  } catch (error) {
    console.error(`❌ 保存装备 ${itemData.name} 失败:`, error.message);
    throw error;
  }
}

/**
 * 过滤无效装备
 */
function filterValidItems(items) {
  return items.filter(item => {
    // 过滤掉以下类型的装备：
    // 1. 无名称的装备
    // 2. 特殊配方装备（通常是不可见的）
    // 3. 测试装备或隐藏装备
    // 4. 某些特殊标签的装备

    if (!item.name || item.name.trim() === '') {
      return false;
    }

    // 过滤特定的无用装备
    const excludeNames = [
      '测试', 'Test', 'Debug', 'Disabled', '已移除'
    ];

    if (excludeNames.some(exclude => item.name.includes(exclude))) {
      return false;
    }

    // 过滤特定标签的装备
    const excludeTags = ['Hide'];
    if (item.tags && item.tags.some(tag => excludeTags.includes(tag))) {
      return false;
    }

    // 过滤特殊配方大于100的装备（通常是隐藏的）
    if (item.specialRecipe && item.specialRecipe > 100) {
      return false;
    }

    // 过滤不可购买且无法合成的装备
    if (item.gold?.purchasable === false && (!item.from || item.from.length === 0)) {
      return false;
    }

    return true;
  });
}

/**
 * 批量处理装备数据
 */
async function processItems(items, version) {
  console.log(`🔄 开始处理装备数据...`);

  // 过滤有效装备
  const validItems = filterValidItems(items);
  console.log(`📋 过滤后有效装备数量: ${validItems.length}`);

  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];

    try {
      console.log(`[${i + 1}/${validItems.length}] 处理装备: ${item.name}`);

      // 转换数据格式
      const itemData = transformItemData(item, version);

      // 保存到数据库
      await saveItemData(itemData);

      results.success++;
      console.log(`✅ ${item.name} 处理成功`);

      // 避免请求过于频繁
      await sleep(50);

    } catch (error) {
      results.failed++;
      results.errors.push({
        item: item.name,
        error: error.message
      });
      console.error(`❌ 处理装备 ${item.name} 失败:`, error.message);
    }
  }

  return results;
}

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 清理旧版本数据
 */
async function cleanupOldVersions(currentVersion) {
  try {
    console.log('🧹 清理旧版本装备数据...');
    const result = await Item.deleteMany({
      version: { $ne: currentVersion }
    });
    console.log(`✅ 删除了 ${result.deletedCount} 个旧版本装备数据`);
  } catch (error) {
    console.error('❌ 清理旧装备数据失败:', error.message);
  }
}

/**
 * 更新装备关系
 */
async function updateItemRelationships() {
  try {
    console.log('🔗 更新装备合成关系...');

    const items = await Item.find({ isEnabled: true });
    let updatedCount = 0;

    for (const item of items) {
      let hasUpdates = false;
      const updates = {};

      // 更新from字段 - 将字符串ID转换为对应的装备名称
      if (item.from && item.from.length > 0) {
        const fromItems = await Item.find({
          riotId: { $in: item.from },
          isEnabled: true
        });

        if (fromItems.length !== item.from.length) {
          // 只保留存在的装备ID
          const existingIds = fromItems.map(i => i.riotId);
          updates.from = item.from.filter(id => existingIds.includes(id));
          hasUpdates = true;
        }
      }

      // 更新into字段
      if (item.into && item.into.length > 0) {
        const intoItems = await Item.find({
          riotId: { $in: item.into },
          isEnabled: true
        });

        if (intoItems.length !== item.into.length) {
          const existingIds = intoItems.map(i => i.riotId);
          updates.into = item.into.filter(id => existingIds.includes(id));
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        await Item.findByIdAndUpdate(item._id, updates);
        updatedCount++;
      }
    }

    console.log(`✅ 更新了 ${updatedCount} 个装备的关系`);

  } catch (error) {
    console.error('❌ 更新装备关系失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 开始收集英雄联盟装备数据...');

    // 连接数据库
    await connectDB();

    // 获取最新版本和装备数据
    const version = await getLatestVersion();
    const { items } = await getItemsData(version);

    // 处理装备数据
    const results = await processItems(items, version);

    // 更新装备关系
    await updateItemRelationships();

    // 清理旧版本数据
    await cleanupOldVersions(version);

    // 输出结果统计
    console.log('\n📊 处理结果统计:');
    console.log(`✅ 成功: ${results.success} 个装备`);
    console.log(`❌ 失败: ${results.failed} 个装备`);

    if (results.errors.length > 0) {
      console.log('\n❌ 失败详情:');
      results.errors.forEach(error => {
        console.log(`  - ${error.item}: ${error.error}`);
      });
    }

    // 统计各类装备数量
    const stats = await getItemStats();
    console.log('\n📈 装备统计:');
    console.log(`  - 总装备数: ${stats.total}`);
    console.log(`  - 可购买装备: ${stats.purchasable}`);
    console.log(`  - 召唤师峡谷装备: ${stats.sr}`);
    console.log(`  - 大乱斗装备: ${stats.aram}`);
    console.log(`  - 神话装备: ${stats.mythic}`);
    console.log(`  - 传说装备: ${stats.legendary}`);
    console.log(`  - 靴子: ${stats.boots}`);

    console.log('\n🎉 装备数据收集完成!');

  } catch (error) {
    console.error('💥 数据收集过程出错:', error.message);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('📴 数据库连接已关闭');
    }
  }
}

/**
 * 获取装备统计信息
 */
async function getItemStats() {
  try {
    const total = await Item.countDocuments({ isEnabled: true });
    const purchasable = await Item.countDocuments({ 'gold.purchasable': true, isEnabled: true });
    const sr = await Item.countDocuments({ 'maps.sr': true, isEnabled: true });
    const aram = await Item.countDocuments({ 'maps.aram': true, isEnabled: true });
    const mythic = await Item.countDocuments({ isMythic: true, isEnabled: true });
    const legendary = await Item.countDocuments({ isLegendary: true, isEnabled: true });
    const boots = await Item.countDocuments({ isBoots: true, isEnabled: true });

    return {
      total,
      purchasable,
      sr,
      aram,
      mythic,
      legendary,
      boots
    };
  } catch (error) {
    console.error('获取统计信息失败:', error.message);
    return {};
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  getLatestVersion,
  getItemsData,
  processItems,
  getItemStats
};