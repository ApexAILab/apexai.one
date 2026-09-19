import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicDirectory = path.join(process.cwd(), "public");

function iconSvg(size: number, maskable = false) {
  const markSize = maskable ? 208 : 240;
  const x = (512 - markSize) / 2;
  const scale = markSize / 28;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="#f7f7f5"/>
      <g transform="translate(${x} ${x}) scale(${scale})" fill="#171716">
        <path fill-rule="evenodd" d="M8.8 1.5 18.1 25H0L8.8 1.5Zm0 13.1L5.2 25h7.2L8.8 14.6Z"/>
        <path d="M20 8.4 27.7 25H13.4L20 8.4Z" opacity=".48"/>
      </g>
    </svg>`;
}

await mkdir(publicDirectory, { recursive: true });
await Promise.all([
  sharp(Buffer.from(iconSvg(192))).png().toFile(path.join(publicDirectory, "icon-192.png")),
  sharp(Buffer.from(iconSvg(512))).png().toFile(path.join(publicDirectory, "icon-512.png")),
  sharp(Buffer.from(iconSvg(512, true))).png().toFile(path.join(publicDirectory, "icon-maskable-512.png")),
  sharp(Buffer.from(iconSvg(180))).png().toFile(path.join(publicDirectory, "apple-touch-icon.png")),
]);

console.log("Generated ApexAI application icons.");
