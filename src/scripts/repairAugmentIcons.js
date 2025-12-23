/**
 * 修复海克斯强化 icon（切换 latest + 自动避开 404）
 *
 * 用法：
 *  - npm run repair:augment-icons
 *  - npm run repair:augment-icons -- --dry-run
 *  - npm run repair:augment-icons -- --no-validate
 *  - npm run repair:augment-icons -- --force
 *  - npm run repair:augment-icons -- --use-cache
 */

const mongoose = require('mongoose');
require('rootpath')();
require('dotenv').config();

const { connectDB } = require('../config/database');
const { repairAugmentIcons } = require('../services/augmentIconRepairService');

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
  const dryRun = Boolean(args['dry-run'] || args.dryRun);
  const validate = args['no-validate'] ? false : true;
  const force = Boolean(args.force);
  const concurrency = args.concurrency ? Number(args.concurrency) : 8;
  const timeoutMs = args.timeout ? Number(args.timeout) : 8000;
  const useCache = Boolean(args['use-cache'] || args.useCache);

  await connectDB();
  try {
    const result = await repairAugmentIcons({
      dryRun,
      validate,
      force,
      concurrency,
      timeoutMs,
      extraIconFilePath: useCache ? 'data/cache/augments.json' : '',
    });
    console.log(
      `✅ augment icon repair ok: dbTotal=${result.dbTotal} matched=${result.matched} updated=${result.updated} validate=${result.validate} dryRun=${result.dryRun}`
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ augment icon repair failed:', err.message);
    process.exit(1);
  });
}

module.exports = { main };
