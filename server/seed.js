import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDb, addPhoto, getAllPhotos } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, 'uploads');

/**
 * 生成一个简单的 SVG 占位图片
 * 使用渐变色 + emoji 作为占位符
 */
function generatePlaceholderSVG(emoji, bgColor1, bgColor2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor1}"/>
      <stop offset="100%" style="stop-color:${bgColor2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <text x="400" y="280" text-anchor="middle" font-size="120">${emoji}</text>
  <text x="400" y="380" text-anchor="middle" font-size="28" fill="rgba(255,255,255,0.8)" font-family="sans-serif">PhotoVote</text>
</svg>`;
}

/**
 * 种子数据配置
 */
const seedPhotos = [
  { emoji: '🌅', title: '美丽的日落', bg1: '#ff6b6b', bg2: '#feca57' },
  { emoji: '🏔️', title: '雪山风景', bg1: '#48dbfb', bg2: '#0abde3' },
  { emoji: '🌊', title: '海浪拍岸', bg1: '#0abde3', bg2: '#48dbfb' },
  { emoji: '🌸', title: '春日樱花', bg1: '#ff9ff3', bg2: '#f368e0' },
  { emoji: '🌃', title: '城市夜景', bg1: '#2d3436', bg2: '#636e72' },
  { emoji: '🐱', title: '可爱猫咪', bg1: '#fdcb6e', bg2: '#e17055' },
];

async function seed() {
  await initDb();

  // 检查是否已有数据
  const existing = getAllPhotos();
  if (existing.length > 0) {
    console.log(`📸 数据库已有 ${existing.length} 张照片，跳过种子数据`);
    return;
  }

  console.log('🌱 开始生成种子数据...');

  for (const item of seedPhotos) {
    const filename = `placeholder-${item.title.replace(/[^a-zA-Z一-龥]/g, '-')}.svg`;
    const filepath = join(UPLOADS_DIR, filename);

    // 生成 SVG 占位图片
    if (!existsSync(filepath)) {
      const svg = generatePlaceholderSVG(item.emoji, item.bg1, item.bg2);
      writeFileSync(filepath, svg, 'utf-8');
    }

    // 添加到数据库
    const photo = addPhoto(item.title, filename);
    console.log(`  ✅ 已添加: ${item.title}`);
  }

  console.log('🎉 种子数据生成完成！');
}

seed().catch(err => {
  console.error('种子数据生成失败:', err);
  process.exit(1);
});
