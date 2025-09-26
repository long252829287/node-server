/**
 * 英雄数据收集脚本
 * 从Riot Games Data Dragon API获取英雄数据并存储到数据库
 */

const axios = require('axios');
const mongoose = require('mongoose');
const Champion = require('../models/Champion');
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
 * 获取所有英雄基础信息
 */
async function getChampionsData(version) {
  try {
    console.log(`📡 获取英雄列表数据 (版本: ${version})...`);
    const response = await axios.get(
      `${DATA_DRAGON_BASE}/cdn/${version}/data/zh_CN/champion.json`
    );

    const champions = Object.values(response.data.data);
    console.log(`✅ 获取到 ${champions.length} 个英雄`);
    return { champions, version };
  } catch (error) {
    console.error('❌ 获取英雄列表失败:', error.message);
    throw error;
  }
}

/**
 * 获取单个英雄详细信息
 */
async function getChampionDetail(championKey, version) {
  try {
    const response = await axios.get(
      `${DATA_DRAGON_BASE}/cdn/${version}/data/zh_CN/champion/${championKey}.json`
    );

    return response.data.data[championKey];
  } catch (error) {
    console.error(`❌ 获取英雄 ${championKey} 详情失败:`, error.message);
    return null;
  }
}

/**
 * 转换英雄数据格式
 */
function transformChampionData(champion, version) {
  const baseImageUrl = `${DATA_DRAGON_BASE}/cdn/${version}/img/champion/`;
  const splashImageUrl = `${DATA_DRAGON_BASE}/cdn/img/champion/splash/`;
  const passiveImageUrl = `${DATA_DRAGON_BASE}/cdn/${version}/img/passive/`;

  return {
    riotId: champion.id,
    key: champion.key,
    name: champion.name,
    title: champion.title,
    description: champion.blurb,
    images: {
      square: `${baseImageUrl}${champion.image.full}`,
      loading: `${DATA_DRAGON_BASE}/cdn/img/champion/loading/${champion.key}_0.jpg`,
      splash: `${splashImageUrl}${champion.key}_0.jpg`,
      passive: champion.passive ? `${passiveImageUrl}${champion.passive.image.full}` : ''
    },
    tags: champion.tags,
    stats: {
      difficulty: champion.info ? champion.info.difficulty : 5
    },
    version: version,
    isEnabled: true
  };
}

/**
 * 保存英雄数据到数据库
 */
async function saveChampionData(championData) {
  try {
    // 使用 upsert 操作：如果存在则更新，不存在则创建
    const result = await Champion.findOneAndUpdate(
      { riotId: championData.riotId },
      championData,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return result;
  } catch (error) {
    console.error(`❌ 保存英雄 ${championData.name} 失败:`, error.message);
    throw error;
  }
}

/**
 * 批量处理英雄数据
 */
async function processChampions(champions, version) {
  console.log(`🔄 开始处理 ${champions.length} 个英雄数据...`);

  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < champions.length; i++) {
    const champion = champions[i];

    try {
      console.log(`[${i + 1}/${champions.length}] 处理英雄: ${champion.name}`);

      // 获取详细信息 (如果需要更多数据)
      const detailData = await getChampionDetail(champion.id, version);
      const championData = detailData ?
        transformChampionData({ ...champion, ...detailData }, version) :
        transformChampionData(champion, version);

      // 保存到数据库
      await saveChampionData(championData);

      results.success++;
      console.log(`✅ ${champion.name} 处理成功`);

      // 避免请求过于频繁
      await sleep(100);

    } catch (error) {
      results.failed++;
      results.errors.push({
        champion: champion.name,
        error: error.message
      });
      console.error(`❌ 处理英雄 ${champion.name} 失败:`, error.message);
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
    console.log('🧹 清理旧版本数据...');
    const result = await Champion.deleteMany({
      version: { $ne: currentVersion }
    });
    console.log(`✅ 删除了 ${result.deletedCount} 个旧版本英雄数据`);
  } catch (error) {
    console.error('❌ 清理旧数据失败:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🚀 开始收集英雄联盟英雄数据...');

    // 连接数据库
    await connectDB();

    // 获取最新版本和英雄数据
    const version = await getLatestVersion();
    const { champions } = await getChampionsData(version);

    // 处理英雄数据
    const results = await processChampions(champions, version);

    // 清理旧版本数据
    await cleanupOldVersions(version);

    // 输出结果统计
    console.log('\n📊 处理结果统计:');
    console.log(`✅ 成功: ${results.success} 个英雄`);
    console.log(`❌ 失败: ${results.failed} 个英雄`);

    if (results.errors.length > 0) {
      console.log('\n❌ 失败详情:');
      results.errors.forEach(error => {
        console.log(`  - ${error.champion}: ${error.error}`);
      });
    }

    console.log('\n🎉 英雄数据收集完成!');

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

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  getLatestVersion,
  getChampionsData,
  processChampions
};