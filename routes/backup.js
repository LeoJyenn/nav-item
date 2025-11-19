const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const archiver = require('archiver');
const unzipper = require('unzipper');

const upload = multer({ dest: path.join(__dirname, '../temp') });

router.get('/export', async (req, res) => {
  try {
    const backupName = `backup_${Date.now()}.zip`;
    const tempPath = path.join(__dirname, `../temp/${backupName}`);

    const output = fs.createWriteStream(tempPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.download(tempPath, backupName, () => {
        fs.unlink(tempPath, () => {});
      });
    });

    archive.on('error', err => {
      throw err;
    });

    archive.pipe(output);

    // 1) 数据库
    const dbPath = path.join(__dirname, '../database/nav.db');
    archive.file(dbPath, { name: 'database/nav.db' });

    // 2) uploads 目录（如果存在）
    const uploadsDir = path.join(__dirname, '../uploads');
    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, 'uploads');
    }

    await archive.finalize();
  } catch (err) {
    console.error('备份失败:', err);
    res.status(500).json({ error: '备份失败' });
  }
});

router.post('/import', upload.any(), async (req, res) => {
  try {
    const file = req.files && req.files[0];
    if (!file) {
      return res.status(400).json({ error: '未上传备份文件' });
    }

    const extractPath = path.join(__dirname, '../');

    await fs
      .createReadStream(file.path)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();

    fs.unlink(file.path, () => {});

    res.json({ message: '恢复成功' });
  } catch (err) {
    console.error('恢复失败:', err);
    res.status(500).json({ error: '恢复失败' });
  }
});

module.exports = router;
