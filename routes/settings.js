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
  const allowedKeys = [
    'bg_url_pc',
    'bg_url_mobile',
    'bg_opacity',
    'custom_css',
    'glass_opacity',
    'text_color_mode' // 在这里加上
  ];

  const settingsToUpdate = Object.keys(req.body)
    .filter(key => allowedKeys.includes(key))
    .map(key => ({
      key: key,
      value: req.body[key]
    }));

  if (settingsToUpdate.length === 0) {
    return res.status(400).json({ error: '没有提供有效的设置项。' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    try {
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

      settingsToUpdate.forEach(setting => {
        let valueToSave = setting.value;

        if (setting.key === 'bg_opacity') {
          const numVal = parseFloat(setting.value);
          valueToSave = String(isNaN(numVal) ? 0.15 : numVal);
        }

        if (setting.key === 'glass_opacity') {
          const numVal = parseFloat(setting.value);
          valueToSave = String(isNaN(numVal) ? 0.7 : numVal);
        }

        if (valueToSave === null || valueToSave === undefined) {
          valueToSave = '';
        }

        stmt.run(setting.key, valueToSave);
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
