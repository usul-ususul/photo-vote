# 🚀 部署到 Render（免费公开网站）

## ⚠️ 重要：数据持久化说明

网站数据（照片、投票）存储在 **Turso 云数据库**中（免费），不会因为 Render 部署而丢失。

每次 `git push` 重新部署后，照片和投票数据都会完整保留 ✅

---

## 第一步：创建 Turso 云数据库（免费）

Turso 是一个免费的云端 SQLite 数据库，数据永久保存。

### 1. 注册 Turso
访问 https://turso.tech ，用 GitHub 账号注册登录

### 2. 安装 Turso CLI
打开终端（PowerShell），运行：
```bash
npm install -g turso
```

### 3. 登录并创建数据库
```bash
turso auth login              # 在浏览器中确认登录
turso db create photo-vote    # 创建数据库（免费）
turso db show photo-vote      # 查看数据库 URL（如 libsql://photo-vote-xxx.turso.io）
turso db tokens create photo-vote  # 创建认证令牌（保存好，只显示一次！）
```

记下两个值：
- **数据库 URL**：`libsql://photo-vote-xxx.turso.io`
- **认证令牌**：一串很长的随机字符串

---

## 第二步：准备代码仓库

### 1. 安装 Git（如果没有）
从 https://git-scm.com/downloads 下载安装

### 2. 把项目推送到 GitHub

```bash
cd "D:/verba-vista-main/claude code/photo-vote"

# 初始化 Git 仓库（如果还没有）
git init
git add .
git commit -m "照片投票网站 - 云端数据库版"

# 在 GitHub 创建仓库后（https://github.com/new），推送代码：
git remote add origin https://github.com/你的用户名/photo-vote.git
git branch -M main
git push -u origin main
```

---

## 第三步：部署到 Render

### 1. 注册 Render
访问 https://render.com ，用 GitHub 账号注册登录

### 2. 创建 Web Service
1. 点击 **New +** → **Web Service**
2. 选择你的 `photo-vote` 仓库
3. 填写配置：

| 配置项 | 值 |
|--------|-----|
| Name | `photo-vote` |
| Runtime | **Node** |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Free** |

4. **重要！设置环境变量**（在创建页面下方找到 Environment Variables）：

| Key | Value |
|-----|-------|
| `TURSO_URL` | `libsql://photo-vote-xxx.turso.io`（你的数据库 URL） |
| `TURSO_AUTH_TOKEN` | 你的认证令牌 |

5. 点击 **Create Web Service**

### 3. 等待部署
等待 2-3 分钟，部署完成后你会得到一个网址：
`https://photo-vote-xxxx.onrender.com`

---

## 第四步：生成初始数据（可选）

部署完成后，在 Render 控制台：
1. 点击你的 Web Service
2. 点击 **Shell** 标签
3. 运行：`npm run seed`
4. 这样网站上就会有 6 张示例照片

---

## 第五步：分享给朋友 🎉

把你的 Render 网址发给朋友，他们就能：
- 📸 浏览你的照片
- ❤️ 为你喜欢的照片投票
- 🏆 查看实时排行榜

---

## ⚠️ 注意事项

**关于免费用休眠：**
- Render 免费版在 15 分钟无人访问后会休眠
- 下次有人访问时会自动唤醒（需要等待 30-60 秒）
- 使用 [cron-job.org](https://cron-job.org)（免费）每 10 分钟 ping 一次你的网站，就能保持一直在线

**关于数据：**
- 照片和投票数据存储在 **Turso 云数据库**，永久保存
- 每次部署代码不会丢失数据 ✅
- Turso 免费额度：9GB 存储，每月 10 亿行读取，足够存几千张照片

**关于 GitHub 仓库：**
- ⚠️ 不要将 `.env` 文件提交到 GitHub（已在 .gitignore 中）
- Render 上的环境变量是安全存储的

---

## 🏠 本地开发

```bash
npm install        # 安装依赖
npm run seed       # 生成示例数据（仅首次）
npm run dev        # 启动开发模式（localhost:3000）
npm run build      # 构建生产版本
npm start          # 启动生产模式（localhost:4000）
```

本地开发时不需要 Turso 账号——自动使用本地 SQLite 文件。
