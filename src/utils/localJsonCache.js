/**
 * 本地 JSON 缓存工具
 * - 用于「同步成功写入本地缓存，失败时从本地缓存回退读取」
 */

const fs = require('fs');
const path = require('path');

const ensureDir = (dir) => {
  if (!dir) return;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const readJsonIfExists = (filePath) => {
  try {
    if (!filePath) return null;
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readFirstJson = (filePaths) => {
  for (const p of filePaths || []) {
    const data = readJsonIfExists(p);
    if (data !== null) return data;
  }
  return null;
};

const writeJsonAtomic = (filePath, data) => {
  if (!filePath) return;
  const dir = path.dirname(filePath);
  ensureDir(dir);

  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
};

module.exports = {
  ensureDir,
  readJsonIfExists,
  readFirstJson,
  writeJsonAtomic,
};

