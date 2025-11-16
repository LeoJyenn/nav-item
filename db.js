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
    position TEXT NOT NULL, -- left/right
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
  
  const settingsStmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  settingsStmt.run('bg_url_pc', '');
  settingsStmt.run('bg_url_mobile', '');
  settingsStmt.run('bg_opacity', '0.15');
  settingsStmt.run('custom_css', '/* 自定义样式 */'); // 添加 custom_css 默认值
  settingsStmt.finalize();

  // (…… 后面所有插入默认数据的代码保持不变 ……)
  
  db.get('SELECT COUNT(*) as count FROM menus', (err, row) => {
    if (row && row.count === 0) {
      const defaultMenus = [
        ['Home', 1],
        ['Ai Stuff', 2],
        ['Cloud', 3],
        ['Software', 4],
        ['Tools', 5],
        ['Other', 6]
      ];
      const stmt = db.prepare('INSERT INTO menus (name, "order") VALUES (?, ?)');
      defaultMenus.forEach(([name, order]) => stmt.run(name, order));
      stmt.finalize(() => {
        console.log('菜单插入完成，开始插入默认子菜单和卡片...');
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
        console.log('找到菜单数量:', menus.length);
        menus.forEach(menu => {
          console.log(`菜单: ${menu.name} (ID: ${menu.id})`);
        });
        
        const menuMap = {};
        menus.forEach(m => { menuMap[m.name] = m.id; });
        console.log('菜单映射:', menuMap);
        
        const subMenus = [
          { parentMenu: 'Ai Stuff', name: 'AI chat', order: 1 },
          { parentMenu: 'Ai Stuff', name: 'AI tools', order: 2 },
          { parentMenu: 'Tools', name: 'Dev Tools', order: 1 },
          { parentMenu: 'Software', name: 'Mac', order: 1 },
          { parentMenu: 'Software', name: 'iOS', order: 2 },
          { parentMenu: 'Software', name: 'Android', order: 3 },
          { parentMenu: 'Software', name: 'Windows', order: 4 }
        ];
        
        const subMenuStmt = db.prepare('INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)');
        let subMenuInsertCount = 0;
        const subMenuMap = {};
        
        subMenus.forEach(subMenu => {
          if (menuMap[subMenu.parentMenu]) {
            subMenuStmt.run(menuMap[subMenu.parentMenu], subMenu.name, subMenu.order, function(err) {
              if (err) {
                console.error(`插入子菜单失败 [${subMenu.parentMenu}] ${subMenu.name}:`, err);
              } else {
                subMenuInsertCount++;
                subMenuMap[`${subMenu.parentMenu}_${subMenu.name}`] = this.lastID;
                console.log(`成功插入子菜单 [${subMenu.parentMenu}] ${subMenu.name} (ID: ${this.lastID})`);
              }
            });
          } else {
            console.warn(`未找到父菜单: ${subMenu.parentMenu}`);
          }
        });
        
        subMenuStmt.finalize(() => {
          console.log(`所有子菜单插入完成，总计: ${subMenuInsertCount} 个子菜单`);
          
          const cards = [
            // (…… 所有默认卡片数据 ……)
            { menu: 'Home', title: 'Baidu', url: 'https://www.baidu.com', logo_url: '', desc: '全球最大的中文搜索引擎'  },
            { menu: 'Home', title: 'Youtube', url: 'https://www.youtube.com', logo_url: 'https://img.icons8.com/ios-filled/100/ff1d06/youtube-play.png', desc: '全球最大的视频社区'  },
            { menu: 'Home', title: 'Gmail', url: 'https://mail.google.com', logo_url: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', desc: ''  },
            { menu: 'Home', title: 'GitHub', url: 'https://github.com', logo_url: '', desc: '全球最大的代码托管平台'  },
            { menu: 'Home', title: 'ip.sb', url: 'https://ip.sb', logo_url: '', desc: 'ip地址查询'  },
            { menu: 'Home', title: 'Cloudflare', url: 'https://dash.cloudflare.com', logo_url: '', desc: '全球最大的cdn服务商'  },
            { menu: 'Home', title: 'ChatGPT', url: 'https://chat.openai.com', logo_url: 'https://cdn.oaistatic.com/assets/favicon-eex17e9e.ico', desc: '人工智能AI聊天机器人'  },
            { menu: 'Home', title: 'Huggingface', url: 'https://huggingface.co', logo_url: '', desc: '全球最大的开源模型托管平台'  },
            { menu: 'Home', title: 'ITDOG - 在线ping', url: 'https://www.itdog.cn/tcping', logo_url: '', desc: '在线tcping'  },
            { menu: 'Home', title: 'Ping0', url: 'https://ping0.cc', logo_url: '', desc: 'ip地址查询'  },
            { menu: 'Home', title: '浏览器指纹', url: 'https://www.browserscan.net/zh', logo_url: '', desc: '浏览器指纹查询'  },
            { menu: 'Home', title: 'nezha面板', url: 'https://ssss.nyc.mn', logo_url: 'https://nezha.wiki/logo.png', desc: 'nezha面板'  },
            { menu: 'Home', title: 'Api测试', url: 'https://hoppscotch.io', logo_url: '', desc: '在线api测试工具'  },
            { menu: 'Home', title: '域名检查', url: 'https://who.cx', logo_url: '', desc: '域名可用性查询' },
            { menu: 'Home', title: '域名比价', url: 'https://www.whois.com', logo_url: '', desc: '域名价格比较' },
            { menu: 'Home', title: 'NodeSeek', url: 'https://www.nodeseek.com', logo_url: 'https://www.nodeseek.com/static/image/favicon/favicon-32x32.png', desc: '主机论坛' },
            { menu: 'Home', title: 'Linux do', url: 'https://linux.do', logo_url: 'https://linux.do/uploads/default/optimized/3X/9/d/9dd49731091ce8656e94433a26a3ef36062b3994_2_32x32.png', desc: '新的理想型社区' },
            { menu: 'Home', title: '在线音乐', url: 'https://music.eooce.com', logo_url: 'https://p3.music.126.net/tBTNafgjNnTL1KlZMt7lVA==/18885211718935735.jpg', desc: '在线音乐' },
            { menu: 'Home', title: '在线电影', url: 'https://libretv.eooce.com', logo_url: 'https://img.icons8.com/color/240/cinema---v1.png', desc: '在线电影'  },
            { menu: 'Home', title: '免费接码', url: 'https://www.smsonline.cloud/zh', logo_url: '', desc: '免费接收短信验证码' },
            { menu: 'Home', title: '订阅转换', url: 'https://sublink.eooce.com', logo_url: 'https://img.icons8.com/color/96/link--v1.png', desc: '最好用的订阅转换工具' },
            { menu: 'Home', title: 'webssh', url: 'https://ssh.eooce.com', logo_url: 'https://img.icons8.com/fluency/240/ssh.png', desc: '最好用的webssh终端管理工具' },
            { menu: 'Home', title: '文件快递柜', url: 'https://filebox.nnuu.nyc.mn', logo_url: 'https://img.icons8.com/nolan/256/document.png', desc: '文件输出分享' },
            { menu: 'Home', title: '真实地址生成', url: 'https://address.nnuu.nyc.mn', logo_url: 'https://static11.meiguodizhi.com/favicon.ico', desc: '基于当前ip生成真实的地址' },
            // (…… 其他卡片 ……)
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
                  if (err) console.error(`插入子菜单卡片失败 [${card.subMenu}] ${card.title}:`, err);
                  else cardInsertCount++;
                });
              } else {
                console.warn(`未找到子菜单: ${card.subMenu}`);
              }
            } else if (menuMap[card.menu]) {
              cardStmt.run(menuMap[card.menu], null, card.title, card.url, card.logo_url, card.desc, function(err) {
                if (err) console.error(`插入卡片失败 [${card.menu}] ${card.title}:`, err);
                else cardInsertCount++;
              });
            } else {
              console.warn(`未找到菜单: ${card.menu}`);
            }
          });
          
          cardStmt.finalize(() => {
            console.log(`所有卡片插入完成，总计: ${cardInsertCount} 张卡片`);
          });
        });
      } else {
        console.log('未找到任何菜单');
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