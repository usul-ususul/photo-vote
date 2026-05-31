import { readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { initDb, addPhoto, getAllPhotos } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, 'uploads');

function cleanTitle(filename) {
  // 去掉扩展名
  let name = filename.replace(/\.[^.]+$/, '');

  // 格式1: 微信图片_YYYYMMDDHHmmss_xxx_xxx 或 Weixin Image_YYYYMMDDHHmmss_xxx_x
  // 提取日期时间戳 YYYYMMDDHHmmss
  const tsMatch = name.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (tsMatch) {
    const [, y, m, d, h, min] = tsMatch;
    return `${y}年${m}月${d}日 ${h}:${min}`;
  }

  // 格式2: YYYY-MM-DD_HH-MM-SS 或 YYYY-MM-DD_HH-MM
  const dateMatch = name.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, y, m, d, h, min] = dateMatch;
    return `${y}年${m}月${d}日 ${h}:${min}`;
  }

  // 格式3: 清理微信图片和 Weixin Image 前缀
  name = name.replace(/^(微信图片_|Weixin\s*Image_?)/i, '');
  // 去掉末尾的数字序列如 "_164_833" 或 "_684_6"
  name = name.replace(/[_\s]+\d+[_\s]+\d+$/, '');
  // 把下划线替换为空格
  name = name.replace(/_/g, ' ');

  if (name.length > 50) name = name.substring(0, 50);
  if (!name.trim()) name = filename.replace(/\.[^.]+$/, '');
  return name.trim() || '未命名照片';
}

async function importPhotos() {
  await initDb();

  // 获取数据库中已有的文件名
  const existing = getAllPhotos();
  const existingFilenames = new Set(existing.map(p => p.filename));

  // 读取 uploads 目录中的文件
  const files = readdirSync(UPLOADS_DIR);
  const imageFiles = files.filter(f => {
    const ext = extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext);
  });

  let imported = 0;
  for (const file of imageFiles) {
    if (existingFilenames.has(file)) {
      continue; // 已在数据库中
    }
    const title = cleanTitle(file);
    const photo = addPhoto(title, file);
    console.log(`  ✅ ${title} (${file})`);
    imported++;
  }

  if (imported === 0) {
    console.log('📸 没有新照片需要导入（所有照片已在数据库中）');
  } else {
    console.log(`\n🎉 成功导入 ${imported} 张新照片！`);
  }

  // 显示总数
  const all = getAllPhotos();
  console.log(`📊 数据库共有 ${all.length} 张照片`);
}

importPhotos().catch(err => {
  console.error('导入失败:', err);
  process.exit(1);
});
