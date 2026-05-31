import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data.db');

let db;

/**
 * 初始化数据库连接，创建表结构
 */
export async function initDb() {
  const SQL = await initSqlJs();

  // 确保目录存在
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // 从文件加载或创建新数据库
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 创建照片表
  db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      vote_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建投票记录表（IP 去重）
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_id INTEGER NOT NULL,
      ip_address TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (photo_id) REFERENCES photos(id),
      UNIQUE(photo_id, ip_address)
    )
  `);

  saveDb();
  console.log('✅ 数据库初始化完成');
}

/**
 * 保存数据库到文件
 */
function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

/**
 * 将查询结果转为对象数组
 */
function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * 执行查询并返回对象数组
 */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * 执行单条查询
 */
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 执行写操作
 */
function execute(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

// ============ 业务 API ============

/**
 * 获取所有照片
 */
export function getAllPhotos(orderBy = 'created_at DESC') {
  const validOrders = {
    'votes': 'vote_count DESC',
    'newest': 'created_at DESC',
    'oldest': 'created_at ASC',
  };
  const order = validOrders[orderBy] || 'created_at DESC';
  return queryAll(`SELECT * FROM photos ORDER BY ${order}`);
}

/**
 * 根据 ID 获取照片
 */
export function getPhotoById(id) {
  return queryOne('SELECT * FROM photos WHERE id = ?', [id]);
}

/**
 * 添加新照片
 */
export function addPhoto(title, filename) {
  execute('INSERT INTO photos (title, filename) VALUES (?, ?)', [title, filename]);
  const result = queryOne('SELECT * FROM photos WHERE id = last_insert_rowid()');
  return result;
}

/**
 * 给照片投票
 * @returns {{ success: boolean, message: string, photo?: object }}
 */
export function votePhoto(photoId, ipAddress) {
  // 检查照片是否存在
  const photo = getPhotoById(photoId);
  if (!photo) {
    return { success: false, message: '照片不存在' };
  }

  // 检查是否已投票
  const existing = queryOne(
    'SELECT * FROM votes WHERE photo_id = ? AND ip_address = ?',
    [photoId, ipAddress]
  );
  if (existing) {
    return { success: false, message: '您已经为这张照片投过票了' };
  }

  // 记录投票并更新计数
  execute('INSERT INTO votes (photo_id, ip_address) VALUES (?, ?)', [photoId, ipAddress]);
  execute('UPDATE photos SET vote_count = vote_count + 1 WHERE id = ?', [photoId]);

  const updatedPhoto = getPhotoById(photoId);
  return { success: true, message: '投票成功！', photo: updatedPhoto };
}

/**
 * 检查 IP 是否已对某照片投票
 */
export function hasVoted(photoId, ipAddress) {
  const vote = queryOne(
    'SELECT * FROM votes WHERE photo_id = ? AND ip_address = ?',
    [photoId, ipAddress]
  );
  return !!vote;
}

/**
 * 获取排行榜
 */
export function getLeaderboard(limit = 10) {
  return queryAll(
    'SELECT id, title, filename, vote_count FROM photos ORDER BY vote_count DESC LIMIT ?',
    [limit]
  );
}

/**
 * 获取用户已投票的照片 ID 列表
 */
export function getUserVotes(ipAddress) {
  const votes = queryAll('SELECT photo_id FROM votes WHERE ip_address = ?', [ipAddress]);
  return votes.map(v => v.photo_id);
}
