const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const archiver = require('archiver');
const unzipper = require('unzipper');

const router = express.Router();

const PROJECT_ROOT = path.join(__dirname, '..');
const DB_DIR = path.join(PROJECT_ROOT, 'database');
const DB_FILE = path.join(DB_DIR, 'nav.db');
const UPLOADS_DIR = path.join(PROJECT_ROOT, 'uploads');
const TEMP_DIR = path.join(PROJECT_ROOT, 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const upload = multer({ dest: TEMP_DIR });

router.get('/export', async (req, res) => {
  const backupName = `backup_${Date.now()}.zip`;
  const tempZipPath = path.join(TEMP_DIR, backupName);

  try {
    const output = fs.createWriteStream(tempZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.download(tempZipPath, backupName, err => {
        try {
          if (fs.existsSync(tempZipPath)) {
            fs.unlinkSync(tempZipPath);
          }
        } catch (_) {}
        if (err) {
          console.error('下载备份文件出错:', err);
        }
      });
    });

    archive.on('error', err => {
      console.error('打包备份失败:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: '备份失败' });
      }
    });

    archive.pipe(output);

    if (fs.existsSync(DB_FILE)) {
      archive.file(DB_FILE, { name: 'database/nav.db' });
    }

    if (fs.existsSync(UPLOADS_DIR)) {
      archive.directory(UPLOADS_DIR, 'uploads');
    }

    await archive.finalize();
  } catch (err) {
    console.error('备份失败:', err);
    try {
      if (fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
      }
    } catch (_) {}
    if (!res.headersSent) {
      res.status(500).json({ error: '备份失败' });
    }
  }
});

router.post('/import', upload.any(), async (req, res) => {
  let extractRoot = null;
  let uploadedFilePath = null;

  try {
    const file = req.files && req.files[0];
    if (!file) {
      return res.status(400).json({ error: '未上传备份文件' });
    }

    uploadedFilePath = file.path;

    const ext = path.extname(file.originalname || '');
    if (ext.toLowerCase() !== '.zip') {
      fs.unlink(uploadedFilePath, () => {});
      return res.status(400).json({ error: '备份文件必须为 .zip 格式' });
    }

    extractRoot = path.join(TEMP_DIR, `import_${Date.now()}`);
    fs.mkdirSync(extractRoot, { recursive: true });

    await fs
      .createReadStream(uploadedFilePath)
      .pipe(unzipper.Extract({ path: extractRoot }))
      .promise();

    fs.unlink(uploadedFilePath, () => {});

    const dbInBackup = path.join(extractRoot, 'database', 'nav.db');
    if (!fs.existsSync(dbInBackup) || !fs.statSync(dbInBackup).isFile()) {
      return res.status(400).json({
        error: '备份文件结构不正确'
      });
    }

    const dbStats = fs.statSync(dbInBackup);
    if (!dbStats.size) {
      return res.status(400).json({
        error: '备份中的数据库文件为空或已损坏'
      });
    }

    const headerBuf = Buffer.alloc(16);
    const fd = fs.openSync(dbInBackup, 'r');
    fs.readSync(fd, headerBuf, 0, 16, 0);
    fs.closeSync(fd);
    const headerStr = headerBuf.toString('utf8');
    if (!headerStr.startsWith('SQLite format 3')) {
      return res.status(400).json({
        error: '备份中的数据库文件格式不正确'
      });
    }

    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.copyFileSync(dbInBackup, DB_FILE);

    const uploadsInBackup = path.join(extractRoot, 'uploads');
    if (fs.existsSync(uploadsInBackup) && fs.statSync(uploadsInBackup).isDirectory()) {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      } else {
        for (const name of fs.readdirSync(UPLOADS_DIR)) {
          const target = path.join(UPLOADS_DIR, name);
          try {
            fs.rmSync(target, { recursive: true, force: true });
          } catch (e) {
            console.warn('删除 uploads 下文件失败:', target, e);
          }
        }
      }
      fs.cpSync(uploadsInBackup, UPLOADS_DIR, { recursive: true });
    }

    try {
      if (extractRoot && fs.existsSync(extractRoot)) {
        fs.rmSync(extractRoot, { recursive: true, force: true });
      }
    } catch (cleanErr) {
      console.warn('清理解压目录失败:', cleanErr);
    }

    return res.json({ message: '恢复成功' });
  } catch (err) {
    console.error('恢复失败:', err);

    try {
      if (extractRoot && fs.existsSync(extractRoot)) {
        fs.rmSync(extractRoot, { recursive: true, force: true });
      }
    } catch (_) {}

    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlink(uploadedFilePath, () => {});
    }

    return res.status(500).json({ error: '恢复失败' });
  }
});

module.exports = router;
