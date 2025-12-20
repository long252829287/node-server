/**
 * 强化（Augments）同步服务
 * 方案A：从 CommunityDragon 拉取最新强化数据并写入 MongoDB
 */

const axios = require('axios');
const Augment = require('../models/Augment');

// 注意：
// - CommunityDragon 提供的「强化定义」主要来自 Arena（cdragon/arena/*.json），其中包含 apiName/id/name/desc 等字段。
// - “海克斯大乱斗”（ARAM: Mayhem）与 Arena 强化很像但不完全相同，CommunityDragon 未必提供独立的静态列表。
//   建议使用 `poolUrl`（或环境变量 AUGMENTS_POOL_URL）提供“该模式允许的强化集合”来做过滤同步。
const DEFAULT_LOCALE = 'zh_CN';

const CDRAGON_GAME_ASSET_BASE = 'https://raw.communitydragon.org/latest/game/';

const normalizeCDragonLocale = (locale) => {
  if (!locale) return 'zh_cn';
  const raw = String(locale).trim();
  if (!raw) return 'zh_cn';
  return raw.toLowerCase().replace('-', '_');
};

const getDefaultCDragonArenaSourceUrl = (locale) =>
  `https://raw.communitydragon.org/latest/cdragon/arena/${normalizeCDragonLocale(locale)}.json`;

const pickFirstString = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const normalizeTier = (value) => {
  if (value === undefined || value === null) return undefined;

  // cdragon arena: rarity: 0/1/2
  if (typeof value === 'number') {
    if (value === 0) return 'silver';
    if (value === 1) return 'gold';
    if (value === 2) return 'prismatic';
    return String(value);
  }

  const text = String(value).trim();
  if (!text) return undefined;

  // 兼容：0/1/2 字符串
  if (text === '0') return 'silver';
  if (text === '1') return 'gold';
  if (text === '2') return 'prismatic';

  // 兼容：kSilver/kGold/kPrismatic
  const lowered = text.toLowerCase();
  if (lowered === 'ksilver' || lowered.includes('silver')) return 'silver';
  if (lowered === 'kgold' || lowered.includes('gold')) return 'gold';
  if (lowered === 'kprismatic' || lowered.includes('prismatic')) return 'prismatic';

  return text;
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

const pickFirstNumber = (...values) => {
  for (const value of values) {
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
};

const normalizeAugmentPool = (raw) => {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.augments)
      ? raw.augments
      : Array.isArray(raw?.augmentIds)
        ? raw.augmentIds
        : Array.isArray(raw?.allowedAugments)
          ? raw.allowedAugments
          : [];

  const apiNames = new Set();
  const ids = new Set();

  for (const entry of list) {
    if (entry === undefined || entry === null) continue;
    if (typeof entry === 'string') {
      const text = entry.trim();
      if (text) apiNames.add(text);
      continue;
    }
    if (typeof entry === 'number') {
      ids.add(entry);
      continue;
    }

    const apiName = pickFirstString(entry?.augmentId, entry?.apiName);
    if (apiName) apiNames.add(apiName);
    const id = pickFirstNumber(entry?.id);
    if (id !== undefined) ids.add(id);
  }

  return { apiNames, ids };
};

const fetchAugmentPoolFromSource = async ({ poolUrl, timeoutMs = 15000 }) => {
  if (!poolUrl) return null;
  const url = String(poolUrl).trim();
  if (!url) return null;

  const response = await axios.get(url, {
    timeout: timeoutMs,
    headers: {
      'User-Agent': 'lyl-api-server/1.0 (augment-sync)',
      Accept: 'application/json',
    },
  });

  return normalizeAugmentPool(response?.data);
};

const normalizeAugment = (raw, mode) => {
  const augmentId = pickFirstString(raw?.augmentId, raw?.apiName, raw?.id);
  const name = pickFirstString(raw?.name, raw?.nameTRA);
  if (!augmentId || !name) return null;

  const description = pickFirstString(raw?.description, raw?.desc, raw?.tooltip);
  const icon = normalizeIconUrl(pickFirstString(raw?.icon, raw?.iconLarge, raw?.iconSmall, raw?.augmentSmallIconPath));
  const tier = normalizeTier(raw?.tier ?? raw?.rarity);

  const tags = toStringArray(raw?.tags);
  const modes = Array.from(new Set([...toStringArray(raw?.modes), String(mode).trim()])).filter(Boolean);

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

const fetchAugmentsFromSource = async ({ sourceUrl, locale = DEFAULT_LOCALE, timeoutMs = 15000 }) => {
  const url = sourceUrl || getDefaultCDragonArenaSourceUrl(locale);
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
 * @param {string} [options.poolUrl] 强化池 URL（用于过滤“该模式允许的强化集合”）
 * @param {string} [options.locale='zh_CN'] 数据语言（仅默认 sourceUrl 时生效）
 * @param {string} [options.patchVersion] patchVersion 字段（建议在部署时由环境变量提供）
 * @param {boolean} [options.isActive=true] 写入 isActive
 * @param {boolean} [options.deactivateOld=false] 若为 true 且 patchVersion 存在：同 mode 下其他 patchVersion 置为 isActive=false
 * @param {boolean} [options.refreshModeMembership=true] 同步前先移除该 mode，再把当前列表加回，保证 mode 维度的集合准确
 * @returns {Promise<{ total: number, upserted: number, modified: number }>}
 */
async function syncAugmentsToDB({
  mode = 'hex_brawl',
  sourceUrl,
  poolUrl,
  locale = DEFAULT_LOCALE,
  patchVersion,
  isActive = true,
  deactivateOld = false,
  refreshModeMembership = true,
} = {}) {
  const resolvedMode = String(mode || 'hex_brawl').trim();
  const resolvedPatch = patchVersion ? String(patchVersion).trim() : undefined;

  const pool = await fetchAugmentPoolFromSource({ poolUrl: poolUrl || process.env.AUGMENTS_POOL_URL });

  let rawList = await fetchAugmentsFromSource({ sourceUrl, locale });
  if (pool && (pool.apiNames.size > 0 || pool.ids.size > 0)) {
    rawList = rawList.filter((a) => {
      const apiName = pickFirstString(a?.augmentId, a?.apiName);
      const numericId = pickFirstNumber(a?.id);
      return (apiName && pool.apiNames.has(apiName)) || (numericId !== undefined && pool.ids.has(numericId));
    });
  }

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

  if (refreshModeMembership) {
    await Augment.updateMany({ modes: resolvedMode }, { $pull: { modes: resolvedMode } });
  }

  const ops = normalized.map((a) => ({
    updateOne: {
      filter: { augmentId: a.augmentId },
      update: {
        $set: { ...a, patchVersion: resolvedPatch || undefined, isActive },
        $addToSet: { modes: { $each: a.modes || [resolvedMode] } },
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
  CDRAGON_GAME_ASSET_BASE,
  DEFAULT_LOCALE,
  getDefaultCDragonArenaSourceUrl,
  syncAugmentsToDB,
};
