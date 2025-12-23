/**
 * 海克斯强化数据同步服务
 * - 从本地 JSON（data/cache/augments.json 或 augment.json）读取
 * - 写入 MongoDB（augments 集合）
 */

const path = require('path');

const Augment = require('../models/Augment');
const { readFirstJson } = require('../utils/localJsonCache');

const COMMUNITY_DRAGON_LATEST_GAME_BASE = 'https://raw.communitydragon.org/latest/game/';

const coerceString = (value) => String(value ?? '').trim();

const normalizeCommunityDragonUrlToLatestGame = (url) => {
  const raw = coerceString(url);
  if (!raw) return '';
  const match = raw.match(/^https?:\/\/raw\.communitydragon\.org\/([^/]+)\/game\/(assets\/.+)$/i);
  if (match) {
    return `${COMMUNITY_DRAGON_LATEST_GAME_BASE}${match[2].replace(/^\/+/, '')}`;
  }
  return raw;
};

const normalizeAugment = ({ raw, meta }) => {
  if (!raw) return null;

  const augmentId = raw.id !== undefined ? coerceString(raw.id) : '';
  if (!augmentId) return null;

  const name = coerceString(raw.nameTRA || raw.name);
  const icon = normalizeCommunityDragonUrlToLatestGame(coerceString(raw.augmentSmallIconPath || raw.icon));
  const rarity = coerceString(raw.rarity);
  if (!name || !rarity) return null;

  const syncId = coerceString(meta?.syncId || meta?.version || 'local');
  const id = augmentId;

  return {
    syncId,
    id,
    augmentId,
    name,
    icon,
    rarity,
    version: coerceString(meta?.version),
    sourceUrl: coerceString(meta?.sourceUrl),
    isEnabled: true,
  };
};

const loadAugmentsFromLocalJson = ({ filePaths } = {}) => {
  const data = readFirstJson(filePaths);
  if (!data) return { meta: null, augments: [] };

  const list = Array.isArray(data?.augments) ? data.augments : Array.isArray(data) ? data : [];

  const meta = {
    syncId: data?.syncId || data?.scraped_at || data?.updatedAt || data?.version || 'local',
    version: data?.syncId || data?.scraped_at || data?.updatedAt || data?.version || 'local',
    sourceUrl: data?.sourceUrl || data?.source || '',
  };

  const augments = list.map((raw) => normalizeAugment({ raw, meta })).filter(Boolean);
  return { meta, augments };
};

async function syncAugmentsToDB({
  filePaths = [path.join(__dirname, '../assets/json/lol/augment.json')],
  deactivateMissing = true,
} = {}) {
  const { meta, augments } = loadAugmentsFromLocalJson({ filePaths });

  if (augments.length === 0) {
    return { version: meta?.version || 'local', total: 0, upserted: 0, modified: 0, disabled: 0 };
  }

  const ids = augments.map((a) => a.augmentId);

  let disabled = 0;
  if (deactivateMissing) {
    const result = await Augment.updateMany({ augmentId: { $nin: ids } }, { $set: { isEnabled: false } });
    disabled = result.modifiedCount || 0;
  }

  const ops = augments.map((a) => ({
    updateOne: {
      filter: { augmentId: a.augmentId },
      update: { $set: a },
      upsert: true,
    },
  }));

  const result = await Augment.bulkWrite(ops, { ordered: false });

  return {
    version: meta?.version || 'local',
    total: augments.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
    disabled,
  };
}

module.exports = {
  loadAugmentsFromLocalJson,
  syncAugmentsToDB,
  normalizeCommunityDragonUrlToLatestGame,
  COMMUNITY_DRAGON_LATEST_GAME_BASE,
};
