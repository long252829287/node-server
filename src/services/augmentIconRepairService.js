/**
 * 海克斯强化 icon 修复服务（只做 update，不新增/不删除）
 * 目标：
 * - 将固定版本的 raw.communitydragon.org/{ver}/game/... 统一切换到 latest/game/...
 * - 对于 404 的图片，自动尝试可用的备选 URL（优先 latest/game，其次 plugins/rcp.../default）
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const Augment = require('../models/Augment');

const DEFAULT_LATEST_GAME_BASE = 'https://raw.communitydragon.org/latest/game/';
const DEFAULT_LATEST_PLUGINS_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/';

const coerceString = (value) => String(value ?? '').trim();

const normalizeNameKey = (value) =>
  coerceString(value)
    .replace(/\s+/g, '')
    .replace(/[·•・]/g, '')
    .toLowerCase();

const extractAssetsPath = (value) => {
  const raw = coerceString(value);
  if (!raw) return '';

  const m1 = raw.match(/\/game\/(assets\/.+)$/i);
  if (m1) return m1[1].replace(/^\/+/, '');

  const m2 = raw.match(/\/(assets\/.+)$/i);
  if (m2) return m2[1].replace(/^\/+/, '');

  return '';
};

const makeUrl = (base, assetsPath) => {
  const b = coerceString(base);
  const p = coerceString(assetsPath).replace(/^\/+/, '');
  if (!b || !p) return '';
  return `${b.replace(/\/+$/, '/')}${p}`;
};

const toggleCherryKiwiPath = (assetsPath) => {
  const raw = coerceString(assetsPath);
  if (!raw) return '';
  if (/^assets\/ux\/cherry\/augments\//i.test(raw)) return raw.replace(/^assets\/ux\/cherry\/augments\//i, 'assets/ux/kiwi/augments/');
  if (/^assets\/ux\/kiwi\/augments\//i.test(raw)) return raw.replace(/^assets\/ux\/kiwi\/augments\//i, 'assets/ux/cherry/augments/');
  return '';
};

const loadArenaIconIndex = (filePath) => {
  const resolved = filePath || path.join(__dirname, '../assets/json/lol/augment_r.json');
  const data = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const list = Array.isArray(data?.augments) ? data.augments : [];

  const byName = new Map();
  const byIconKey = new Map();

  for (const item of list) {
    const nameKey = normalizeNameKey(item?.name);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, item);

    const iconKey =
      coerceString(item?.iconLarge).match(/\/icons\/([^/]+?)_(?:large|small)\.png/i)?.[1]?.toLowerCase() ||
      coerceString(item?.iconSmall).match(/\/icons\/([^/]+?)_(?:large|small)\.png/i)?.[1]?.toLowerCase() ||
      '';
    if (iconKey && !byIconKey.has(iconKey)) byIconKey.set(iconKey, item);
  }

  return { total: list.length, byName, byIconKey };
};

const loadExtraIconIndex = (filePath) => {
  const resolved = coerceString(filePath);
  if (!resolved) return null;
  if (!fs.existsSync(resolved)) return null;

  const data = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const list = Array.isArray(data?.augments) ? data.augments : Array.isArray(data) ? data : [];

  const byName = new Map();
  for (const item of list) {
    const name = item?.nameTRA || item?.name;
    const nameKey = normalizeNameKey(name);
    if (!nameKey) continue;
    if (!byName.has(nameKey)) byName.set(nameKey, item);
  }

  return { total: list.length, byName };
};

const iconKeyFromAny = (value) => {
  const raw = coerceString(value);
  if (!raw) return '';
  const m = raw.match(/\/icons\/([^/]+?)_(?:large|small)\.png/i);
  return m ? coerceString(m[1]).toLowerCase() : '';
};

const httpStatusOk = (status) => status >= 200 && status < 300;

const checkUrl = async (url, { timeoutMs = 8000 } = {}) => {
  const target = coerceString(url);
  if (!target) return false;

  try {
    const head = await axios.head(target, {
      timeout: timeoutMs,
      validateStatus: () => true,
    });
    if (httpStatusOk(head.status)) return true;
  } catch {}

  try {
    const get = await axios.get(target, {
      timeout: timeoutMs,
      responseType: 'arraybuffer',
      headers: { Range: 'bytes=0-0' },
      validateStatus: () => true,
    });
    return httpStatusOk(get.status) || get.status === 206;
  } catch {
    return false;
  }
};

async function repairAugmentIcons({
  arenaFilePath = path.join(__dirname, '../assets/json/lol/augment_r.json'),
  extraIconFilePath = '',
  latestGameBase = DEFAULT_LATEST_GAME_BASE,
  latestPluginsBase = DEFAULT_LATEST_PLUGINS_BASE,
  onlyEnabled = true,
  force = false,
  validate = true,
  timeoutMs = 8000,
  concurrency = 8,
  dryRun = false,
} = {}) {
  const arena = loadArenaIconIndex(arenaFilePath);
  const extra = loadExtraIconIndex(extraIconFilePath);

  const query = onlyEnabled ? { isEnabled: true } : {};
  const docs = await Augment.find(query).select('_id augmentId name icon iconSmall iconLarge').lean();

  const tasks = docs.map((doc) => async () => {
    const nameKey = normalizeNameKey(doc?.name);
    const iconKey = iconKeyFromAny(doc?.icon) || iconKeyFromAny(doc?.iconLarge) || iconKeyFromAny(doc?.iconSmall);
    const arenaHit = (nameKey && arena.byName.get(nameKey)) || (iconKey && arena.byIconKey.get(iconKey)) || null;
    const extraHit = extra?.byName?.get(nameKey) || null;

    const extraSmallUrl = coerceString(extraHit?.augmentSmallIconPath);
    const extraSmallAssetsPath = extractAssetsPath(extraSmallUrl);
    const extraLargeAssetsPath = extraSmallAssetsPath.replace(/_small\.png$/i, '_large.png');

    const assetsPath =
      extraLargeAssetsPath ||
      extractAssetsPath(doc?.icon) ||
      extractAssetsPath(doc?.iconLarge) ||
      extractAssetsPath(doc?.iconSmall) ||
      extractAssetsPath(arenaHit?.iconLarge) ||
      extractAssetsPath(arenaHit?.iconSmall) ||
      '';

    if (!assetsPath) return { matched: Boolean(arenaHit), updated: false };

    const candidateLatestGame = makeUrl(latestGameBase, assetsPath);
    const candidateLatestPlugins = makeUrl(latestPluginsBase, assetsPath);
    const toggledAssetsPath = toggleCherryKiwiPath(assetsPath);
    const candidateLatestGameToggled = toggledAssetsPath ? makeUrl(latestGameBase, toggledAssetsPath) : '';
    const candidateLatestPluginsToggled = toggledAssetsPath ? makeUrl(latestPluginsBase, toggledAssetsPath) : '';

    const currentIcon = coerceString(doc?.icon);
    const shouldAttemptUpdate = force || !currentIcon || /raw\.communitydragon\.org\/\d+\./i.test(currentIcon);
    const shouldAttemptAnyUpdate = shouldAttemptUpdate || (extraSmallUrl && (!doc.iconSmall || !doc.iconLarge));
    if (!shouldAttemptAnyUpdate) return { matched: Boolean(arenaHit), updated: false };

    let selected = '';
    let resolvedIconSmall = '';
    let resolvedIconLarge = '';

    if (!validate) {
      selected = candidateLatestGame || candidateLatestGameToggled || currentIcon;
    } else {
      const candidates = [
        candidateLatestGame,
        candidateLatestGameToggled,
        candidateLatestPlugins,
        candidateLatestPluginsToggled,
        currentIcon,
      ]
        .map(coerceString)
        .filter(Boolean);
      for (const c of candidates) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await checkUrl(c, { timeoutMs });
        if (ok) {
          selected = c;
          break;
        }
      }
      if (!selected)
        selected = currentIcon || candidateLatestGame || candidateLatestGameToggled || candidateLatestPlugins || candidateLatestPluginsToggled;
    }

    selected = coerceString(selected);
    if (!selected && !extraSmallUrl) return { matched: Boolean(arenaHit), updated: false };

    if (extraSmallUrl) {
      resolvedIconSmall = extraSmallUrl;
      const candidateLargeFromExtra = makeUrl(latestGameBase, extraLargeAssetsPath);
      resolvedIconLarge = candidateLargeFromExtra;
      if (validate && candidateLargeFromExtra) {
        const ok = await checkUrl(candidateLargeFromExtra, { timeoutMs });
        if (!ok) resolvedIconLarge = '';
      }
    }

    const $set = {};
    if (shouldAttemptUpdate && selected && selected !== currentIcon) $set.icon = selected;
    if (resolvedIconSmall && (force || !coerceString(doc.iconSmall))) $set.iconSmall = resolvedIconSmall;
    if (resolvedIconLarge && (force || !coerceString(doc.iconLarge))) $set.iconLarge = resolvedIconLarge;

    if (Object.keys($set).length === 0) return { matched: Boolean(arenaHit), updated: false };

    if (dryRun) return { matched: Boolean(arenaHit), updated: true };

    await Augment.updateOne({ _id: doc._id }, { $set });
    return { matched: Boolean(arenaHit), updated: true };
  });

  let index = 0;
  let matched = 0;
  let updated = 0;

  const workers = Array.from({ length: Math.max(1, Number(concurrency) || 1) }, async () => {
    while (index < tasks.length) {
      const i = index;
      index += 1;
      const result = await tasks[i]();
      if (result?.matched) matched += 1;
      if (result?.updated) updated += 1;
    }
  });

  await Promise.all(workers);

  return {
    arenaTotal: arena.total,
    dbTotal: docs.length,
    matched,
    updated,
    dryRun: Boolean(dryRun),
    validate: Boolean(validate),
    extraTotal: extra?.total || 0,
  };
}

module.exports = {
  DEFAULT_LATEST_GAME_BASE,
  DEFAULT_LATEST_PLUGINS_BASE,
  extractAssetsPath,
  makeUrl,
  repairAugmentIcons,
};
