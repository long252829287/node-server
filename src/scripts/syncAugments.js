/**
 * 手动同步海克斯强化数据（本地 JSON -> MongoDB）
 *
 * 用法：
 *  - npm run sync:augments
 *  - npm run sync:augments -- --no-deactivate
 */

const mongoose = require('mongoose');
require('rootpath')();
require('dotenv').config();

const { connectDB } = require('../config/database');
const { syncAugmentsToDB } = require('../services/augmentSyncService');

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
  const deactivateMissing = args['no-deactivate'] ? false : true;

  await connectDB();
  try {
    const result = await syncAugmentsToDB({
      deactivateMissing,
    });
    console.log(
      `✅ augments sync ok: version=${result.version} total=${result.total} upserted=${result.upserted} modified=${result.modified} disabled=${result.disabled}`
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ augments sync failed:', err.message);
    process.exit(1);
  });
}

module.exports = { main };
