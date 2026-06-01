import { createClient } from '@libsql/client';

// 使用与 db.js 相同的连接配置
const DB_URL = process.env.TURSO_URL || 'file:server/data.db';
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

const client = createClient({
  url: DB_URL,
  authToken: DB_TOKEN,
});

function parseTitle(filename) {
  const name = filename.replace(/\.[^.]+$/, '');

  // 尝试从微信图片文件名中提取日期时间
  const match = name.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (match) {
    const [, y, m, d, h, min] = match;
    return `${y}年${m}月${d}日 ${h}:${min}`;
  }

  // 如果不是微信图片格式，清理文件名
  let cleaned = name.replace(/^微信图片_/, '').replace(/_/g, ' ').trim();
  if (cleaned.length > 50) cleaned = cleaned.substring(0, 50);
  return cleaned || '未命名照片';
}

async function fixTitles() {
  // 查询所有照片
  const result = await client.execute('SELECT id, filename FROM photos');
  if (result.rows.length === 0) {
    console.log('没有照片');
    return;
  }

  let updated = 0;
  for (const row of result.rows) {
    const newTitle = parseTitle(row.filename);
    await client.execute(
      'UPDATE photos SET title = ? WHERE id = ?',
      [newTitle, row.id]
    );
    console.log(`  📝 [${row.id}] ${row.filename} → "${newTitle}"`);
    updated++;
  }

  console.log(`\n✅ 已更新 ${updated} 张照片的标题`);
}

fixTitles().catch(err => {
  console.error('修复标题失败:', err);
  process.exit(1);
});
