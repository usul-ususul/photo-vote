import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { initDb, getAllPhotos, getPhotoById, addPhoto, votePhoto, getLeaderboard, getUserVotes, addComment, getComments, getHotComments, verifyAdminPassword, deletePhoto, deleteComment, getStats, getPendingPhotos, approvePhoto, rejectPhoto, getMaintenanceMode, setMaintenanceMode } from './db.js';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const isProduction = existsSync(DIST_DIR);

// Express 应用
const app = express();
const httpServer = createServer(app);

// Socket.io 配置
const io = new Server(httpServer, {
  cors: {
    origin: isProduction ? true : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
  },
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增大 JSON body 限制以支持 Base64 图片

// 维护模式中间件：拦截非管理员的请求
app.use(async (req, res, next) => {
  // 管理员相关路由始终放行
  if (req.path.startsWith('/api/admin')) return next();
  // Socket.io 握手放行
  if (req.path.startsWith('/socket.io')) return next();
  // 检查是否携带有效的管理员 token（header 或 cookie）
  const adminToken = req.headers['x-admin-token'] || parseCookies(req).admin_token;
  if (adminToken && adminTokens.has(adminToken)) return next();

  try {
    const maintenance = await getMaintenanceMode();
    if (maintenance) {
      // API 请求返回 JSON
      if (req.path.startsWith('/api/')) {
        return res.status(503).json({
          success: false,
          message: '🔧 网站暂时维护中，请稍后再来',
          maintenance: true,
        });
      }
      // 普通页面请求返回 HTML
      return res.status(503).send(`<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>维护中 - PhotoVote</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}.card{background:rgb(255 255 255/0.05);border:1px solid rgb(255 255 255/0.1);border-radius:1.5rem;padding:3rem 2rem;max-width:420px;margin:1rem}.emoji{font-size:4rem;margin-bottom:1rem}h1{font-size:1.5rem;margin-bottom:0.5rem;background:linear-gradient(to right,#f472b6,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}p{color:#9ca3af;line-height:1.6}</style></head>
<body><div class="card"><div class="emoji">🔧</div><h1>PhotoVote 维护中</h1><p>网站正在临时维护，管理员正在调整设置，请稍后再来。</p></div></body></html>`);
    }
  } catch {
    // 出错时放行避免完全不可用
  }
  next();
});

// 生产环境：提供前端构建文件
if (isProduction) {
  app.use(express.static(DIST_DIR));
  console.log('📦 生产模式：提供前端静态文件');
}

// 解析 cookies
function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      cookies[pair.substring(0, idx).trim()] = pair.substring(idx + 1).trim();
    }
  });
  return cookies;
}

// 获取客户端 IP
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || req.socket?.remoteAddress || '127.0.0.1';
  // 规范化 IPv6 本地地址
  return ip === '::1' ? '127.0.0.1' : ip.replace(/^::ffff:/, '');
}

// ============ API 路由 ============

