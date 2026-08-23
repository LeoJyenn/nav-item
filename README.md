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

### ARM 设备 / 低配设备裸机部署（详细版）

适用于 ARMv7 盒子（海纳思、N1、各种电视盒刷的 NAS 系统）或内存 < 1GB 的设备。
这类设备不建议 Docker 部署：官方镜像无 armv7 变体、前端构建工具 esbuild 不支持
armv7、原生模块在模拟器中编译极慢——裸机直跑是最优解。

> 以下命令基于 Debian/Ubuntu 系设备，其他发行版请自行替换包管理器。
> 示例假设所有操作以 root 执行；PC 端为 Windows 10/11（自带 tar 和 ssh）。

#### 步骤 1：安装 Node.js 20（armv7 二进制包）

Ubuntu 自带源的 Node 版本过老（v10），直接用官方二进制包：

```bash
# 国内设备优先用 npmmirror 镜像下载，失败自动回退官方源
cd /tmp
wget -q https://registry.npmmirror.com/-/binary/node/v20.18.1/node-v20.18.1-linux-armv7l.tar.xz -O node.tar.xz \
  || wget -q https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-armv7l.tar.xz -O node.tar.xz

mkdir -p /opt/node20
tar -xJf node.tar.xz -C /opt/node20 --strip-components=1
ln -sf /opt/node20/bin/node /usr/local/bin/node
ln -sf /opt/node20/bin/npm  /usr/local/bin/npm
ln -sf /opt/node20/bin/npx  /usr/local/bin/npx

# 验证
node -v   # 应输出 v20.18.1
npm -v    # 应输出 v10.x.x
```

#### 步骤 2：安装编译工具链

sqlite3 是原生模块，ARMv7 平台没有预编译包，必须在设备上现场编译：

```bash
apt update
apt install -y build-essential python3 git xz-utils curl ca-certificates

gcc --version   # 验证 gcc 已就绪
```

#### 步骤 3：获取代码

**方式 A：git clone（设备可正常访问 GitHub 时）**

```bash
git clone --depth 1 https://github.com/LeoJyenn/nav-item.git /opt/nav-item
```

**方式 B：PC 打包上传（国内网络推荐，实测更稳）**

在 PC 上进入项目目录执行：

```powershell
# Windows PowerShell：先构建最新前端（见步骤 5），再打包后端代码与前端产物
tar -czf navitem-deploy.tgz app.js config.js db.js logger.js package.json package-lock.json routes web/dist
scp navitem-deploy.tgz root@设备IP:/tmp/
```

设备上解压：

```bash
rm -rf /opt/nav-item
mkdir -p /opt/nav-item
tar -xzf /tmp/navitem-deploy.tgz -C /opt/nav-item
ls /opt/nav-item       # 应看到 app.js routes web 等文件
```

#### 步骤 4：安装后端依赖

```bash
cd /opt/nav-item
npm config set registry https://registry.npmmirror.com   # 国内加速
npm install --omit=dev
```

⚠️ **这一步可能卡住 10~20 分钟，属正常现象**——sqlite3 正在你的设备上
从 C++ 源码现场编译（ARMv7 没有预编译包）。可以用另一个终端观察进度：

```bash
ls /opt/nav-item/node_modules | wc -l          # 包数量持续增长说明在干活
ls /opt/nav-item/node_modules/sqlite3/build/Release/*.node   # 出现 .node 文件即编译完成
```

完成后验证：

```bash
node -e "require('sqlite3'); console.log('sqlite3 OK')"
node -e "require('bcryptjs').hashSync('x',12); console.log('bcryptjs OK')"
```

#### 步骤 5：前端构建与上传（永远在 PC 上完成！）

**不要在盒子上运行 `npm run build`**——esbuild 没有 armv7 版本，
且 Vite 构建需要约 500MB 内存，低配设备扛不住。

PC 上（PowerShell）：

```powershell
cd web
npm install        # 首次需要
npm run build      # 产物在 web/dist/
cd ..
tar -czf dist.tgz -C web dist
scp dist.tgz root@设备IP:/tmp/
```

