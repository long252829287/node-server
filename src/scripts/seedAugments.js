/**
 * 强化（Augments）数据导入脚本（MVP JSON seed）
 *
 * 用法：
 *  - node src/scripts/seedAugments.js
 *  - node src/scripts/seedAugments.js --file data/augments.hex_brawl.json --mode hex_brawl --patch 14.24 --deactivate-old
 *
 * JSON 支持格式：
 *  - { "augments": [...] }
 *  - [ ... ]
 *
 * 单条 augment 字段兼容：
 *  - augmentId | apiName | id 作为 augmentId（最终都会转成 string）
 *  - name
 *  - description | desc | tooltip
 *  - icon | iconLarge | iconSmall
 *  - tier | rarity
 *  - tags
 *  - modes（可选）
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('rootpath')();
require('dotenv').config();

const { connectDB } = require('../config/database');
const Augment = require('../models/Augment');

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

const pickFirstString = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const toStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

async function main() {
  const args = parseArgs();

  const defaultSeedFile = path.join(process.cwd(), 'data/augments.hex_brawl.json');
  const fallbackSeedFile = path.join(__dirname, '../assets/json/lol/augment.json');
  const seedFile = args.file
    ? path.isAbsolute(args.file)
      ? args.file
      : path.join(process.cwd(), args.file)
    : fs.existsSync(defaultSeedFile)
      ? defaultSeedFile
      : fallbackSeedFile;

  const mode = pickFirstString(args.mode, 'hex_brawl');
  const patchVersion = pickFirstString(args.patch, args.patchVersion);
  const isActive = args.active === false || args.active === 'false' ? false : true;
  const deactivateOld = Boolean(args['deactivate-old'] || args.deactivateOld);

  if (!fs.existsSync(seedFile)) {
    console.error(`❌ seed 文件不存在: ${seedFile}`);
    process.exit(1);
  }

  await connectDB();

  try {
    const raw = fs.readFileSync(seedFile, 'utf8');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.augments) ? parsed.augments : [];

    console.log('🚀 Augments seed');
    console.log(`- file: ${seedFile}`);
    console.log(`- mode: ${mode}`);
    console.log(`- patchVersion: ${patchVersion || '(not set)'}`);
    console.log(`- isActive: ${isActive}`);
    console.log(`- count: ${list.length}`);

    if (deactivateOld && patchVersion) {
      const result = await Augment.updateMany(
        { modes: mode, patchVersion: { $ne: patchVersion } },
        { $set: { isActive: false } }
      );
      console.log(`- deactivated old: matched=${result.matchedCount} modified=${result.modifiedCount}`);
    }

    const ops = [];
    for (const a of list) {
      const augmentId = pickFirstString(a?.augmentId, a?.apiName, a?.id);
      const name = pickFirstString(a?.name);

      if (!augmentId || !name) continue;

      const description = pickFirstString(a?.description, a?.desc, a?.tooltip);
      const icon = pickFirstString(a?.icon, a?.iconLarge, a?.iconSmall);
      const tier = pickFirstString(a?.tier, a?.rarity);
      const tags = toStringArray(a?.tags);
      const modes = Array.from(new Set([...toStringArray(a?.modes), mode])).filter(Boolean);

      ops.push({
        updateOne: {
          filter: { augmentId },
          update: {
            $set: {
              augmentId,
              name,
              description,
              icon,
              tier: tier || undefined,
              tags,
              modes,
              patchVersion: patchVersion || undefined,
              isActive,
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length === 0) {
      console.log('⚠️ 没有可导入的数据（请检查 JSON 结构/字段）');
      return;
    }

    const result = await Augment.bulkWrite(ops, { ordered: false });
    console.log(
      `✅ bulkWrite done: inserted=${result.insertedCount || 0} upserted=${result.upsertedCount || 0} modified=${result.modifiedCount || 0}`
    );
  } catch (error) {
    console.error('❌ seed 失败:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };

