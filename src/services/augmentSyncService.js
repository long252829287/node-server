/**
 * 强化（Augments）同步服务
 * 方案A：从 CommunityDragon 拉取最新强化数据并写入 MongoDB
 */

const axios = require('axios');
const Augment = require('../models/Augment');

const DEFAULT_SOURCE_URL =
  'https://raw.communitydragon.org/latest/cdragon/arena/zh_cn.json';

const CDRAGON_GAME_ASSET_BASE = 'https://raw.communitydragon.org/latest/game/';

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

const normalizeIconUrl = (value) => {
  const icon = pickFirstString(value);
  if (!icon) return '';

  if (icon.startsWith('http://') || icon.startsWith('https://')) return icon;

  // cdragon arena: "assets/ux/..."
  if (icon.startsWith('assets/')) return `${CDRAGON_GAME_ASSET_BASE}${icon}`;

  // rcp-be-lol-game-data: "/lol-game-data/assets/..."
  if (icon.startsWith('/')) return `https://raw.communitydragon.org/latest${icon}`;

  return icon;
};

const normalizeAugment = (raw, mode) => {
  const augmentId = pickFirstString(raw?.augmentId, raw?.apiName, raw?.id);
  const name = pickFirstString(raw?.name, raw?.nameTRA);
  if (!augmentId || !name) return null;

  const description = pickFirstString(raw?.description, raw?.desc, raw?.tooltip);
  const icon = normalizeIconUrl(pickFirstString(raw?.icon, raw?.iconLarge, raw?.iconSmall, raw?.augmentSmallIconPath));
  const tier = pickFirstString(raw?.tier, raw?.rarity);

  const tags = toStringArray(raw?.tags);
  const modes = Array.from(new Set([...toStringArray(raw?.modes), mode])).filter(Boolean);

  return {
    augmentId: String(augmentId),
    name,
    description,
    icon,
    tier: tier || undefined,
    tags,
    modes,
  };
};

const fetchAugmentsFromSource = async ({ sourceUrl, timeoutMs = 15000 }) => {
  const url = sourceUrl || DEFAULT_SOURCE_URL;
  const response = await axios.get(url, {
    timeout: timeoutMs,
    headers: {
      'User-Agent': 'lyl-api-server/1.0 (augment-sync)',
      Accept: 'application/json',
    },
  });

  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.augments)) return data.augments;
  return [];
};

/**
 * 同步强化数据到数据库
 * @param {Object} options
 * @param {string} [options.mode='hex_brawl'] 写入 modes 的模式值
 * @param {string} [options.sourceUrl] 数据源 URL（不传用默认 CommunityDragon）
 * @param {string} [options.patchVersion] patchVersion 字段（建议在部署时由环境变量提供）
 * @param {boolean} [options.isActive=true] 写入 isActive
 * @param {boolean} [options.deactivateOld=false] 若为 true 且 patchVersion 存在：同 mode 下其他 patchVersion 置为 isActive=false
 * @returns {Promise<{ total: number, upserted: number, modified: number }>}
 */
async function syncAugmentsToDB({
  mode = 'hex_brawl',
  sourceUrl,
  patchVersion,
  isActive = true,
  deactivateOld = false,
} = {}) {
  const resolvedMode = String(mode || 'hex_brawl').trim();
  const resolvedPatch = patchVersion ? String(patchVersion).trim() : undefined;

  const rawList = await fetchAugmentsFromSource({ sourceUrl });
  const normalized = rawList.map((a) => normalizeAugment(a, resolvedMode)).filter(Boolean);

  if (normalized.length === 0) {
    return { total: 0, upserted: 0, modified: 0 };
  }

  if (deactivateOld && resolvedPatch) {
    await Augment.updateMany(
      { modes: resolvedMode, patchVersion: { $ne: resolvedPatch } },
      { $set: { isActive: false } }
    );
  }

  const ops = normalized.map((a) => ({
    updateOne: {
      filter: { augmentId: a.augmentId },
      update: {
        $set: {
          ...a,
          patchVersion: resolvedPatch || undefined,
          isActive,
        },
      },
      upsert: true,
    },
  }));

  const result = await Augment.bulkWrite(ops, { ordered: false });

  return {
    total: normalized.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
  };
}

module.exports = {
  DEFAULT_SOURCE_URL,
  CDRAGON_GAME_ASSET_BASE,
  syncAugmentsToDB,
};