盒子上解压：

```bash
mkdir -p /opt/nav-item/web && tar -xzf /tmp/dist.tgz -C /opt/nav-item/web
```

#### 步骤 6：创建 systemd 服务（开机自启 + 崩溃自动重启）

```bash
cat > /etc/systemd/system/nav-item.service <<'EOF'
[Unit]
Description=Nav-item navigation site
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/nav-item
ExecStart=/usr/local/bin/node app.js
Environment=PORT=3010
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now nav-item
```

端口说明：默认示例用 **3010**。如果你的 3000 端口已被占用
（例如 nginx-proxy-manager 容器会占用宿主机 3000），换任意空闲端口即可，
改 `Environment=PORT=` 一行。

#### 步骤 7：验证

```bash
systemctl is-active nav-item        # 应输出 active
ss -tlnp | grep 3010                # 应看到 node 进程监听
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3010     # 200
curl -s http://127.0.0.1:3010/api/menus                            # 返回 JSON
ls /opt/nav-item/data/jwt-secret.key   # 首次启动自动生成，无需 .env
```

浏览器访问 `http://设备IP:3010`，后台 `/admin`，默认账号 `admin / 123456`。

⚠️ **首次上线必做**：立即修改默认管理员密码，并在「外观设置」中开启锁屏。

#### 数据与备份

运行产生的全部数据都在一个目录里，备份即拷贝：

```
/opt/nav-item/data/
├── database/nav.db    # SQLite 数据库（菜单/卡片/设置/密码）
├── jwt-secret.key     # 自动生成的登录密钥
└── uploads/           # 上传的图标、视频背景等
```

#### 日常更新流程

| 场景 | 操作 |
|---|---|
| 只改了代码/样式 | PC 构建前端 → 上传覆盖 `web/dist` → `systemctl restart nav-item`（秒级完成） |
| 只改了后端 JS | 上传对应 `.js` 文件 → 重启服务 |
| 升级了依赖版本 | 才需要重新 `npm install`（可能触发再次编译） |

建议备份一份装好的依赖目录，重装系统时可跳过漫长编译：

```bash
cd /opt/nav-item && tar -czf /root/nav-node_modules-backup.tgz node_modules
```

##### 重装快速恢复（预编译依赖包）

ARMv7 的完整依赖已打包发布在仓库 Releases（标签 `prebuilt-armv7-node20`，
约 13MB）。重装设备时**可跳过步骤 2 工具链和步骤 4 漫长编译**：

```bash
# 前提：已按步骤 1 安装好 Node v20
# 1) 获取代码（方式 A 或 B）
# 2) 下载并解压预编译依赖
wget https://github.com/LeoJyenn/nav-item/releases/download/prebuilt-armv7-node20/nav-modules-armv7-node20.tgz
tar -xzf nav-modules-armv7-node20.tgz -C /opt/nav-item
# 3) 验证（无需任何 npm install）
node -e "require('/opt/nav-item/node_modules/sqlite3'); console.log('OK')"

# 之后按步骤 6 创建 systemd 服务即可启动
```

⚠️ 该包绑定 **Node v20**（ABI 115）。升级 Node 大版本后需删除
`node_modules` 按步骤 2/4 重新编译。

✅ 包内仅含第三方开源库与编译产物，**不含任何用户数据**——每次使用它安装
都是全新站点。如需迁移旧站数据，单独备份/恢复 `/opt/nav-item/data/` 目录即可。

##### 重装备份清单

| 内容 | 路径 | 说明 |
|---|---|---|
| 导航站全部数据 | `/opt/nav-item/data/` | 数据库、JWT 密钥、上传文件，一个目录全包含 |
| 服务定义 | `/etc/systemd/system/nav-item.service` | 丢失可按本文步骤 6 原样重建 |

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

**Q: ARM 设备上 `npm run build` 报错 esbuild 找不到？**
A: esbuild 官方不提供 armv7 版本，前端无法在盒子上构建。请在 PC 上执行 `npm run build` 后把 `web/dist` 上传到设备，详见「ARM 设备 / 低配设备裸机部署」步骤 5。

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
