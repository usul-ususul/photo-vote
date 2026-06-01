import { readFileSync, readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { initDb, addPhoto, getAllPhotos } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, 'uploads');

function cleanTitle(filename) {
  // 去掉扩展名
  let name = filename.replace(/\.[^.]+$/, '');

  // 格式1: 微信图片_YYYYMMDDHHmmss_xxx_xxx 或 Weixin Image_YYYYMMDDHHmmss_xxx_x
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
  name = name.replace(/[_\s]+\d+[_\s]+\d+$/, '');
  name = name.replace(/_/g, ' ');

  if (name.length > 50) name = name.substring(0, 50);
  if (!name.trim()) name = filename.replace(/\.[^.]+$/, '');
  return name.trim() || '未命名照片';
}

/**
 * 将文件转为 Base64 data URL
 */
function fileToDataURL(filepath) {
  const ext = extname(filepath).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
  };
  const mime = mimeMap[ext] || 'image/jpeg';
  const buffer = readFileSync(filepath);
  const base64 = buffer.toString('base64');
  return `data:${mime};base64,${base64}`;
}

async function importPhotos() {
  await initDb();

  // 获取数据库中已有的文件名
  const existing = await getAllPhotos();
  const existingFilenames = new Set(existing.map(p => p.filename));

  // 读取 uploads 目录中的文件
  let imageFiles = [];
  try {
    const files = readdirSync(UPLOADS_DIR);
    imageFiles = files.filter(f => {
      const ext = extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext);
    });
  } catch {
    console.log('📁 uploads 目录不存在，跳过导入');
    return;
  }

  let imported = 0;
  for (const file of imageFiles) {
    if (existingFilenames.has(file)) {
      console.log(`  ⏭️ 跳过（已存在）: ${file}`);
      continue;
    }

    const title = cleanTitle(file);
    const filepath = join(UPLOADS_DIR, file);
    const imageData = fileToDataURL(filepath);

    console.log(`  📤 导入: ${title} (${file}) — ${(Buffer.byteLength(imageData) / 1024).toFixed(1)}KB`);
    await addPhoto(title, file, imageData);
    imported++;
  }

  if (imported === 0) {
    console.log('📸 没有新照片需要导入（所有照片已在数据库中）');
  } else {
    console.log(`\n🎉 成功导入 ${imported} 张新照片！`);
  }

  const all = await getAllPhotos();
  console.log(`📊 数据库共有 ${all.length} 张照片`);
}

importPhotos().catch(err => {
  console.error('导入失败:', err);
  process.exit(1);
});
