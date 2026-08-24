const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const config = require('../config');
const logger = require('../logger');

const JWT_SECRET = config.server.jwtSecret;

const BCRYPT_ROUNDS = 8;
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

function getClientIp(req) {
  let ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip;
}

function isLoginBlocked(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.start > LOGIN_WINDOW_MS) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function recordLoginFailure(ip) {
  const now = Date.now();
  let entry = loginAttempts.get(ip);
  if (!entry || now - entry.start > LOGIN_WINDOW_MS) {
    entry = { start: now, count: 0 };
    loginAttempts.set(ip, entry);
  }
  entry.count++;
}

function getShanghaiTime() {
  const date = new Date();
  // 获取上海时区时间
  const shanghaiTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Shanghai"}));
  
  // 格式化为 YYYY-MM-DD HH:mm:ss
  const year = shanghaiTime.getFullYear();
  const month = String(shanghaiTime.getMonth() + 1).padStart(2, '0');
  const day = String(shanghaiTime.getDate()).padStart(2, '0');
  const hours = String(shanghaiTime.getHours()).padStart(2, '0');
  const minutes = String(shanghaiTime.getMinutes()).padStart(2, '0');
  const seconds = String(shanghaiTime.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

router.post('/login', (req, res) => {
  const ip = getClientIp(req);
  if (isLoginBlocked(ip)) {
    logger.logSecurity('LOGIN_RATE_LIMITED', req, `username=${(req.body && req.body.username) || ''}`);
    return res.status(429).json({ error: '尝试次数过多，请15分钟后再试' });
  }
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username=?', [username], (err, user) => {
    if (err || !user) {
      recordLoginFailure(ip);
      logger.logSecurity('LOGIN_FAILED', req, `username=${username || ''} reason=user_not_found`);
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        loginAttempts.delete(ip);
        logger.logSecurity('LOGIN_SUCCESS', req, `username=${username}`);
        // 透明迁移：存量哈希轮数与目标不一致时（含从更高轮数下调），成功验证后用新轮数重写
        const roundsMatch = /\$2[aby]\$(\d+)\$/.exec(user.password);
        const currentRounds = roundsMatch ? parseInt(roundsMatch[1], 10) : BCRYPT_ROUNDS;
        if (currentRounds !== BCRYPT_ROUNDS) {
          bcrypt.hash(password, BCRYPT_ROUNDS, (hashErr, newHash) => {
            if (!hashErr) {
              db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
            }
          });
        }
        // 记录上次登录时间和IP
        const lastLoginTime = user.last_login_time;
        const lastLoginIp = user.last_login_ip;
        // 更新为本次登录（上海时间）
        const now = getShanghaiTime();
        const loginIp = getClientIp(req);
        db.run('UPDATE users SET last_login_time=?, last_login_ip=? WHERE id=?', [now, loginIp, user.id]);
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ token, lastLoginTime, lastLoginIp });
      } else {
        recordLoginFailure(ip);
        logger.logSecurity('LOGIN_FAILED', req, `username=${username || ''} reason=wrong_password`);
        res.status(401).json({ error: '用户名或密码错误' });
      }
    });
  });
});

module.exports = router; 