const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const archiver = require('archiver');
const unzipper = require('unzipper');

const upload = multer({ dest: path.join(__dirname, '../temp') });

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src);
  for (const entry of entries) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

function removeDirSync(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const cur = path.join(dir, entry);
    const stat = fs.statSync(cur);
    if (stat.isDirectory()) removeDirSync(cur);
    else fs.unlinkSync(cur);
  }
  fs.rmdirSync(dir);
}

function clearDirSync(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const cur = path.join(dir, entry);
    const stat = fs.statSync(cur);
    if (stat.isDirectory()) removeDirSync(cur);
    else fs.unlinkSync(cur);
  }
}

router.get('/export', async (req, res) => {
  try {
    const backupName = `backup_${Date.now()}.zip`;
    const tempPath = path.join(__dirname, `../temp/${backupName}`);
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const output = fs.createWriteStream(tempPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.download(tempPath, backupName, () => fs.unlink(tempPath, () => {}));
    });

    archive.on('error', err => { throw err; });

    archive.pipe(output);

    const dbPath = path.join(__dirname, '../database/nav.db');
    if (fs.existsSync(dbPath)) archive.file(dbPath, { name: 'database/nav.db' });

    const uploadsDir = path.join(__dirname, '../uploads');
    if (fs.existsSync(uploadsDir)) archive.directory(uploadsDir, 'uploads');

    await archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '备份失败' });
  }
});

router.post('/import', upload.any(), async (req, res) => {
  let extractRoot = null;

  try {
    const file = req.files[0];

    const ext = path.extname(file.originalname);
    if (ext.toLowerCase() !== '.zip') {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ error: '备份文件必须为 .zip 格式' });
    }

    const tempRoot = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempRoot)) fs.mkdirSync(tempRoot, { recursive: true });

    extractRoot = path.join(tempRoot, `import_${Date.now()}`);
    fs.mkdirSync(extractRoot, { recursive: true });

    await fs.createReadStream(file.path)
      .pipe(unzipper.Extract({ path: extractRoot }))
      .promise();

    fs.unlink(file.path, () => {});

    const rootEntries = fs.readdirSync(extractRoot);
    const hasDatabaseRoot = rootEntries.includes('database');
    const hasUploadsRoot = rootEntries.includes('uploads');

    if (!hasDatabaseRoot && !hasUploadsRoot) {
      return res.status(400).json({
        error: '备份文件结构不正确'
      });
    }

    const missing = [];

    const dbDir = path.join(extractRoot, 'database');
    const uploadsDir = path.join(extractRoot, 'uploads');

    if (!fs.existsSync(dbDir)) {
      missing.push('database 目录');
    }
    if (!fs.existsSync(uploadsDir)) {
      missing.push('uploads 目录');
    }

    const dbFile = path.join(extractRoot, 'database', 'nav.db');
    const uploadsDb = path.join(extractRoot, 'uploads', 'nav.db');

    if (fs.existsSync(dbDir) && !fs.existsSync(dbFile)) {
      missing.push('database/nav.db');
    }
    if (fs.existsSync(uploadsDir) && !fs.existsSync(uploadsDb)) {
      missing.push('uploads/nav.db');
    }

    if (missing.length) {
      return res.status(400).json({
        error: `恢复失败，缺少：${missing.join('、')}`
      });
    }

    const stat = fs.statSync(dbFile);
    if (!stat.size) {
      return res.status(400).json({ error: '备份中的数据库文件为空' });
    }

    const header = Buffer.alloc(16);
    const fd = fs.openSync(dbFile, 'r');
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);
    if (!header.toString('utf8').startsWith('SQLite format 3')) {
      return res.status(400).json({ error: '备份数据库格式不正确' });
    }

    const targetDbDir = path.join(__dirname, '../database');
    if (!fs.existsSync(targetDbDir)) fs.mkdirSync(targetDbDir, { recursive: true });
    fs.copyFileSync(dbFile, path.join(targetDbDir, 'nav.db'));

    const targetUploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(targetUploadsDir)) fs.mkdirSync(targetUploadsDir, { recursive: true });

    clearDirSync(targetUploadsDir);
    copyDirSync(uploadsDir, targetUploadsDir);

    if (extractRoot && fs.existsSync(extractRoot)) removeDirSync(extractRoot);

    res.json({ message: '恢复成功' });
  } catch (err) {
    console.error(err);

    try {
      if (extractRoot && fs.existsSync(extractRoot)) removeDirSync(extractRoot);
    } catch {}

    res.status(500).json({ error: '恢复失败' });
  }
});

module.exports = router;
