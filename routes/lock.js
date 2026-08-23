const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const auth = require('./authMiddleware');
const { invalidateLockStateCache } = require('./lockMiddleware');
const config = require('../config');
const logger = require('../logger');

const JWT_SECRET = config.server.jwtSecret;
const UNLOCK_TOKEN_EXPIRES = '12h';

function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.value : null);
    });
  });
}

function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getClientIp(req) {
  let ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip;
}

const verifyAttempts = new Map();
const VERIFY_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_MAX_ATTEMPTS = 10;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = verifyAttempts.get(ip);
  if (!entry || now - entry.start > VERIFY_WINDOW_MS) {
    verifyAttempts.set(ip, { start: now, count: 0 });
    return false;
  }
  return entry.count >= VERIFY_MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const entry = verifyAttempts.get(ip);
  if (entry) entry.count++;
}

async function ensureLockDefaults() {
  const keys = ['lock_enabled', 'lock_password_hash', 'lock_idle_timeout', 'lock_token_version'];
  const values = {};
  for (const key of keys) {
    let val = await getSetting(key);
    if (val === null || val === undefined) {
      const defaults = {
        lock_enabled: '0',
        lock_password_hash: '',
        lock_idle_timeout: '300',
        lock_token_version: '1'
      };
      await setSetting(key, defaults[key]);
      val = defaults[key];
    }
    values[key] = val;
  }
  return values;
}

router.post('/verify', async (req, res) => {
  try {
    const cfg = await ensureLockDefaults();
    if (cfg.lock_enabled !== '1') {
      return res.json({ success: true, locked: false });
    }
    if (!cfg.lock_password_hash) {
      return res.json({ success: true, locked: false });
    }

    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      logger.logSecurity('LOCK_RATE_LIMITED', req);
      return res.status(429).json({ error: '尝试次数过多，请稍后再试' });
    }

    const password = req.body && req.body.password;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: '请输入密码' });
    }

    const ok = await bcrypt.compare(password, cfg.lock_password_hash).catch(() => false);
    if (!ok) {
      recordFailedAttempt(ip);
      logger.logSecurity('LOCK_UNLOCK_FAILED', req);
      return res.status(401).json({ error: '密码错误' });
    }

    verifyAttempts.delete(ip);
    logger.logSecurity('LOCK_UNLOCK_SUCCESS', req);

    const ver = parseInt(cfg.lock_token_version, 10) || 1;
    const token = jwt.sign({ type: 'unlock', ver }, JWT_SECRET, { expiresIn: UNLOCK_TOKEN_EXPIRES });
    res.json({ success: true, locked: true, token, idleTimeout: parseInt(cfg.lock_idle_timeout, 10) || 300 });
  } catch (err) {
    console.error('锁屏校验失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/status', async (req, res) => {
  try {
    const cfg = await ensureLockDefaults();
    let tokenValid = false;

    const unlockToken = req.headers['x-unlock-token'];
    if (unlockToken && typeof unlockToken === 'string') {
      try {
        const payload = jwt.verify(unlockToken, JWT_SECRET);
        const ver = parseInt(cfg.lock_token_version, 10) || 1;
        tokenValid = payload && payload.type === 'unlock' && payload.ver === ver;
      } catch (e) {
        tokenValid = false;
      }
    }

    res.json({
      locked: cfg.lock_enabled === '1' && !!cfg.lock_password_hash,
      hasPassword: !!cfg.lock_password_hash,
      tokenValid,
      idleTimeout: parseInt(cfg.lock_idle_timeout, 10) || 300
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/config', auth, async (req, res) => {
  try {
    const cfg = await ensureLockDefaults();
    const wasEnabled = cfg.lock_enabled === '1';
    let passwordChanged = false;
    const { enabled, currentPassword, newPassword, idleTimeout } = req.body || {};

    if (newPassword !== undefined && newPassword !== null && newPassword !== '') {
      if (typeof newPassword !== 'string' || newPassword.length < 4) {
        return res.status(400).json({ success: false, error: '密码至少 4 位' });
      }
      if (cfg.lock_password_hash) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, error: '修改密码需要先输入当前密码' });
        }
        const ok = await bcrypt.compare(currentPassword, cfg.lock_password_hash).catch(() => false);
        if (!ok) {
          return res.status(401).json({ success: false, error: '当前密码错误' });
        }
      }
      const hash = await bcrypt.hash(newPassword, 12);
      await setSetting('lock_password_hash', hash);
      passwordChanged = true;
    }

    if (enabled !== undefined) {
      const wantEnable = enabled === true || enabled === '1' || enabled === 1;
      if (wantEnable && !wasEnabled && !passwordChanged) {
        // 开启动作本身也使所有设备的旧解锁令牌立即失效，所见即所得
        const ver = (parseInt(cfg.lock_token_version, 10) || 1) + 1;
        await setSetting('lock_token_version', ver);
      }
      if (wantEnable) {
        const finalHash = await getSetting('lock_password_hash');
        if (!finalHash) {
          return res.status(400).json({ success: false, error: '请先设置锁屏密码再开启' });
        }
      }
      await setSetting('lock_enabled', wantEnable ? '1' : '0');
      if (!wantEnable && wasEnabled) {
        // 关闭锁屏时清除密码，回到全新安装状态
        const curHash = await getSetting('lock_password_hash');
        if (curHash) {
          await setSetting('lock_password_hash', '');
          const ver = (parseInt(cfg.lock_token_version, 10) || 1) + 1;
          await setSetting('lock_token_version', ver);
        }
      }
    }

    if (idleTimeout !== undefined) {
      let t = parseInt(idleTimeout, 10);
      if (isNaN(t)) t = 300;
      t = Math.max(10, Math.min(86400, t));
      await setSetting('lock_idle_timeout', t);
    }

    const updated = await ensureLockDefaults();
    invalidateLockStateCache();
    res.json({
      success: true,
      message: '锁屏设置已保存',
      lock_enabled: updated.lock_enabled,
      idleTimeout: parseInt(updated.lock_idle_timeout, 10) || 300,
      hasPassword: !!updated.lock_password_hash
    });
  } catch (err) {
    console.error('保存锁屏配置失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
