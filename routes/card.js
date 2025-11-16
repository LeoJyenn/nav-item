const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// --- START: 新增一个路由用于全局搜索 ---
// GET /api/cards/search?q=...
router.get('/search', (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: '搜索词不能为空' });
  }

  const searchTerm = `%${query}%`;
  
  // 仅在卡片中搜索
  const sql = `
    SELECT * FROM cards 
    WHERE title LIKE ? OR desc LIKE ? OR url LIKE ?
    ORDER BY "order"
  `;
  
  db.all(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    
    rows.forEach(card => {
      if (!card.custom_logo_path) {
        card.display_logo = card.logo_url || (card.url.replace(/\/+$/, '') + '/favicon.ico');
      } else {
        card.display_logo = '/uploads/' + card.custom_logo_path;
      }
    });
    res.json(rows);
  });
});
// --- END: 新增路由 ---


// 获取指定菜单的卡片
router.get('/:menuId', (req, res) => {
  const { subMenuId } = req.query;
  let query, params;
  
  if (subMenuId) {
    query = 'SELECT * FROM cards WHERE sub_menu_id = ? ORDER BY "order"';
    params = [subMenuId];
  } else {
    query = 'SELECT * FROM cards WHERE menu_id = ? AND sub_menu_id IS NULL ORDER BY "order"';
    params = [req.params.menuId];
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    rows.forEach(card => {
      if (!card.custom_logo_path) {
        card.display_logo = card.logo_url || (card.url.replace(/\/+$/, '') + '/favicon.ico');
      } else {
        card.display_logo = '/uploads/' + card.custom_logo_path;
      }
    });
    res.json(rows);
  });
});

// 新增、修改、删除卡片需认证
router.post('/', auth, (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  db.run('INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [menu_id, sub_menu_id || null, title, url, logo_url, custom_logo_path, desc, order || 0], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ id: this.lastID });
  });
});

router.put('/:id', auth, (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  db.run('UPDATE cards SET menu_id=?, sub_menu_id=?, title=?, url=?, logo_url=?, custom_logo_path=?, desc=?, "order"=? WHERE id=?', 
    [menu_id, sub_menu_id || null, title, url, logo_url, custom_logo_path, desc, order || 0, req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changed: this.changes });
  });
});

router.delete('/:id', auth, (req, res) => {
  db.run('DELETE FROM cards WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ deleted: this.changes });
  });
});

module.exports = router;