// 获取所有照片
app.get('/api/photos', async (req, res) => {
  try {
    const { sort } = req.query;
    const photos = await getAllPhotos(sort);
    res.json({ success: true, data: photos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取单张照片
app.get('/api/photos/:id', async (req, res) => {
  try {
    const photo = await getPhotoById(Number(req.params.id));
    if (!photo) {
      return res.status(404).json({ success: false, message: '照片不存在' });
    }
    res.json({ success: true, data: photo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 上传照片（JSON + Base64）
app.post('/api/upload', async (req, res) => {
  try {
    const { title, imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ success: false, message: '请选择要上传的照片' });
    }

    // 验证 Base64 数据格式
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: '图片数据格式不正确' });
    }

    // 检查图片大小（Base64 约 50MB 限制，相当于原始图片约 37MB）
    if (imageData.length > 50 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: '图片大小不能超过 10MB' });
    }

    const photoTitle = (title || '未命名照片').trim();
    // 从 Base64 data URL 中提取原始文件名信息
    const mimeMatch = imageData.match(/^data:(image\/\w+);/);
    const ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'jpg';
    const filename = `${Date.now()}.${ext}`;

    const photo = await addPhoto(photoTitle, filename, imageData);

    // 不立即广播——等管理员审核通过后才上线
    res.json({ success: true, data: photo, message: '照片已提交，等待管理员审核' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取照片图片文件（从 Base64 数据返回真实图片）
app.get('/api/photo/:id/file', async (req, res) => {
  try {
    const photo = await getPhotoById(Number(req.params.id));
    if (!photo || !photo.image_data) {
      return res.status(404).send('图片不存在');
    }

    const imageData = photo.image_data;

    // 解析 Base64 data URL: data:image/jpeg;base64,xxxxx
    const matches = imageData.match(/^data:(image\/[\w+]+);base64,(.+)$/);
    if (!matches) {
      return res.status(500).send('图片数据格式错误');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // 设置缓存头（7 天）
    res.set({
      'Content-Type': mimeType,
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=604800, immutable',
    });
    res.send(buffer);
  } catch (err) {
    res.status(500).send('读取图片失败');
  }
});

// 投票
app.post('/api/photos/:id/vote', async (req, res) => {
  try {
    const photoId = Number(req.params.id);
    const ip = getClientIP(req);
    const result = await votePhoto(photoId, ip);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // 通过 Socket.io 广播投票更新
    io.emit('voteUpdate', {
      photoId,
      voteCount: result.photo.vote_count,
      photo: result.photo,
    });

    // 同时广播排行榜更新
    const leaderboard = await getLeaderboard(10);
    io.emit('leaderboardUpdate', leaderboard);

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取排行榜
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const leaderboard = await getLeaderboard(limit);
    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取当前用户的投票记录
app.get('/api/my-votes', async (req, res) => {
  try {
    const ip = getClientIP(req);
    const votedIds = await getUserVotes(ip);
    res.json({ success: true, data: votedIds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ 评论路由 ============

// 获取某张照片的评论
app.get('/api/photos/:id/comments', async (req, res) => {
  try {
    const comments = await getComments(Number(req.params.id));
    res.json({ success: true, data: comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 发表评论
app.post('/api/photos/:id/comments', async (req, res) => {
  try {
    const photoId = Number(req.params.id);
    const { author, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: '请输入评论内容' });
    }

    const comment = await addComment(photoId, (author || '匿名').trim(), content.trim());

    // 通过 Socket.io 广播新评论
    io.emit('newComment', { photoId, comment });

    res.json({ success: true, data: comment, message: '评论成功！' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取全站热评
app.get('/api/comments/hot', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const comments = await getHotComments(limit);
    res.json({ success: true, data: comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 管理员会话 token 存储（内存中，服务器重启失效）
const adminTokens = new Set();

// 管理员权限验证中间件
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ success: false, message: '需要管理员权限' });
  }
  next();
}

// ============ 管理员 API 路由 ============

// 管理员登录
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: '请输入管理员密码' });
    }

    const valid = await verifyAdminPassword(password);
    if (!valid) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }

    // 生成会话 token
    const token = randomUUID();
    adminTokens.add(token);

    // 设置 cookie 以便维护模式绕过检查
    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 小时
    });

    console.log(`🔑 管理员已登录 (token: ${token.substring(0, 8)}...)`);
    res.json({ success: true, token, message: '登录成功' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 检查管理员登录状态
app.get('/api/admin/check', requireAdmin, (req, res) => {
  res.json({ success: true, message: '已登录' });
});

// 管理员登出
app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = req.headers['x-admin-token'];
  adminTokens.delete(token);
  res.json({ success: true, message: '已登出' });
});

// 删除照片（管理员）
app.delete('/api/admin/photos/:id', requireAdmin, async (req, res) => {
  try {
    const photoId = Number(req.params.id);
    const photo = await getPhotoById(photoId);
    if (!photo) {
      return res.status(404).json({ success: false, message: '照片不存在' });
    }

    await deletePhoto(photoId);

    // 通过 Socket.io 广播删除事件
    io.emit('photoDeleted', { photoId });
    // 更新排行榜
    const leaderboard = await getLeaderboard(10);
    io.emit('leaderboardUpdate', leaderboard);

    console.log(`🗑️ 管理员删除了照片: "${photo.title}" (ID: ${photoId})`);
    res.json({ success: true, message: '照片已删除' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除评论（管理员）
app.delete('/api/admin/comments/:id', requireAdmin, async (req, res) => {
  try {
    const commentId = Number(req.params.id);
    await deleteComment(commentId);

    // 通过 Socket.io 广播删除事件
    io.emit('commentDeleted', { commentId });

    console.log(`🗑️ 管理员删除了评论 (ID: ${commentId})`);
    res.json({ success: true, message: '评论已删除' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取/设置维护模式（管理员）
app.get('/api/admin/maintenance', requireAdmin, async (req, res) => {
  try {
    const enabled = await getMaintenanceMode();
    res.json({ success: true, data: { enabled } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/maintenance', requireAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;
    await setMaintenanceMode(!!enabled);
    const status = !!enabled;
    console.log(`🔧 维护模式: ${status ? '🟥 已开启' : '🟢 已关闭'}`);
    res.json({ success: true, data: { enabled: status }, message: status ? '网站已关闭，仅管理员可访问' : '网站已恢复开放' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取统计数据（管理员）
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取待审核照片列表（管理员）
app.get('/api/admin/photos/pending', requireAdmin, async (req, res) => {
  try {
    const photos = await getPendingPhotos();
    res.json({ success: true, data: photos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 审核通过照片（管理员）
app.post('/api/admin/photos/:id/approve', requireAdmin, async (req, res) => {
  try {
    const photoId = Number(req.params.id);
    const photo = await approvePhoto(photoId);
    if (!photo) {
      return res.status(404).json({ success: false, message: '照片不存在' });
    }

    // 审核通过后广播给所有用户
    io.emit('newPhoto', photo);

    console.log(`✅ 管理员审核通过: "${photo.title}" (ID: ${photoId})`);
    res.json({ success: true, data: photo, message: '照片已审核通过并上线' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 拒绝照片（管理员）
app.post('/api/admin/photos/:id/reject', requireAdmin, async (req, res) => {
  try {
    const photoId = Number(req.params.id);
    const photo = await getPhotoById(photoId);
    if (!photo) {
      return res.status(404).json({ success: false, message: '照片不存在' });
    }

    await rejectPhoto(photoId);

    console.log(`❌ 管理员拒绝: "${photo.title}" (ID: ${photoId})`);
    res.json({ success: true, message: '照片已拒绝并删除' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 一键拒绝全部待审照片（管理员）
app.post('/api/admin/photos/reject-all', requireAdmin, async (req, res) => {
  try {
    const pending = await getPendingPhotos();
    const count = pending.length;
    for (const p of pending) {
      await rejectPhoto(p.id);
    }
    console.log(`❌ 管理员一键拒绝了 ${count} 张待审照片`);
    res.json({ success: true, count, message: `已拒绝全部 ${count} 张待审照片` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ Socket.io 连接处理 ============
io.on('connection', (socket) => {
  console.log(`🔌 客户端已连接: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 客户端已断开: ${socket.id}`);
  });
});

// ============ SPA 回退路由 (生产模式) ============
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(join(DIST_DIR, 'index.html'));
  });
}

// ============ 启动服务器 ============
async function start() {
  await initDb();
  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 服务器已启动: http://localhost:${PORT}`);
    console.log(`💾 数据持久化: ${process.env.TURSO_URL ? 'Turso 云数据库' : '本地 SQLite'}`);
  });
}

start().catch(err => {
  console.error('❌ 服务器启动失败:', err);
  process.exit(1);
});
