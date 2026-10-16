#!/usr/bin/env node
// 攝影素材處理：依 content/photos.json 的 crops 裁切原始圖片，輸出多種寬度的 WebP 與 JPEG，
// 並移除所有 EXIF／GPS 等中繼資料。輸出位置：src/assets/photos/（另寫入 generated.json 供建置使用）。
// 用法：npm run images
// 需要開發用套件 sharp（npm install 會自動安裝；網站本身不載入任何外部套件）。

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINALS = path.resolve(ROOT, process.env.PHOTO_ORIGINALS || 'content/photos/originals');
const OUT = path.resolve(ROOT, process.env.PHOTO_OUT || 'src/assets/photos');
const WIDTHS = [480, 800, 1200, 1600, 2400];
const FALLBACK_WIDTH = 1200;

const { items } = JSON.parse(await readFile(path.join(ROOT, 'content/photos.json'), 'utf8'));
const originals = existsSync(ORIGINALS) ? await readdir(ORIGINALS) : [];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const generated = {};
const missing = [];
for (const item of items) {
  const file = originals.find((f) => f.replace(/\.(jpe?g|png|webp|avif)$/i, '') === item.id);
  if (!file) {
    missing.push(item);
    continue;
  }
  const src = path.join(ORIGINALS, file);
  const meta = await sharp(src).metadata();
  if (meta.exif || meta.iptc || meta.xmp) {
    console.warn(`⚠ ${file} 含有 EXIF／IPTC／XMP 中繼資料。輸出檔已自動移除；提交原始檔前請先清除（例如 exiftool -all= ${file}）。`);
  }
  generated[item.id] = {};
  for (const [cropName, crop] of Object.entries(item.crops)) {
    const [aw, ah] = crop.aspect.split(':').map(Number);
    const ratio = aw / ah;
    // maxWidth：限制裁切寬度（px），用來避開畫面邊緣不適合的內容；會降低原生解析度
    let cw = Math.min(meta.width, crop.maxWidth || Infinity);
    let ch = Math.round(cw / ratio);
    if (ch > meta.height) {
      ch = meta.height;
      cw = Math.round(ch * ratio);
    }
    const left = Math.round(Math.min(Math.max(crop.focusX * meta.width - cw / 2, 0), meta.width - cw));
    const top = Math.round(Math.min(Math.max(crop.focusY * meta.height - ch / 2, 0), meta.height - ch));
    // 不放大：只輸出不超過裁切後原生寬度的尺寸，並一定包含原生寬度本身
    const widths = WIDTHS.filter((w) => w < cw);
    widths.push(Math.min(cw, WIDTHS[WIDTHS.length - 1]));
    for (const w of widths) {
      const h = Math.round(w / ratio);
      await sharp(src)
        .rotate()
        .extract({ left, top, width: cw, height: ch })
        .resize(w, h)
        .webp({ quality: 78 })
        .toFile(path.join(OUT, `${item.id}-${cropName}-${w}.webp`));
    }
    const fw = Math.min(FALLBACK_WIDTH, cw);
    await sharp(src)
      .rotate()
      .extract({ left, top, width: cw, height: ch })
      .resize(fw, Math.round(fw / ratio))
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(path.join(OUT, `${item.id}-${cropName}-${fw}.jpg`));
    generated[item.id][cropName] = { aspect: crop.aspect, widths, fallback: fw, ratio };
    generated[item.id][cropName].nativeWidth = cw;
    if (cw < 1600 && ['wide', 'banner', 'cover', 'band'].includes(cropName)) console.warn(`⚠ ${item.id}（${cropName}）裁切後寬度只有 ${cw}px，高解析度大螢幕可能略顯柔焦（未放大處理）。`);
  }
  console.log(`✔ ${item.id}：${Object.keys(item.crops).join('、')}`);
}

await writeFile(path.join(OUT, 'generated.json'), JSON.stringify(generated, null, 2) + '\n');
if (missing.length) {
  console.log(`\n尚缺 ${missing.length} 張原始圖片（放在 ${path.relative(ROOT, ORIGINALS)}/<id>.jpg）：`);
  for (const m of missing) console.log(`- ${m.id}${m.required ? '' : '（選用）'}：${m.title}`);
}
