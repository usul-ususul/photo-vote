import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data.db');

function parseTitle(filename) {
  const name = filename.replace(/\.[^.]+$/, '');

  // 尝试从微信图片文件名中提取日期时间
  // 格式: 微信图片_20251130173005_164_833
  const match = name.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (match) {
    const [, y, m, d, h, min, s] = match;
    return `${y}年${m}月${d}日 ${h}:${min}`;
  }

  // 如果不是微信图片格式，清理文件名
  let cleaned = name.replace(/^微信图片_/, '').replace(/_/g, ' ').trim();
  if (cleaned.length > 50) cleaned = cleaned.substring(0, 50);
  return cleaned || '未命名照片';
}

async function fixTitles() {
  const SQL = await initSqlJs();
  const buffer = readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // 查询所有照片
  const result = db.exec('SELECT id, filename FROM photos');
  if (!result.length) {
    console.log('没有照片');
    return;
  }

  const { columns, values } = result[0];
  const idIdx = columns.indexOf('id');
  const filenameIdx = columns.indexOf('filename');

  let updated = 0;
  for (const row of values) {
    const id = row[idIdx];
    const filename = row[filenameIdx];
    const newTitle = parseTitle(filename);
    db.run('UPDATE photos SET title = ? WHERE id = ?', [newTitle, id]);
    console.log(`  📝 [${id}] ${filename} → "${newTitle}"`);
    updated++;
  }

  // 保存
  const data = db.export();
  writeFileSync(DB_PATH, Buffer.from(data));
  console.log(`\n✅ 已更新 ${updated} 张照片的标题`);
  db.close();
}

fixTitles().catch(err => {
  console.error('修复标题失败:', err);
  process.exit(1);
});
