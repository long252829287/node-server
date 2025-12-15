/**
 * 强化池定时同步任务
 * 默认不启用；设置 LOL_SYNC_ENABLED=true 后，每 72 小时同步一次（强化/英雄/装备）
 */

const mongoose = require('mongoose');
const { syncAugmentsToDB } = require('../services/augmentSyncService');
const { syncChampionsToDB } = require('../services/championSyncService');
const { syncStandardItemsToDB, syncHexItemsToDB } = require('../services/itemSyncService');

const HOURS_72_MS = 72 * 60 * 60 * 1000;

function startAugmentSyncScheduler() {
  const enabled =
    process.env.LOL_SYNC_ENABLED === 'true' ||
    process.env.AUGMENTS_SYNC_ENABLED === 'true' ||
    process.env.CHAMPIONS_SYNC_ENABLED === 'true' ||
    process.env.ITEMS_SYNC_ENABLED === 'true';

  if (!enabled) {
    return;
  }

  const mode = process.env.AUGMENTS_SYNC_MODE || 'hex_brawl';
  const sourceUrl = process.env.AUGMENTS_SOURCE_URL;
  const patchVersion = process.env.AUGMENTS_PATCH_VERSION || process.env.AUGMENTS_PATCH || 'latest';
  const deactivateOld = process.env.AUGMENTS_DEACTIVATE_OLD === 'true';
  const locale = process.env.LOL_LOCALE || 'zh_CN';

  let timer = null;
  let isRunning = false;

  const runOnce = async (reason) => {
    if (isRunning) return;
    isRunning = true;
    try {
      const startedAt = Date.now();
      const results = {};

      if (process.env.LOL_SYNC_ENABLED === 'true' || process.env.AUGMENTS_SYNC_ENABLED === 'true') {
        results.augments = await syncAugmentsToDB({
          mode,
          sourceUrl,
          patchVersion,
          deactivateOld,
          isActive: true,
        });
      }

      if (process.env.LOL_SYNC_ENABLED === 'true' || process.env.CHAMPIONS_SYNC_ENABLED === 'true') {
        results.champions = await syncChampionsToDB({ locale });
      }

      if (process.env.LOL_SYNC_ENABLED === 'true' || process.env.ITEMS_SYNC_ENABLED === 'true') {
        results.itemsStandard = await syncStandardItemsToDB({ locale });
        results.itemsHex = await syncHexItemsToDB({ version: patchVersion });
      }

      const costMs = Date.now() - startedAt;
      console.log(
        `✅ [lol-sync] ok (${reason}) cost=${costMs}ms ${JSON.stringify({
          mode,
          patchVersion,
          champions: results.champions?.total,
          itemsStandard: results.itemsStandard?.total,
          itemsHex: results.itemsHex?.total,
          augments: results.augments?.total,
        })}`
      );
    } catch (error) {
      console.error(`❌ [lol-sync] failed (${reason}):`, error.message);
    } finally {
      isRunning = false;
    }
  };

  const startInterval = () => {
    if (timer) return;

    // 启动后先跑一次，再按 72h 周期跑
    runOnce('startup').catch(() => {});
    timer = setInterval(() => {
      runOnce('interval').catch(() => {});
    }, HOURS_72_MS);
    timer.unref?.();

    console.log(`🕒 [lol-sync] scheduler started (every 72h) locale=${locale} mode=${mode}`);
  };

  if (mongoose.connection.readyState === 1) {
    startInterval();
  } else {
    mongoose.connection.once('connected', startInterval);
  }

  const cleanup = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
}

module.exports = { startAugmentSyncScheduler };
