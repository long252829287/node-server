/**
 * 英雄数据同步服务
 * - 数据源：Riot Data Dragon
 * - 同步成功：写入 MongoDB + 本地 JSON 缓存
 */

const axios = require('axios');
const path = require('path');

const Champion = require('../models/Champion');
const { writeJsonAtomic } = require('../utils/localJsonCache');

const DATA_DRAGON_BASE = 'https://ddragon.leagueoflegends.com';

const getLatestVersion = async (timeoutMs = 15000) => {
  const response = await axios.get(`${DATA_DRAGON_BASE}/api/versions.json`, { timeout: timeoutMs });
  const latestVersion = response?.data?.[0];
  if (!latestVersion) throw new Error('获取最新版本失败');
  return latestVersion;
};

const fetchChampionList = async ({ version, locale = 'zh_CN', timeoutMs = 15000 }) => {
  const response = await axios.get(`${DATA_DRAGON_BASE}/cdn/${version}/data/${locale}/champion.json`, {
    timeout: timeoutMs,
  });
  const data = response?.data?.data || {};
  return Object.values(data);
};

const transformChampion = ({ champion, version }) => {
  const baseImageUrl = `${DATA_DRAGON_BASE}/cdn/${version}/img/champion/`;
  const splashImageUrl = `${DATA_DRAGON_BASE}/cdn/img/champion/splash/`;
  const loadingImageUrl = `${DATA_DRAGON_BASE}/cdn/img/champion/loading/`;

  const aliases = Array.from(
    new Set(
      [
        champion.name,
        champion.title,
        champion.id, // 英文ID，如 Neeko
        champion.key, // 数字 key，如 518
      ]
        .map((v) => (v === undefined || v === null ? '' : String(v).trim()))
        .filter(Boolean)
    )
  );

  return {
    // 注意：沿用项目现有 collect 脚本映射（riotId 使用 champion.id；key 使用 champion.key）
    riotId: champion.id,
    key: champion.key,
    name: champion.name,
    title: champion.title,
    aliases,
    description: champion.blurb,
    images: {
      square: champion.image?.full ? `${baseImageUrl}${champion.image.full}` : '',
      loading: champion.id ? `${loadingImageUrl}${champion.id}_0.jpg` : '',
      splash: champion.id ? `${splashImageUrl}${champion.id}_0.jpg` : '',
      passive: '',
    },
    tags: champion.tags || [],
    stats: {
      difficulty: champion.info?.difficulty ?? 5,
    },
    version,
    isEnabled: true,
  };
};

/**
 * 同步英雄数据到 DB，并写入本地缓存
 * @returns {Promise<{ version: string, total: number, upserted: number, modified: number }>}
 */
async function syncChampionsToDB({
  locale = 'zh_CN',
  cacheFile = path.join(process.cwd(), 'data/cache/champions.json'),
  timeoutMs = 15000,
} = {}) {
  const version = await getLatestVersion(timeoutMs);
  const list = await fetchChampionList({ version, locale, timeoutMs });
  const normalized = list.map((c) => transformChampion({ champion: c, version })).filter(Boolean);

  if (normalized.length === 0) {
    return { version, total: 0, upserted: 0, modified: 0 };
  }

  const ops = normalized.map((c) => ({
    updateOne: {
      filter: { riotId: c.riotId },
      update: { $set: c },
      upsert: true,
    },
  }));

  const result = await Champion.bulkWrite(ops, { ordered: false });

  // 兼容历史错误数据：之前本地 JSON 导入可能把 key 写成中文、riotId 写成数字
  // Riot 的 champion.key 固定为数字字符串；不符合的直接禁用，避免列表重复与搜索异常
  await Champion.updateMany(
    {
      isEnabled: true,
      $or: [{ key: { $not: /^\d+$/ } }, { riotId: /^\d+$/ }],
    },
    { $set: { isEnabled: false } }
  );

  try {
    writeJsonAtomic(cacheFile, { version, champions: normalized });
  } catch {
    // 忽略本地缓存写入失败（例如只读文件系统）
  }

  return {
    version,
    total: normalized.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
  };
}

module.exports = {
  DATA_DRAGON_BASE,
  syncChampionsToDB,
};
