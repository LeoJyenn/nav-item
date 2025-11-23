const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');

const router = express.Router();

function getShanghaiNowString() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = fmt.formatToParts(now).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const year = parts.year;
  const month = parts.month;
  const day = parts.day;
  const hour = parts.hour;
  const minute = parts.minute;
  const second = parts.second;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    let originalName = file.originalname || 'file';
    originalName = Buffer.from(originalName, 'latin1').toString('utf8');
    originalName = originalName.replace(/[\/\\]/g, '_');
    if (!originalName.trim()) originalName = 'file';

    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);

    let filename = originalName;
    let counter = 1;

    while (fs.existsSync(path.join(uploadDir, filename))) {
      filename = `${base}(${counter})${ext}`;
      counter++;
    }

    cb(null, filename);
  }
});

const fileUpload = multer({ storage });

router.post('/', fileUpload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filename = req.file.filename;
  const url = '/uploads/' + filename;
  const remark = req.body.remark || '';
  const createdAt = getShanghaiNowString();

  db.run(
    'INSERT INTO uploads (filename, url, remark, created_at) VALUES (?, ?, ?, ?)',
    [filename, url, remark, createdAt],
    function (err) {
      if (err) {
        console.error('保存上传记录失败:', err);
        return res.status(500).json({ error: 'DB error' });
      }
      res.json({
        id: this.lastID,
        filename,
        url,
        remark,
        created_at: createdAt
      });
    }
  );
});

router.get('/files', (req, res) => {
  db.all(
    'SELECT id, filename, url, remark, created_at FROM uploads ORDER BY created_at DESC',
    [],
    (err, rows) => {
      if (err) {
        console.error('读取上传记录失败:', err);
        return res.status(500).json({ error: 'DB error' });
      }
      res.json(rows);
    }
  );
});

router.delete('/:id', (req, res) => {
  const id = req.params.id;

  db.get('SELECT filename FROM uploads WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('查询上传记录失败:', err);
      return res.status(500).json({ error: 'DB error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }

    const filepath = path.join(__dirname, '../uploads', row.filename);

    fs.unlink(filepath, (fsErr) => {
      if (fsErr && fsErr.code !== 'ENOENT') {
        console.error('删除文件失败:', fsErr);
      }

      db.run('DELETE FROM uploads WHERE id = ?', [id], (delErr) => {
        if (delErr) {
          console.error('删除上传记录失败:', delErr);
          return res.status(500).json({ error: 'DB error' });
        }
        res.json({ success: true });
      });
    });
  });
});

module.exports = router;
