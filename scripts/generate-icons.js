// 生成 PWA 图标的脚本
// 运行: node scripts/generate-icons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// SVG 图标路径
const svgPath = path.join(publicDir, 'icon.svg');

// 需要生成的图标尺寸
const iconSizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

async function generateIcons() {
  console.log('开始生成 PWA 图标...');

  // 读取 SVG 文件
  const svgBuffer = fs.readFileSync(svgPath);

  for (const { size, name } of iconSizes) {
    try {
      const outputPath = path.join(publicDir, name);
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toFile(outputPath);
      console.log(`✓ 生成 ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ 生成 ${name} 失败:`, error.message);
    }
  }

  console.log('图标生成完成！');
}

generateIcons().catch(console.error);

