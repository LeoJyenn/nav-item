# Nav-item - 个人导航站

## 项目简介

一个现代化的个人导航网站项目，提供简洁美观的导航界面和强大的后台管理系统。在原项目基础上进行了大量功能扩展与安全加固：新增**锁屏密码保护**、**友情链接管理**、自动生成的 JWT 密钥与接口防爆破等能力，快速访问常用网站和工具。

## 🛠️ 技术栈

- Vue 3 + Node.js (Express) + SQLite 前后端分离架构
- Vite 构建，单端口部署（后端同时托管前端静态资源）

## ✨ 主要功能

### 前台功能
- 🏠 **首页导航**：美观的卡片式导航界面
- 🔍 **聚合搜索**：支持 Google、百度、Bing、Yandex、站内搜索
- 📱 **响应式设计**：完美适配桌面端和移动端
- 🎨 **现代化UI**：采用渐变背景和毛玻璃效果
- 📢 **广告位**：支持左右两侧广告位展示
- 🔒 **锁屏模式**：为整站加一把密码锁，隐藏你的卡片数据

### 后台管理功能
- 👤 **用户管理**：管理员登录、用户信息管理
- 📋 **栏目管理**：主菜单和子菜单的增删改查
- 🃏 **卡片管理**：导航卡片的增删改查
- 📢 **广告管理**：广告位的增删改查
- 🔗 **友情链接**：友链的增删改查与展示管理
- 📊 **数据统计**：登录时间、IP 等统计信息
- 🖼️ **文件管理**：支持上传下载文件与备注
- 🎨 **外观设置**：视频背景 / 静态背景、透明度、字体颜色模式、自定义代码
- 🔐 **锁屏设置**：开启/关闭锁屏、修改锁屏密码、空闲自动锁定时长
- 📦 **数据备份**：一键备份与恢复数据

### 动画与流畅度优化
- 🚀 **卡片入场动画**：仅在菜单切换和首屏加载时触发，避免频繁重播
- 🧠 **列表虚拟化**：卡片数量超过 60 时启用窗口渲染，降低 DOM 压力
- ⚡ **缓存与预取**：菜单/搜索 LRU 缓存 + 10 分钟 TTL，空闲时预取常用与相邻菜单
- ⏱️ **搜索体验**：站内搜索分帧更新，减轻输入阻塞
- 🖼️ **图标加载优化**：异步解码与固定尺寸占位，减少首屏抖动

## 🔐 安全机制

| 机制 | 说明 |
|---|---|
| **JWT 密钥自动生成** | 无需配置 `.env`，首次启动自动生成 96 位强随机密钥并保存在 `data/jwt-secret.key`，重启复用；仓库中不含任何可用密钥 |
| **锁屏密码保护** | 开启后卡片数据接口全部拒绝匿名访问，仅凭管理员令牌或解锁令牌可读取 |
| **登录防爆破** | 后台登录与锁屏解锁均按真实 IP 限制：失败 5 次 / 15 分钟后返回 429 并冷却，成功即清零 |
| **bcrypt 12 轮哈希** | 所有密码（管理员、锁屏）统一 12 轮存储；旧版 10 轮哈希在下次成功登录时自动透明升级 |
| **反向代理友好** | 已启用 `trust proxy`，通过 Nginx / NPM 等反代时防爆破按客户端真实 IP 计数，无法伪造绕过 |

> 锁屏开启时，访客仍可浏览菜单名称与广告位（保持界面完整），但所有卡片网址严格保密。

## 🏗️ 项目结构

```
nav-item/
├── app.js                 # 后端主入口
├── config.js              # 配置文件（含 JWT 密钥自动生成逻辑）
├── db.js                  # 数据库初始化
├── package.json           # 后端依赖
├── .env.example           # 环境变量示例（可复制为 .env，也可不建）
├── Dockerfile             # Docker 构建文件
├── docker-compose.yml     # Docker Compose 示例
├── data/                  # 运行时数据目录（请务必持久化挂载）
│   ├── database/nav.db    # SQLite 数据库
│   ├── jwt-secret.key     # 自动生成的 JWT 密钥（首次启动创建）
│   └── uploads/           # 上传文件目录
├── logs/                  # 运行日志（access.log 访问日志 / security.log 安全事件）
├── routes/                # 后端路由
│   ├── auth.js            # 管理员认证（含登录防爆破）
│   ├── authMiddleware.js  # 管理员鉴权中间件
│   ├── lock.js            # 锁屏验证 / 状态 / 配置
│   ├── lockMiddleware.js  # 锁屏数据保护中间件
│   ├── menu.js            # 菜单管理
│   ├── card.js            # 卡片管理
│   ├── ad.js              # 广告管理
│   ├── user.js            # 用户管理
│   ├── upload.js          # 文件上传
│   ├── backup.js          # 数据备份与恢复
│   └── settings.js        # 网站 / 锁屏全局设置
└── web/                   # 前端项目 (Vite + Vue 3)
    ├── vite.config.mjs    # Vite 配置
    └── src/
        ├── api.js         # API 封装
        ├── components/
        │   ├── MenuBar.vue      # 顶部菜单栏
        │   ├── CardGrid.vue     # 卡片网格
        │   └── LockScreen.vue   # 锁屏组件
        └── views/
            ├── Home.vue         # 首页（含锁屏调度逻辑）
            ├── Admin.vue        # 后台管理布局
            └── admin/
                ├── MenuManage.vue         # 栏目管理
                ├── CardManage.vue         # 卡片管理
                ├── AdManage.vue           # 广告管理
                ├── UserManage.vue         # 用户管理
                ├── FriendLinkManage.vue   # 友情链接管理
                ├── BackupManage.vue       # 数据备份
                ├── FileUploadManage.vue   # 文件管理
                └── SiteSettings.vue       # 外观 / 锁屏设置
```

