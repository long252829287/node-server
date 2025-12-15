/**
 * 手动同步强化池数据（CommunityDragon -> MongoDB）
 *
 * 用法：
 *  - node src/scripts/syncAugments.js
 *  - node src/scripts/syncAugments.js --mode hex_brawl --patch 14.24 --deactivate-old
 *  - node src/scripts/syncAugments.js --source https://.../cherry-augments.json
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
  const mode = args.mode || process.env.AUGMENTS_SYNC_MODE || 'hex_brawl';
  const sourceUrl = args.source || process.env.AUGMENTS_SOURCE_URL;
  const patchVersion =
    args.patch ||
    args.patchVersion ||
    process.env.AUGMENTS_PATCH_VERSION ||
    process.env.AUGMENTS_PATCH ||
    'latest';
  const deactivateOld = Boolean(args['deactivate-old'] || args.deactivateOld || process.env.AUGMENTS_DEACTIVATE_OLD === 'true');

  await connectDB();
  try {
    const result = await syncAugmentsToDB({
      mode,
      sourceUrl,
      patchVersion,
      deactivateOld,
      isActive: true,
    });
    console.log(
      `✅ sync ok: mode=${mode} total=${result.total} upserted=${result.upserted} modified=${result.modified}`
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ sync failed:', err.message);
    process.exit(1);
  });
}

module.exports = { main };
