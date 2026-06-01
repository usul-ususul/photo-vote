import { initDb, addPhoto, getAllPhotos } from './db.js';

/**
 * 生成一个简单的 SVG 占位图片并转为 Base64 data URL
 */
function generatePlaceholderDataURL(emoji, bgColor1, bgColor2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
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
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
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
  const existing = await getAllPhotos();
  if (existing.length > 0) {
    console.log(`📸 数据库已有 ${existing.length} 张照片，跳过种子数据`);
    return;
  }

  console.log('🌱 开始生成种子数据...');

  for (const item of seedPhotos) {
    const filename = `placeholder-${item.title.replace(/[^a-zA-Z一-鿿]/g, '-')}.svg`;
    const imageData = generatePlaceholderDataURL(item.emoji, item.bg1, item.bg2);

    // 添加到数据库（Base64 格式）
    const photo = await addPhoto(item.title, filename, imageData);
    console.log(`  ✅ 已添加: ${item.title}`);
  }

  console.log('🎉 种子数据生成完成！');
}

seed().catch(err => {
  console.error('种子数据生成失败:', err);
  process.exit(1);
});
