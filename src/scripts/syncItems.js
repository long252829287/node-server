/**
 * 手动同步装备数据
 * - 标准模式：Data Dragon
 * - 海克斯大乱斗（hex_brawl）：Data Dragon 标准装备的 ARAM 子集（写入 hex_items + 本地缓存）
 *
 * 用法：
 *  - npm run sync:items
 *  - npm run sync:items -- --mode standard
 *  - npm run sync:items -- --mode hex_brawl
 */

const mongoose = require('mongoose');
require('rootpath')();
require('dotenv').config();

const { connectDB } = require('../config/database');
const { syncStandardItemsToDB, syncHexItemsToDB } = require('../services/itemSyncService');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      i++;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
};

async function main() {
  const args = parseArgs();
  const locale = args.locale || process.env.LOL_LOCALE || 'zh_CN';
  const mode = args.mode || 'both';
  const version = args.version || args.patch || process.env.ITEMS_PATCH_VERSION || process.env.LOL_PATCH_VERSION || 'latest';

  await connectDB();
  try {
    if (mode === 'standard' || mode === 'both') {
      const result = await syncStandardItemsToDB({ locale });
      console.log(`✅ items(standard) sync ok: version=${result.version} total=${result.total} upserted=${result.upserted} modified=${result.modified}`);
    }

    if (mode === 'hex_brawl' || mode === 'hex' || mode === 'both') {
      const result = await syncHexItemsToDB({ version, locale });
      console.log(
        `✅ items(hex_brawl) sync ok: version=${result.version} locale=${locale} total=${result.total} upserted=${result.upserted} modified=${result.modified}`
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ items sync failed:', err.message);
    process.exit(1);
  });
}

module.exports = { main };
