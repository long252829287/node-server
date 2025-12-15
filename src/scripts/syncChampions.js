/**
 * 手动同步英雄数据（Data Dragon -> MongoDB）
 *
 * 用法：
 *  - npm run sync:champions
 */

const mongoose = require('mongoose');
require('rootpath')();
require('dotenv').config();

const { connectDB } = require('../config/database');
const { syncChampionsToDB } = require('../services/championSyncService');

async function main() {
  const locale = process.env.LOL_LOCALE || 'zh_CN';
  await connectDB();
  try {
    const result = await syncChampionsToDB({ locale });
    console.log(`✅ champions sync ok: version=${result.version} total=${result.total} upserted=${result.upserted} modified=${result.modified}`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ champions sync failed:', err.message);
    process.exit(1);
  });
}

module.exports = { main };

