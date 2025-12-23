/**
 * 海克斯强化备用图标回填服务
 * - 数据源：src/assets/json/lol/augment_r.json（来自 CommunityDragon cdragon/arena/zh_cn.json）
 * - 匹配方式：按中文 name 与数据库 Augment.name 匹配
 * - 回填字段：iconSmall / iconLarge（保存为 raw.communitydragon.org 的可访问 URL）
 */

const fs = require('fs');
const path = require('path');

const Augment = require('../models/Augment');

const COMMUNITY_DRAGON_DEFAULT_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/';

const coerceString = (value) => String(value ?? '').trim();

const normalizeNameKey = (value) =>
  coerceString(value)
    .replace(/\s+/g, '')
    .replace(/[·•・]/g, '')
    .toLowerCase();

const normalizeIconKey = (value) => {
  const raw = coerceString(value);
  if (!raw) return '';
  const match = raw.match(/\/icons\/([^/]+?)_(?:large|small)\.png/i);
  return match ? coerceString(match[1]).toLowerCase() : '';
};

const toCommunityDragonUrl = (maybePath, baseUrl = COMMUNITY_DRAGON_DEFAULT_BASE) => {
  const raw = coerceString(maybePath);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalized = raw.replace(/^\/+/, '');
  return `${baseUrl}${normalized}`;
};

const loadAugmentIconMapFromFile = (filePath) => {
  const resolved = filePath || path.join(__dirname, '../assets/json/lol/augment_r.json');
  const raw = fs.readFileSync(resolved, 'utf8');
  const data = JSON.parse(raw);
  const list = Array.isArray(data?.augments) ? data.augments : [];

  const map = new Map(); // nameKey -> record
  const iconKeyMap = new Map(); // iconKey -> record
  for (const item of list) {
    const name = coerceString(item?.name);
    if (!name) continue;
    const key = normalizeNameKey(name);
    if (!key) continue;

    const record = map.get(key) || {
      name,
      iconSmall: item?.iconSmall || '',
      iconLarge: item?.iconLarge || '',
      arenaId: item?.id,
      apiName: item?.apiName || '',
    };
    if (!map.has(key)) map.set(key, record);

    const iconKey = normalizeIconKey(item?.iconLarge) || normalizeIconKey(item?.iconSmall);
    if (iconKey && !iconKeyMap.has(iconKey)) iconKeyMap.set(iconKey, record);
  }

  return { map, iconKeyMap, total: list.length };
};

async function backfillAugmentIconsFromArenaJson({
  filePath = path.join(__dirname, '../assets/json/lol/augment_r.json'),
  baseUrl = COMMUNITY_DRAGON_DEFAULT_BASE,
  force = false,
  onlyEnabled = true,
} = {}) {
  const { map, iconKeyMap, total } = loadAugmentIconMapFromFile(filePath);

  const query = onlyEnabled ? { isEnabled: true } : {};
  const docs = await Augment.find(query).select('_id augmentId name icon iconSmall iconLarge').lean();

  const ops = [];
  let matched = 0;
  let updated = 0;

  for (const doc of docs) {
    const key = normalizeNameKey(doc?.name);
    const iconKey = normalizeIconKey(doc?.icon);
    const hit = (key && map.get(key)) || (iconKey && iconKeyMap.get(iconKey)) || null;
    if (!hit) continue;

    matched++;

    const nextSmall = toCommunityDragonUrl(hit.iconSmall, baseUrl);
    const nextLarge = toCommunityDragonUrl(hit.iconLarge, baseUrl);
    if (!nextSmall && !nextLarge) continue;

    const shouldSetSmall = force || !coerceString(doc.iconSmall);
    const shouldSetLarge = force || !coerceString(doc.iconLarge);
    if (!shouldSetSmall && !shouldSetLarge) continue;

    const $set = {};
    if (shouldSetSmall && nextSmall) $set.iconSmall = nextSmall;
    if (shouldSetLarge && nextLarge) $set.iconLarge = nextLarge;
    if (Object.keys($set).length === 0) continue;

    updated++;
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set },
      },
    });
  }

  if (ops.length === 0) {
    return { sourceTotal: total, dbTotal: docs.length, matched, updated: 0, modified: 0 };
  }

  const result = await Augment.bulkWrite(ops, { ordered: false });
  return {
    sourceTotal: total,
    dbTotal: docs.length,
    matched,
    updated,
    modified: result.modifiedCount || 0,
  };
}

module.exports = {
  COMMUNITY_DRAGON_DEFAULT_BASE,
  backfillAugmentIconsFromArenaJson,
  loadAugmentIconMapFromFile,
};
