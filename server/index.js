import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { initDb, getAllPhotos, getPhotoById, addPhoto, votePhoto, getLeaderboard, getUserVotes, addComment, getComments, getHotComments } from './db.js';

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

// 生产环境：提供前端构建文件
if (isProduction) {
  app.use(express.static(DIST_DIR));
  console.log('📦 生产模式：提供前端静态文件');
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

    // 通过 Socket.io 广播新照片
    io.emit('newPhoto', photo);

    res.json({ success: true, data: photo, message: '照片上传成功！' });
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
