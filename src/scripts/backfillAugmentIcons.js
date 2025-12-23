/**
 * 回填海克斯强化备用图标（augment_r.json -> MongoDB）
 *
 * 用法：
 *  - npm run backfill:augment-icons
 *  - npm run backfill:augment-icons -- --force
 */

const mongoose = require('mongoose');
require('rootpath')();
require('dotenv').config();

const { connectDB } = require('../config/database');
const { backfillAugmentIconsFromArenaJson } = require('../services/augmentIconBackfillService');

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
  const force = Boolean(args.force);

  await connectDB();
  try {
    const result = await backfillAugmentIconsFromArenaJson({ force });
    console.log(
      `✅ augment icons backfill ok: sourceTotal=${result.sourceTotal} dbTotal=${result.dbTotal} matched=${result.matched} updated=${result.updated} modified=${result.modified}`
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ augment icons backfill failed:', err.message);
    process.exit(1);
  });
}

module.exports = { main };

