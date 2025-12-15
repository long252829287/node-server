/**
 * 装备数据同步服务
 * - 标准模式：Riot Data Dragon（/item.json）
 * - 海克斯模式（hex_brawl）：CommunityDragon items.json（rcp-be-lol-game-data）
 * - 同步成功：写入 MongoDB + 本地 JSON 缓存
 */

const axios = require('axios');
const path = require('path');

const Item = require('../models/Item');
const HexItem = require('../models/HexItem');
const { writeJsonAtomic } = require('../utils/localJsonCache');

const DATA_DRAGON_BASE = 'https://ddragon.leagueoflegends.com';
const CDRAGON_RCP_ITEMS_URL =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/items.json';
const CDRAGON_ITEM_ICON_BASE = 'https://raw.communitydragon.org/latest/game/assets/items/icons2d/';

const getLatestVersion = async (timeoutMs = 15000) => {
  const response = await axios.get(`${DATA_DRAGON_BASE}/api/versions.json`, { timeout: timeoutMs });
  const latestVersion = response?.data?.[0];
  if (!latestVersion) throw new Error('获取最新版本失败');
  return latestVersion;
};

const normalizeCDragonItemIcon = (iconPath) => {
  if (!iconPath) return '';
  const parts = String(iconPath).split('/');
  const file = parts[parts.length - 1];
  if (!file) return '';
  return `${CDRAGON_ITEM_ICON_BASE}${file.toLowerCase()}`;
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

// ==================== 海克斯模式（CommunityDragon） ====================

const fetchHexItems = async ({ timeoutMs = 15000, sourceUrl = CDRAGON_RCP_ITEMS_URL }) => {
  const response = await axios.get(sourceUrl, { timeout: timeoutMs });
  const list = response?.data;
  return Array.isArray(list) ? list : [];
};

const transformHexItem = ({ item, version = 'latest' }) => {
  if (!item?.id || !item?.name) return null;
  if (item.inStore === false) return null;

  const isBoots = Boolean(item.categories && item.categories.includes('Boots'));

  return {
    riotId: String(item.id),
    name: item.name,
    description: item.description || '',
    plaintext: '',
    image: normalizeCDragonItemIcon(item.iconPath),
    gold: {
      total: item.priceTotal || item.price || 0,
      base: item.price || 0,
      sell: 0,
      purchasable: item.inStore !== false,
    },
    tags: item.categories || [],
    maps: {
      sr: false,
      ha: false,
      aram: true,
    },
    depth: 1,
    from: item.from || [],
    into: item.to || [],
    specialRecipe: item.specialRecipe || 0,
    group: '',
    isMythic: false,
    isLegendary: false,
    isBoots,
    version,
    isEnabled: true,
  };
};

async function syncHexItemsToDB({
  cacheFile = path.join(process.cwd(), 'data/cache/items.hex_brawl.json'),
  timeoutMs = 15000,
  sourceUrl = CDRAGON_RCP_ITEMS_URL,
  version = 'latest',
} = {}) {
  const items = await fetchHexItems({ timeoutMs, sourceUrl });
  const normalized = items.map((i) => transformHexItem({ item: i, version })).filter(Boolean);

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

  const result = await HexItem.bulkWrite(ops, { ordered: false });

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

module.exports = {
  DATA_DRAGON_BASE,
  CDRAGON_RCP_ITEMS_URL,
  syncStandardItemsToDB,
  syncHexItemsToDB,
};

