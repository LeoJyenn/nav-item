const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('./authMiddleware');

// GET /api/settings - 获取所有设置 (公开)
router.get('/', (req, res) => {
  db.all('SELECT * FROM settings', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const settings = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  });
});

// POST /api/settings - 更新设置 (需要认证)
router.post('/', auth, (req, res) => {
  const { bg_url_pc, bg_url_mobile, bg_opacity, custom_css } = req.body; 

  const settingsToUpdate = [
    { key: 'bg_url_pc', value: bg_url_pc },
    { key: 'bg_url_mobile', value: bg_url_mobile },
    { key: 'bg_opacity', value: bg_opacity },
    { key: 'custom_css', value: custom_css }
  ];

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    try {
      const stmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
      settingsToUpdate.forEach(setting => {
        let valueToSave = setting.value || '';
        if (setting.key === 'bg_opacity') {
            valueToSave = String(parseFloat(setting.value) || 0.15); 
        }
        stmt.run(valueToSave, setting.key);
      });
      stmt.finalize();
      
      db.run('COMMIT');
      res.json({ success: true, message: '设置已保存！' });
    } catch (err) {
      db.run('ROLLBACK');
      res.status(500).json({ success: false, error: err.message });
    }
  });
});

module.exports = router;