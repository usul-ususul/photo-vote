import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { initDb, getAllPhotos, getPhotoById, addPhoto, votePhoto, getLeaderboard, getUserVotes } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, 'uploads');
const DIST_DIR = join(__dirname, '..', 'dist');
const isProduction = existsSync(DIST_DIR);

// 确保上传目录存在
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer 配置
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = extname(file.originalname);
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
    if (allowed.test(extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件（jpg, jpeg, png, gif, webp, bmp, svg）'));
    }
  },
});

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
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

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
app.get('/api/photos', (req, res) => {
  try {
    const { sort } = req.query;
    const photos = getAllPhotos(sort);
    res.json({ success: true, data: photos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取单张照片
app.get('/api/photos/:id', (req, res) => {
  try {
    const photo = getPhotoById(Number(req.params.id));
    if (!photo) {
      return res.status(404).json({ success: false, message: '照片不存在' });
    }
    res.json({ success: true, data: photo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 上传照片
app.post('/api/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的照片' });
    }
    const title = req.body.title || '未命名照片';
    const photo = addPhoto(title, req.file.filename);

    // 通过 Socket.io 广播新照片
    io.emit('newPhoto', photo);

    res.json({ success: true, data: photo, message: '照片上传成功！' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 投票
app.post('/api/photos/:id/vote', (req, res) => {
  try {
    const photoId = Number(req.params.id);
    const ip = getClientIP(req);
    const result = votePhoto(photoId, ip);

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
    const leaderboard = getLeaderboard(10);
    io.emit('leaderboardUpdate', leaderboard);

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取排行榜
app.get('/api/leaderboard', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const leaderboard = getLeaderboard(limit);
    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取当前用户的投票记录
app.get('/api/my-votes', (req, res) => {
  try {
    const ip = getClientIP(req);
    const votedIds = getUserVotes(ip);
    res.json({ success: true, data: votedIds });
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
    console.log(`📸 照片上传目录: ${UPLOADS_DIR}`);
  });
}

start().catch(err => {
  console.error('❌ 服务器启动失败:', err);
  process.exit(1);
});
