const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const archiver = require('archiver');
const unzipper = require('unzipper');
const sqlite3 = require('sqlite3').verbose();

const dataRoot = path.join(__dirname, '../data');
if (!fs.existsSync(dataRoot)) fs.mkdirSync(dataRoot, { recursive: true });

const dbDir = path.join(dataRoot, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const uploadsDir = path.join(dataRoot, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dbPath = path.join(dbDir, 'nav.db');

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
    const tempDir = path.join(__dirname, '../temp');
    const tempPath = path.join(tempDir, backupName);

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const output = fs.createWriteStream(tempPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.download(tempPath, backupName, () => {
        fs.unlink(tempPath, () => {});
      });
    });

    archive.on('error', err => { throw err; });

    archive.pipe(output);

    if (fs.existsSync(dbPath)) {
      const safeDbPath = path.join(tempDir, `nav_safe_${Date.now()}.db`);
      fs.copyFileSync(dbPath, safeDbPath);

      await new Promise((resolve, reject) => {
        const db = new sqlite3.Database(safeDbPath, err => {
          if (err) return reject(err);
          db.serialize(() => {
            db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (e, rows) => {
              if (e || !rows || rows.length === 0) {
                db.close(() => resolve());
                return;
              }
              db.run("DELETE FROM users", err2 => {
                db.close(() => {
                  if (err2) return reject(err2);
                  resolve();
                });
              });
            });
          });
        });
      });

      archive.file(safeDbPath, { name: 'database/nav.db' });
    }

    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, 'uploads');
    }

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

    const directory = await unzipper.Open.file(file.path);
    const entryPaths = directory.files.map(e => e.path.replace(/\\/g, '/'));

    const hasDatabase = entryPaths.some(p => p.startsWith('database/'));
    const hasUploads = entryPaths.some(p => p.startsWith('uploads/'));
    const hasNavDb = entryPaths.includes('database/nav.db');

    const missing = [];
    if (!hasDatabase) missing.push('database 目录');
    if (!hasUploads) missing.push('uploads 目录');
    if (hasDatabase && !hasNavDb) missing.push('database/nav.db');

    if (missing.length) {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ error: `恢复失败，缺少：${missing.join('、')}` });
    }

    const targetDbDir = dbDir;
    const targetUploadsDir = uploadsDir;
    const targetDbPath = dbPath;

    if (!fs.existsSync(targetDbDir)) fs.mkdirSync(targetDbDir, { recursive: true });
    if (!fs.existsSync(targetUploadsDir)) fs.mkdirSync(targetUploadsDir, { recursive: true });

    let existingUsers = null;
    let userColumns = null;

    if (fs.existsSync(targetDbPath)) {
      await new Promise(resolve => {
        const db = new sqlite3.Database(targetDbPath, err => {
          if (err) return resolve();
          db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (e, rows) => {
            if (!rows || !rows.length) return db.close(resolve);

            db.all("PRAGMA table_info(users)", (e2, cols) => {
              if (!cols || !cols.length) return db.close(resolve);

              userColumns = cols.map(c => c.name);
              const colList = userColumns.map(c => `"${c}"`).join(',');

              db.all(`SELECT ${colList} FROM users`, (e3, rows2) => {
                existingUsers = rows2 || [];
                db.close(resolve);
              });
            });
          });
        });
      });
    }

    extractRoot = path.join(tempRoot, `import_${Date.now()}`);
    fs.mkdirSync(extractRoot);

    await fs.createReadStream(file.path)
      .pipe(unzipper.Extract({ path: extractRoot }))
      .promise();

    fs.unlink(file.path, () => {});

    const extractedDbFile = path.join(extractRoot, 'database', 'nav.db');
    const extractedUploads = path.join(extractRoot, 'uploads');

    const stat = fs.statSync(extractedDbFile);
    if (!stat.size) {
      removeDirSync(extractRoot);
      return res.status(400).json({ error: '备份中的数据库文件为空' });
    }

    const header = Buffer.alloc(16);
    const fd = fs.openSync(extractedDbFile, 'r');
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);
    if (!header.toString('utf8').startsWith('SQLite format 3')) {
      removeDirSync(extractRoot);
      return res.status(400).json({ error: '备份数据库格式不正确' });
    }

    fs.copyFileSync(extractedDbFile, targetDbPath);
    fs.chmodSync(targetDbPath, 0o600);

    if (existingUsers && existingUsers.length && userColumns) {
      await new Promise(resolve => {
        const db = new sqlite3.Database(targetDbPath, err => {
          if (err) return resolve();

          const colList = userColumns.map(c => `"${c}"`).join(',');
          const placeholders = userColumns.map(() => '?').join(',');

          db.run("DELETE FROM users", () => {
            const stmt = db.prepare(`INSERT INTO users (${colList}) VALUES (${placeholders})`);
            for (const row of existingUsers) {
              const values = userColumns.map(c => row[c]);
              stmt.run(values);
            }
            stmt.finalize(() => db.close(resolve));
          });
        });
      });
    }

    clearDirSync(targetUploadsDir);
    copyDirSync(extractedUploads, targetUploadsDir);

    removeDirSync(extractRoot);
    res.json({ message: '恢复成功' });

  } catch (err) {
    console.error(err);
    if (extractRoot && fs.existsSync(extractRoot)) removeDirSync(extractRoot);
    res.status(500).json({ error: '恢复失败' });
  }
});

module.exports = router;
