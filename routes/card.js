const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const { hasFullCardAccess } = require('./lockMiddleware');
const router = express.Router();

function buildFuzzyLikePattern(query) {
  if (!query) return '%';
  return '%' + query.split('').join('%') + '%';
}

// 匿名请求仅剥离 url 字段（标题/描述/图标路径保留），避免泄露内网面板地址
function sanitizeCards(rows) {
  return rows.map(card => {
    const { url, ...rest } = card;
    return rest;
  });
}

router.get('/search', (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.status(400).json({ error: '搜索词不能为空' });
  }

  const searchTerm = buildFuzzyLikePattern(query);

  const sql = `
    SELECT * FROM cards 
    WHERE title LIKE ? OR desc LIKE ? OR url LIKE ?
    ORDER BY "order"
  `;
  
  db.all(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    rows.forEach(card => {
      if (!card.custom_logo_path) {
        card.display_logo = card.logo_url || (card.url.replace(/\/+$/, '') + '/favicon.ico');
      } else {
        card.display_logo = '/uploads/' + card.custom_logo_path;
      }
    });
    hasFullCardAccess(req, (full) => {
      res.json(full ? rows : sanitizeCards(rows));
    });
  });
});

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
    if (err) return res.status(500).json({ error: err.message });
    rows.forEach(card => {
      if (!card.custom_logo_path) {
        card.display_logo = card.logo_url || (card.url.replace(/\/+$/, '') + '/favicon.ico');
      } else {
        card.display_logo = '/uploads/' + card.custom_logo_path;
      }
    });
    hasFullCardAccess(req, (full) => {
      res.json(full ? rows : sanitizeCards(rows));
    });
  });
});

router.post('/', auth, (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  db.run(
    'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [menu_id, sub_menu_id || null, title, url, logo_url, custom_logo_path, desc, order || 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

router.put('/:id', auth, (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  db.run(
    'UPDATE cards SET menu_id=?, sub_menu_id=?, title=?, url=?, logo_url=?, custom_logo_path=?, desc=?, "order"=? WHERE id=?', 
    [menu_id, sub_menu_id || null, title, url, logo_url, custom_logo_path, desc, order || 0, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changed: this.changes });
    }
  );
});

router.delete('/:id', auth, (req, res) => {
  db.run('DELETE FROM cards WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

module.exports = router;
