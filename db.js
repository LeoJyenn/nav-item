const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const config = require('./config');

const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const db = new sqlite3.Database(path.join(dbDir, 'nav.db'));

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_menus_order ON menus("order")`);
  
  db.run(`CREATE TABLE IF NOT EXISTS sub_menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    FOREIGN KEY(parent_id) REFERENCES menus(id) ON DELETE CASCADE
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sub_menus_parent_id ON sub_menus(parent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sub_menus_order ON sub_menus("order")`);
  
  db.run(`CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_id INTEGER,
    sub_menu_id INTEGER,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    logo_url TEXT,
    custom_logo_path TEXT,
    desc TEXT,
    "order" INTEGER DEFAULT 0,
    FOREIGN KEY(menu_id) REFERENCES menus(id) ON DELETE CASCADE,
    FOREIGN KEY(sub_menu_id) REFERENCES sub_menus(id) ON DELETE CASCADE
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cards_menu_id ON cards(menu_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cards_sub_menu_id ON cards(sub_menu_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cards_order ON cards("order")`);
  
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  
  db.run(`CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position TEXT NOT NULL,
    img TEXT NOT NULL,
    url TEXT NOT NULL
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ads_position ON ads(position)`);
  
  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    logo TEXT
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_friends_title ON friends(title)`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  )`);
  
  db.run(`
  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const settingsStmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  settingsStmt.run('bg_url_pc', '');
  settingsStmt.run('bg_url_mobile', '');
  settingsStmt.run('bg_opacity', '1'); 
  settingsStmt.run('glass_opacity', '0.7');
  settingsStmt.run('custom_css', '/* 自定义样式 */');
  settingsStmt.run('font_color_mode', 'auto');
  settingsStmt.run('custom_code', '');
  settingsStmt.finalize();

  db.get('SELECT COUNT(*) as count FROM menus', (err, row) => {
    if (row && row.count === 0) {
      const defaultMenus = [
        ['Home', 1]
      ];
      const stmt = db.prepare('INSERT INTO menus (name, "order") VALUES (?, ?)');
      defaultMenus.forEach(([name, order]) => stmt.run(name, order));
      stmt.finalize(() => {
        insertDefaultSubMenusAndCards();
      });
    }
  });

  function insertDefaultSubMenusAndCards() {
    db.all('SELECT * FROM menus ORDER BY "order"', (err, menus) => {
      if (err) {
        console.error('获取菜单失败:', err);
        return;
      }
      
      if (menus && menus.length) {
        const menuMap = {};
        menus.forEach(m => { menuMap[m.name] = m.id; });
        
        const subMenus = [];
        
        const subMenuStmt = db.prepare('INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)');
        let subMenuInsertCount = 0;
        const subMenuMap = {};
        
        subMenus.forEach(subMenu => {
          if (menuMap[subMenu.parentMenu]) {
            subMenuStmt.run(menuMap[subMenu.parentMenu], subMenu.name, subMenu.order, function(err) {
              if (!err) {
                subMenuInsertCount++;
                subMenuMap[`${subMenu.parentMenu}_${subMenu.name}`] = this.lastID;
              }
            });
          }
        });
        
        subMenuStmt.finalize(() => {
          const cards = [
            { menu: 'Home', title: 'Baidu',   url: 'https://www.baidu.com',       logo_url: '', desc: '全球最大的中文搜索引擎'  },
            { menu: 'Home', title: 'Youtube', url: 'https://www.youtube.com',     logo_url: 'https://img.icons8.com/ios-filled/100/ff1d06/youtube-play.png', desc: '全球最大的视频社区'  },
            { menu: 'Home', title: 'Gmail',   url: 'https://mail.google.com',     logo_url: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', desc: ''  },
            { menu: 'Home', title: 'GitHub',  url: 'https://github.com',          logo_url: '', desc: '全球最大的代码托管平台'  },
            { menu: 'Home', title: 'ChatGPT', url: 'https://chat.openai.com',     logo_url: 'https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico', desc: '人工智能AI聊天机器人'  },
          ];
          
          const cardStmt = db.prepare('INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, desc) VALUES (?, ?, ?, ?, ?, ?)');
          let cardInsertCount = 0;
          
          cards.forEach(card => {
            if (card.subMenu) {
              let subMenuId = null;
              for (const [key, id] of Object.entries(subMenuMap)) {
                if (key.endsWith(`_${card.subMenu}`)) {
                  subMenuId = id;
                  break;
                }
              }
              
              if (subMenuId) {
                cardStmt.run(null, subMenuId, card.title, card.url, card.logo_url, card.desc, function(err) {
                  if (!err) {
                    cardInsertCount++;
                  }
                });
              }
            } else if (menuMap[card.menu]) {
              cardStmt.run(menuMap[card.menu], null, card.title, card.url, card.logo_url, card.desc, function(err) {
                if (!err) {
                  cardInsertCount++;
                }
              });
            }
          });
          
          cardStmt.finalize(() => {});
        });
      }
    });
  }

  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (row && row.count === 0) {
      const passwordHash = bcrypt.hashSync(config.admin.password, 10);
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [config.admin.username, passwordHash]);
    }
  });

  db.get('SELECT COUNT(*) as count FROM friends', (err, row) => {
    if (row && row.count === 0) {
      const defaultFriends = [
        ['Noodseek图床', 'https://www.nodeimage.com', 'https://www.nodeseek.com/static/image/favicon/favicon-32x32.png'],
        ['Font Awesome', 'https://fontawesome.com', 'https://fontawesome.com/favicon.ico']
      ];
      const stmt = db.prepare('INSERT INTO friends (title, url, logo) VALUES (?, ?, ?)');
      defaultFriends.forEach(([title, url, logo]) => stmt.run(title, url, logo));
      stmt.finalize();
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN last_login_time TEXT`, [], () => {});
  db.run(`ALTER TABLE users ADD COLUMN last_login_ip TEXT`, [], () => {});
});

module.exports = db;
