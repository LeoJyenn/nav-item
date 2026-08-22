const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('./authMiddleware');

const SENSITIVE_KEYS = ['lock_password_hash'];

router.get('/', (req, res) => {
  db.all('SELECT * FROM settings', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const settings = rows.reduce((acc, row) => {
      if (SENSITIVE_KEYS.includes(row.key)) return acc;
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  });
});

router.post('/', auth, (req, res) => {
  const allowedKeys = [
    'bg_url_pc',
    'bg_url_mobile',
    'bg_opacity',
    'glass_opacity',
    'text_color_mode',
    'custom_css',   
    'custom_code'   
  ];

  const settingsToUpdate = Object.keys(req.body)
    .filter(key => allowedKeys.includes(key))
    .map(key => ({
      key,
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
          valueToSave = String(isNaN(numVal) ? 1 : numVal);
        }

        if (setting.key === 'glass_opacity') {
          const numVal = parseFloat(setting.value);
          valueToSave = String(isNaN(numVal) ? 1 : numVal);
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
