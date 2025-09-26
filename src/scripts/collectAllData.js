/**
 * 统一数据收集脚本
 * 收集英雄和装备数据
 */

const championCollector = require('./collectChampionData');
const itemCollector = require('./collectItemData');

async function main() {
  try {
    console.log('🚀 开始收集英雄联盟游戏数据...');

    // 收集英雄数据
    console.log('\n=== 收集英雄数据 ===');
    await championCollector.main();

    // 收集装备数据
    console.log('\n=== 收集装备数据 ===');
    await itemCollector.main();

    console.log('\n🎉 所有数据收集完成!');

  } catch (error) {
    console.error('💥 数据收集失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };