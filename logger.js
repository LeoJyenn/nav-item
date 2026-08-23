const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const accessStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
const securityStream = fs.createWriteStream(path.join(logsDir, 'security.log'), { flags: 'a' });

function shanghaiTime() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date()).replace(/\//g, '-');
}

function getIp(req) {
  let ip = (req && (req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim())) ||
    (req && req.connection && req.connection.remoteAddress) || '';
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip;
}

function logSecurity(event, req, details) {
  const line = `[${shanghaiTime()}] ${event} IP=${getIp(req)}${details ? ' | ' + details : ''}\n`;
  securityStream.write(line);
}

const accessLogStream = {
  write: (line) => {
    accessStream.write(line);
    process.stdout.write(line);
  }
};

module.exports = { logSecurity, accessLogStream };
