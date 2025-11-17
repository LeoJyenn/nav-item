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

// --- 这是修复后的 POST 路由 ---

// POST /api/settings - 更新设置 (需要认证)
router.post('/', auth, (req, res) => {
  
  // 1. 定义所有允许更新的设置键
  const allowedKeys = [
    'bg_url_pc',
    'bg_url_mobile',
    'bg_opacity',
    'custom_css',
    'glass_opacity' // 确保 'glass_opacity' 在这里
  ];

  // 2. 动态地从 req.body 中过滤出所有允许的键
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
      // ---
      // 关键修复：从 "UPDATE" 改为 "INSERT OR REPLACE"
      // 这将自动创建尚不存在的键 (如 glass_opacity)
      // ---
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      
      settingsToUpdate.forEach(setting => {
        let valueToSave = setting.value; // 默认使用传入的值

        // 3. 为特定的键设置默认值和类型
        if (setting.key === 'bg_opacity') {
            const numVal = parseFloat(setting.value);
            // 确保它是一个合法的数字，否则回退到默认值
            valueToSave = String(isNaN(numVal) ? 0.15 : numVal);
        }
        
        if (setting.key === 'glass_opacity') {
            const numVal = parseFloat(setting.value);
            // (重要) 确保即使 setting.value 是 0，它也会被保存
            // 检查是否为 NaN (例如，如果 setting.value 是空字符串或 null)
            valueToSave = String(isNaN(numVal) ? 0.7 : numVal);
        }
        
        // 如果值是 null, undefined, 或空字符串 (非透明度设置)，存为空字符串
        if (valueToSave === null || valueToSave === undefined) {
          valueToSave = '';
        }
        
        // 最终执行 "INSERT OR REPLACE"
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