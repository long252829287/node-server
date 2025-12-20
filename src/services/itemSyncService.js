/**
 * 装备数据同步服务
 * - 标准模式：Riot Data Dragon（/item.json）
 * - 海克斯大乱斗（hex_brawl）：Data Dragon 标准装备的 ARAM 子集（中文 + 图片稳定）
 * - 同步成功：写入 MongoDB + 本地 JSON 缓存
 */

const axios = require('axios');
const path = require('path');

const Item = require('../models/Item');
const HexItem = require('../models/HexItem');
const { writeJsonAtomic } = require('../utils/localJsonCache');

const DATA_DRAGON_BASE = 'https://ddragon.leagueoflegends.com';

const getLatestVersion = async (timeoutMs = 15000) => {
  const response = await axios.get(`${DATA_DRAGON_BASE}/api/versions.json`, { timeout: timeoutMs });
  const latestVersion = response?.data?.[0];
  if (!latestVersion) throw new Error('获取最新版本失败');
  return latestVersion;
};

// ==================== 标准模式（Data Dragon） ====================

const fetchStandardItems = async ({ version, locale = 'zh_CN', timeoutMs = 15000 }) => {
  const response = await axios.get(`${DATA_DRAGON_BASE}/cdn/${version}/data/${locale}/item.json`, {
    timeout: timeoutMs,
  });

  const data = response?.data?.data || {};
  return Object.entries(data).map(([id, item]) => ({ id, ...item }));
};

const transformStandardItem = ({ item, version }) => {
  const imageUrl = item.image?.full ? `${DATA_DRAGON_BASE}/cdn/${version}/img/item/${item.image.full}` : '';

  const maps = {
    sr: true,
    ha: true,
    aram: true,
  };
  if (item.maps) {
    maps.sr = item.maps['11'] !== false;
    maps.ha = item.maps['12'] !== false;
    maps.aram = item.maps['12'] !== false;
  }

  const isMythic = Boolean(item.description && item.description.includes('神话'));
  const isLegendary = Boolean(item.description && item.description.includes('传说'));
  const isBoots = Boolean(item.tags && item.tags.includes('Boots'));

  return {
    riotId: String(item.id),
    name: item.name,
    description: item.description || '',
    plaintext: item.plaintext || '',
    image: imageUrl,
    gold: {
      total: item.gold?.total || 0,
      base: item.gold?.base || 0,
      sell: item.gold?.sell || 0,
      purchasable: item.gold?.purchasable !== false,
    },
    tags: item.tags || [],
    maps,
    depth: item.depth || 1,
    from: item.from || [],
    into: item.into || [],
    specialRecipe: item.specialRecipe || 0,
    group: item.group || '',
    isMythic,
    isLegendary,
    isBoots,
    version,
    isEnabled: true,
  };
};

async function syncStandardItemsToDB({
  locale = 'zh_CN',
  cacheFile = path.join(process.cwd(), 'data/cache/items.standard.json'),
  timeoutMs = 15000,
} = {}) {
  const version = await getLatestVersion(timeoutMs);
  const items = await fetchStandardItems({ version, locale, timeoutMs });
  const normalized = items.map((i) => transformStandardItem({ item: i, version })).filter(Boolean);

  if (normalized.length === 0) {
    return { version, total: 0, upserted: 0, modified: 0 };
  }

  const ops = normalized.map((i) => ({
    updateOne: {
      filter: { riotId: i.riotId },
      update: { $set: i },
      upsert: true,
    },
  }));

  const result = await Item.bulkWrite(ops, { ordered: false });

  try {
    writeJsonAtomic(cacheFile, { version, items: normalized });
  } catch {}

  return {
    version,
    total: normalized.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
  };
}

// ==================== 海克斯大乱斗（Hex Brawl） ====================

const transformHexBrawlItem = ({ item, version }) => {
  const normalized = transformStandardItem({ item, version });
  if (!normalized) return null;
  if (normalized.maps?.aram !== true) return null;

  const tags = normalized.tags || [];
  const priceTotal = normalized.gold?.total || 0;
  const isLegendary = priceTotal >= 2000 && !tags.includes('Consumable') && !tags.includes('Trinket');

  return {
    ...normalized,
    maps: { sr: false, ha: false, aram: true },
    isLegendary,
    depth: isLegendary ? 3 : 1,
  };
};

async function syncHexItemsToDB({
  cacheFile = path.join(process.cwd(), 'data/cache/items.hex_brawl.json'),
  timeoutMs = 15000,
  locale = 'zh_CN',
  version,
  deactivateOld = true,
} = {}) {
  const resolvedVersion = version ? String(version).trim() : await getLatestVersion(timeoutMs);
  const versionForFetch = resolvedVersion === 'latest' ? await getLatestVersion(timeoutMs) : resolvedVersion;
  const items = await fetchStandardItems({ version: versionForFetch, locale, timeoutMs });
  const normalized = items.map((i) => transformHexBrawlItem({ item: i, version: versionForFetch })).filter(Boolean);

  if (normalized.length === 0) {
    return { version: versionForFetch, total: 0, upserted: 0, modified: 0 };
  }

  if (deactivateOld) {
    await HexItem.updateMany({ version: { $ne: versionForFetch } }, { $set: { isEnabled: false } });
  }

  const ops = normalized.map((i) => ({
    updateOne: {
      filter: { riotId: i.riotId },
      update: { $set: i },
      upsert: true,
    },
  }));

  const result = await HexItem.bulkWrite(ops, { ordered: false });

  try {
    writeJsonAtomic(cacheFile, { version: versionForFetch, items: normalized });
  } catch {}

  return {
    version: versionForFetch,
    total: normalized.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
  };
}

module.exports = {
  DATA_DRAGON_BASE,
  syncStandardItemsToDB,
  syncHexItemsToDB,
};
