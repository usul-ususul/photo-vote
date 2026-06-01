import { createClient } from '@libsql/client';

// Turso/SQLite 数据库连接
// 支持本地开发 (file:server/data.db) 和 Turso 云数据库 (libsql://...)
const DB_URL = process.env.TURSO_URL || 'file:server/data.db';
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

const client = createClient({
  url: DB_URL,
  authToken: DB_TOKEN,
});

/**
 * 初始化数据库表结构
 */
export async function initDb() {
  // 创建照片表（新增 image_data 列存储 Base64 图片）
  await client.execute(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      filename TEXT NOT NULL DEFAULT '',
      image_data TEXT NOT NULL DEFAULT '',
      vote_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建投票记录表（IP 去重）
  await client.execute(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_id INTEGER NOT NULL,
      ip_address TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (photo_id) REFERENCES photos(id),
      UNIQUE(photo_id, ip_address)
    )
  `);

  console.log('✅ 数据库初始化完成');
  console.log(`📡 数据库连接: ${DB_URL.startsWith('file:') ? '本地 SQLite' : 'Turso 云数据库'}`);
}

// ============ 业务 API ============

/**
 * 获取所有照片
 */
export async function getAllPhotos(orderBy = 'created_at DESC') {
  const validOrders = {
    'votes': 'vote_count DESC',
    'newest': 'created_at DESC',
    'oldest': 'created_at ASC',
  };
  const order = validOrders[orderBy] || 'created_at DESC';
  const result = await client.execute(`SELECT * FROM photos ORDER BY ${order}`);
  return result.rows;
}

/**
 * 根据 ID 获取照片
 */
export async function getPhotoById(id) {
  const result = await client.execute(
    'SELECT * FROM photos WHERE id = ?',
    [id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * 添加新照片
 * @param {string} title - 照片标题
 * @param {string} filename - 原始文件名（保留用于兼容）
 * @param {string} imageData - Base64 图片数据
 */
export async function addPhoto(title, filename, imageData) {
  const result = await client.execute(
    'INSERT INTO photos (title, filename, image_data) VALUES (?, ?, ?)',
    [title, filename, imageData]
  );
  // 获取刚插入的记录
  const photo = await client.execute(
    'SELECT * FROM photos WHERE id = last_insert_rowid()'
  );
  return photo.rows.length > 0 ? photo.rows[0] : null;
}

/**
 * 给照片投票
 * @returns {{ success: boolean, message: string, photo?: object }}
 */
export async function votePhoto(photoId, ipAddress) {
  // 检查照片是否存在
  const photo = await getPhotoById(photoId);
  if (!photo) {
    return { success: false, message: '照片不存在' };
  }

  // 检查是否已投票
  const existing = await client.execute(
    'SELECT * FROM votes WHERE photo_id = ? AND ip_address = ?',
    [photoId, ipAddress]
  );
  if (existing.rows.length > 0) {
    return { success: false, message: '您已经为这张照片投过票了' };
  }

  // 记录投票并更新计数
  await client.execute(
    'INSERT INTO votes (photo_id, ip_address) VALUES (?, ?)',
    [photoId, ipAddress]
  );
  await client.execute(
    'UPDATE photos SET vote_count = vote_count + 1 WHERE id = ?',
    [photoId]
  );

  const updatedPhoto = await getPhotoById(photoId);
  return { success: true, message: '投票成功！', photo: updatedPhoto };
}

/**
 * 获取排行榜
 */
export async function getLeaderboard(limit = 10) {
  const result = await client.execute(
    'SELECT id, title, filename, image_data, vote_count FROM photos ORDER BY vote_count DESC LIMIT ?',
    [limit]
  );
  return result.rows;
}

/**
 * 获取用户已投票的照片 ID 列表
 */
export async function getUserVotes(ipAddress) {
  const result = await client.execute(
    'SELECT photo_id FROM votes WHERE ip_address = ?',
    [ipAddress]
  );
  return result.rows.map(v => v.photo_id);
}
