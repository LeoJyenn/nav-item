const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../db');

// 生成上海时区时间字符串：YYYY-MM-DD HH:mm:ss
function getShanghaiNowString() {
  const now = new Date();const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const archiver = require('archiver');
const unzipper = require('unzipper');

// 上传临时目录
const upload = multer({ dest: path.join(__dirname, '../temp') });

/**
 * 导出备份（数据库 + uploads）
 */
router.get('/export', async (req, res) => {
  try {
    const backupName = `backup_${Date.now()}.zip`;
    const tempPath = path.join(__dirname, `../temp/${backupName}`);

    const output = fs.createWriteStream(tempPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.download(tempPath, backupName, () => {
        fs.unlinkSync(tempPath);
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

/**
 * 导入备份（恢复数据库 + uploads）
 */
router.post('/import', upload.any(), async (req, res) => {
  try {
    const file = req.files && req.files[0];
    if (!file) {
      return res.status(400).json({ error: '未上传备份文件' });
    }

    // 解压到项目根目录（会覆盖 database/nav.db 和 uploads）
    const extractPath = path.join(__dirname, '../');

    await fs
      .createReadStream(file.path)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();

    // 删除临时 zip
    fs.unlinkSync(file.path);

    res.json({ message: '恢复成功，请重启服务以应用新数据' });
  } catch (err) {
    console.error('恢复失败:', err);
    res.status(500).json({ error: '恢复失败' });
  }
});

module.exports = router;

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
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage });

router.post('/', upload.single('logo'), (req, res) => {
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

// 获取已上传图片列表
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

// 删除上传的图片 + 记录（无确认，由前端控制）
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
