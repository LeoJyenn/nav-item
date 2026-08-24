const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

const JWT_SECRET = config.server.jwtSecret;
const CACHE_TTL_MS = 3000;

let cache = { ts: 0, enabled: false, ver: 1 };

function loadLockState(callback) {
  const now = Date.now();
  if (now - cache.ts < CACHE_TTL_MS) {
    callback(null, cache);
    return;
  }
  db.all(
    "SELECT key, value FROM settings WHERE key IN ('lock_enabled','lock_password_hash','lock_token_version')",
    (err, rows) => {
      if (err) return callback(err);
      const map = {};
      (rows || []).forEach(r => { map[r.key] = r.value; });
      cache = {
        ts: now,
        enabled: map.lock_enabled === '1' && !!map.lock_password_hash,
        ver: parseInt(map.lock_token_version, 10) || 1
      };
      callback(null, cache);
    }
  );
}

function invalidateLockStateCache() {
  cache = { ts: 0, enabled: false, ver: 1 };
}

function unlockGuard(req, res, next) {
  loadLockState((err, state) => {
    if (err) return next();
    if (!state.enabled) return next();

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
        if (payload && payload.id !== undefined && payload.username) {
          req.user = payload;
          return next();
        }
      } catch (e) {
        // 不是管理员令牌，继续校验解锁令牌
      }
    }

    const unlockToken = req.headers['x-unlock-token'];
    if (unlockToken && typeof unlockToken === 'string') {
      try {
        const payload = jwt.verify(unlockToken, JWT_SECRET);
        if (payload && payload.type === 'unlock' && payload.ver === state.ver) {
          return next();
        }
      } catch (e) {
        // 无效或过期
      }
    }

    res.set('X-Lock-Screen', 'required');
    return res.status(401).json({ error: 'lock_required' });
  });
}

// 菜单结构/广告的 GET 请求在锁屏开启时也对匿名访客公开（仅名称与广告图）；
// 写操作和卡片数据仍需管理员令牌或解锁令牌
function publicGetGuard(req, res, next) {
  if (req.method === 'GET') return next();
  return unlockGuard(req, res, next);
}

// 判断请求是否可获取全量卡片数据：
// 锁屏未启用 → 全量；已启用时需有效管理员 JWT 或解锁令牌，匿名仅返回脱敏数据
function hasFullCardAccess(req, callback) {
  loadLockState((err, state) => {
    if (err || !state.enabled) return callback(true);
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(authHeader.slice(7), config.server.jwtSecret);
        if (payload && payload.id !== undefined && payload.username) return callback(true);
      } catch (e) {
        // 不是管理员令牌，继续校验解锁令牌
      }
    }
    const unlockToken = req.headers['x-unlock-token'];
    if (unlockToken && typeof unlockToken === 'string') {
      try {
        const payload = jwt.verify(unlockToken, config.server.jwtSecret);
        if (payload && payload.type === 'unlock' && payload.ver === state.ver) return callback(true);
      } catch (e) {
        // 无效或过期
      }
    }
    callback(false);
  });
}

module.exports = { unlockGuard, publicGetGuard, invalidateLockStateCache, hasFullCardAccess };
