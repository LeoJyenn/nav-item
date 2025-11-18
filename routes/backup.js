const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('./authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); 

const TABLES_TO_BACKUP = ['menus', 'sub_menus', 'cards', 'ads', 'friends', 'settings'];

// 1. 导出 (GET /api/backup/export)
router.get('/export', auth, async (req, res) => {
  try {
    const backupData = {};
    await Promise.all(
      TABLES_TO_BACKUP.map(tableName => {
        return new Promise((resolve, reject) => {
          db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
            if (err) return reject(err);
            backupData[tableName] = rows;
            resolve();
          });
        });
      })
    );

    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const fileName = `nav-backup-${timestamp}.json`;
    const fileContents = JSON.stringify(backupData, null, 2);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileContents);
  } catch (err) {
    res.status(500).json({ success: false, error: '导出失败: ' + err.message });
  }
});

// 2. 导入 (POST /api/backup/import)
router.post('/import', auth, upload.single('backupFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: '没有上传备份文件' });
  }

  let backupData;
  try {
    backupData = JSON.parse(req.file.buffer.toString('utf8'));
  } catch (e) {
    return res.status(400).json({ success: false, error: '文件格式无效，不是一个合法的 JSON 文件' });
  }

  const tablesInBackup = Object.keys(backupData);
  const tablesToImport = tablesInBackup.filter(t => TABLES_TO_BACKUP.includes(t));
  
  if (tablesToImport.length === 0) {
     return res.status(400).json({ success: false, error: `备份文件不包含任何有效的数据表。` });
  }

  db.serialize(() => {
    db.run('PRAGMA foreign_keys = OFF');
    db.run('BEGIN TRANSACTION');
    
    try {
      tablesToImport.forEach(table => {
        db.run(`DELETE FROM ${table}`);
      });

      db.run(
        `DELETE FROM sqlite_sequence WHERE name IN (${tablesToImport
          .map(t => `'${t}'`)
          .join(', ')})`
      );

      for (const tableName of tablesToImport) {
        const rows = backupData[tableName];
        if (!rows || rows.length === 0) continue;

        const keys = Object.keys(rows[0]);
        const quotedKeys = keys.map(key => `"${key}"`); 
        const placeholders = keys.map(() => '?').join(', ');
        
        const stmt = db.prepare(
          `INSERT INTO ${tableName} (${quotedKeys.join(', ')}) VALUES (${placeholders})`
        );

        rows.forEach(row => {
          const values = keys.map(key => row[key]);
          stmt.run(values);
        });
        stmt.finalize();
      }

      db.run('COMMIT');
      res.json({ success: true, message: `数据导入成功！共 ${tablesToImport.length} 张表被恢复。` });
    } catch (err) {
      db.run('ROLLBACK');
      res.status(500).json({ success: false, error: '导入失败: ' + err.message });
    } finally {
      db.run('PRAGMA foreign_keys = ON');
    }
  });
});

module.exports = router;