## ⚙️ 环境变量及配置说明

所有环境变量均为**可选**。不创建 `.env` 文件也能安全运行（JWT 密钥会自动生成）。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3000` | 服务监听端口 |
| `ADMIN_USERNAME` | `admin` | 初始管理员用户名（仅首次建库时生效） |
| `ADMIN_PASSWORD` | `123456` | 初始管理员密码（仅首次建库时生效） |
| `JWT_SECRET` | 自动生成 | 自定义 JWT 密钥；一般留空即可，多实例共享数据目录时可显式指定 |

参考 `.env.example` 复制为 `.env` 使用。

### 数据持久化

SQLite 数据库、JWT 密钥文件、上传文件均位于 `data/` 目录。Docker 部署时必须挂载 `/app/data` 实现持久化——它同时承载了你的数据和密钥。

## 🚀 部署指南

### 源代码部署

```bash
# 1. 克隆项目
git clone https://github.com/LeoJyenn/nav-item
cd nav-item

# 2. 安装后端依赖
npm install

# 3. 构建前端
cd web && npm install && npm run build && cd ..

# 4. 启动服务
npm start
```

访问地址：
- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin
- 默认账号：`admin / 123456`

> ⚠️ 首次部署后请立即在后台修改默认密码，并在「外观设置」中按需开启锁屏。

### Docker 部署

#### 方式一：docker run 快速部署

```bash
docker run -d \
  --name nav-item \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  leojyenn/nav-item:latest
```

#### 方式二：docker-compose 部署

```yaml
version: '3'

services:
  nav-item:
    image: leojyenn/nav-item:latest
    container_name: nav-item
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=123456
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

镜像地址：
- `leojyenn/nav-item:latest`
- `ghcr.io/leojyenn/nav-item:latest`

### 反向代理（可选）

通过 Nginx / Nginx Proxy Manager 等反代时，请转发真实客户端 IP（`X-Forwarded-For`），服务端已启用 `trust proxy`，防爆破将按真实 IP 计数。

### 🏆 推荐生产部署架构（公网使用）

推荐「**Docker Compose + 反向代理 + HTTPS**」的组合，应用端口不直接暴露公网：

```
用户 → NPM/Nginx (80/443, HTTPS) → 容器内 3000 端口
```

#### 步骤一：编写 docker-compose.yml

```yaml
version: '3'

services:
  nav-item:
    image: leojyenn/nav-item:latest
    container_name: nav-item
    ports:
      - "127.0.0.1:3000:3000"   # 只绑定本机回环，外网无法直连
    volumes:
      - ./data:/app/data        # 数据库 + JWT密钥 + 上传文件 + 日志 全部持久化
    restart: unless-stopped
```

启动：`docker compose up -d`

> 关键点：端口映射写成 `127.0.0.1:3000:3000`，配合防火墙只放行 80/443，应用本身永不直接暴露。

#### 步骤二：配置反向代理与 HTTPS

以 Nginx Proxy Manager 为例：

1. 添加 Proxy Host：域名指向 `127.0.0.1`，端口 `3000`
2. SSL 标签页申请 Let's Encrypt 证书，开启 Force HTTPS
3. NPM 默认会带上 `X-Forwarded-For`，无需额外配置

纯 Nginx 配置参考：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 500m;   # 与备份导入上限一致
    }
}
```

#### 步骤三：首次上线检查清单

- [ ] 登录后台修改默认密码（勿用弱密码，建议 12 位以上混合字符）
- [ ] 在「外观设置」中开启锁屏并设置锁屏密码
- [ ] 确认 `data/` 目录已挂载持久化（含数据库、JWT 密钥、上传文件）
- [ ] 防火墙/安全组只开放 80 和 443

## 📋 日志说明

服务运行后会在 `logs/` 目录生成两类日志（Docker 部署时随 `data` 同级目录持久化）：

| 文件 | 内容 |
|---|---|
| `logs/access.log` | 全部 HTTP 访问记录（时间、IP、方法、路径、状态码、UA） |
| `logs/security.log` | 安全事件：登录成功/失败/限流、解锁成功/失败/限流、备份导出导入 |

安全日志示例：

```
[2026-08-23 15:11:43] LOGIN_FAILED IP=1.2.3.4 | username=admin reason=wrong_password
[2026-08-23 15:12:10] LOCK_RATE_LIMITED IP=5.6.7.8
[2026-08-23 15:15:02] BACKUP_EXPORT IP=1.2.3.4
```

可据此配置 fail2ban 或定期巡检异常来源 IP。

## ❓ 常见问题

**Q: 没有 `.env` 文件能运行吗？**
A: 能。JWT 密钥会在首次启动时自动生成到 `data/jwt-secret.key` 并永久复用，安全性不受影响。

**Q: 忘记管理员密码怎么办？**
A: 删除 `data/database/nav.db` 会重置整个站点数据（不推荐）。更稳妥的方式是用备份恢复，或手动替换 users 表中的密码哈希。

**Q: 锁屏密码和管理员密码是一回事吗？**
A: 不是。管理员密码用于后台 `/admin` 登录；锁屏密码用于前台解锁，两者独立设置，均可抵御暴力破解。

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 作者

**eooce** - [GitHub](https://github.com/eooce)

**LeoJyenn** - [GitHub](https://github.com/LeoJyenn)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

⭐ 如果这个项目对你有帮助，请给它一个星标！
