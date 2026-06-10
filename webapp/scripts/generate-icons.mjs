/** Generate PNG icons from SVG source files for Questline PWA */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SVG_SOURCE = path.join(ICONS_DIR, 'icon-512.svg');

async function main() {
  const svgBuffer = fs.readFileSync(SVG_SOURCE);
  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { name, size } of sizes) {
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(ICONS_DIR, name));
    console.log(`✅ Generated ${name} (${size}x${size})`);
  }

  // Maskable icon with safe-zone padding (80% content area)
  const maskableSvg = fs.readFileSync(path.join(ICONS_DIR, 'icon-maskable.svg'));
  const paddedSize = 192;
  const contentSize = Math.round(paddedSize * 0.8);
  const offset = Math.round((paddedSize - contentSize) / 2);

  const maskablePng = await sharp(maskableSvg).resize(contentSize, contentSize).png().toBuffer();
  await sharp({
    create: { width: paddedSize, height: paddedSize, channels: 4, background: { r: 217, g: 84, b: 43, alpha: 1 } },
  })
    .composite([{ input: maskablePng, top: offset, left: offset }])
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable.png'));
  console.log(`✅ Generated icon-maskable.png (192x192 with safe-zone)`);
}

main().catch(console.error);
