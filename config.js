require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SECRET_KEY_PATH = path.join(__dirname, 'data', 'jwt-secret.key');

function resolveJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) {
    return process.env.JWT_SECRET.trim();
  }

  try {
    const existing = fs.readFileSync(SECRET_KEY_PATH, 'utf8').trim();
    if (existing) return existing;
  } catch (e) {
    // 首次运行或文件缺失，走生成流程
  }

  const secret = crypto.randomBytes(48).toString('hex');
  try {
    fs.mkdirSync(path.dirname(SECRET_KEY_PATH), { recursive: true });
    fs.writeFileSync(SECRET_KEY_PATH, secret + '\n', { mode: 0o600 });
    console.log('[config] 已自动生成 JWT 密钥并保存至 data/jwt-secret.key');
  } catch (e) {
    console.warn('[config] 警告：无法持久化 JWT 密钥，本次运行使用临时密钥，重启后所有令牌将失效。原因:', e.message);
  }
  return secret;
}

module.exports = {
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || '123456'
  },
  server: {
    port: process.env.PORT || 3000,
    jwtSecret: resolveJwtSecret()
  }
};
