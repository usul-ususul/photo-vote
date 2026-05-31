# 🚀 部署到 Render（免费公开网站）

## 第一步：准备代码仓库

### 1. 安装 Git（如果没有）
从 https://git-scm.com/downloads 下载安装

### 2. 把项目推送到 GitHub

```bash
cd "D:/verba-vista-main/claude code/photo-vote"

# 初始化 Git 仓库
git init
git add .
git commit -m "照片投票网站"

# 在 GitHub 创建仓库后（https://github.com/new），推送代码：
git remote add origin https://github.com/你的用户名/photo-vote.git
git branch -M main
git push -u origin main
```

---

## 第二步：部署到 Render

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

4. 点击 **Create Web Service**

### 3. 等待部署
等待 2-3 分钟，部署完成后你会得到一个网址：
`https://photo-vote-xxxx.onrender.com`

---

## 第三步：分享给朋友 🎉

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

**关于数据持久化：**
- Render 免费版的磁盘在服务休眠后数据通常保留
- 为安全起见，建议定期备份 `server/data.db` 文件
- 也可以使用 `npm run seed` 重新生成示例数据

**自定义域名：**
- 在 Render 控制台 → Settings → Custom Domain 可以绑定你自己的域名

---

## 🏠 本地开发

```bash
npm install        # 安装依赖
npm run seed       # 生成示例数据（仅首次）
npm run dev        # 启动开发模式（localhost:3000）
npm run build      # 构建生产版本
npm start          # 启动生产模式（localhost:4000）
```
