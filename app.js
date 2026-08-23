const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');
const menuRoutes = require('./routes/menu');
const cardRoutes = require('./routes/card');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const adRoutes = require('./routes/ad');
const userRoutes = require('./routes/user');
const backupRoutes = require('./routes/backup');
const settingsRoutes = require('./routes/settings');
const lockRoutes = require('./routes/lock');
const authMiddleware = require('./routes/authMiddleware');
const { unlockGuard, publicGetGuard } = require('./routes/lockMiddleware');
const logger = require('./logger');
const compression = require('compression');
const app = express();

app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('combined', { stream: logger.accessLogStream }));
app.use(cors());
app.use(express.json());
app.use(compression());
app.use('/uploads', express.static(path.join(__dirname, 'data/uploads')));
app.use(express.static(path.join(__dirname, 'web/dist')));

app.use((req, res, next) => {
  if (
    req.method === 'GET' &&
    !req.path.startsWith('/api') &&
    !req.path.startsWith('/uploads') &&
    !fs.existsSync(path.join(__dirname, 'web/dist', req.path))
  ) {
    res.sendFile(path.join(__dirname, 'web/dist', 'index.html'));
  } else {
    next();
  }
});

app.use('/api/lock', lockRoutes);
app.use('/api/menus', publicGetGuard, menuRoutes);
app.use('/api/cards', unlockGuard, cardRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api', authRoutes);
app.use('/api/ads', publicGetGuard, adRoutes);
app.use('/api/users', userRoutes);
app.use('/api/backup', authMiddleware, backupRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件超过大小限制' });
  }
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`server is running at http://localhost:${PORT}`);
});
