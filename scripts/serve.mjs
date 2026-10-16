#!/usr/bin/env node
// 本機預覽伺服器（不使用任何外部服務，不會把網站放到網路上）。
//
// 用法一（電腦自己看）：npm run preview
//   只在本機（127.0.0.1）提供 dist/，其他裝置連不到。
//
// 用法二（用 iPhone 看正式版）：npm run phone-preview
//   建置正式版後，只在「同一個 Wi-Fi」內提供 dist-production/，給網站擁有人用自己的 iPhone Safari 驗收。
//   - 網址含一段每次啟動都不同的隨機字串，同一個 Wi-Fi 的其他人無法猜到網址。
//   - 60 分鐘後自動停止，也可隨時按 Ctrl+C 停止。
//   - 不經過網際網路，也不建立公開測試網站；請只在家中或可信任的 Wi-Fi 使用。
import http from 'node:http';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const LAN = args.includes('--lan');
const DIST = path.join(ROOT, args.find((a) => !a.startsWith('--')) || 'dist');
const PORT = Number(process.env.PORT) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.txt': 'text/plain', '.xml': 'application/xml',
};
// 區網模式：網址前綴為隨機字串，避免同一網路的其他人誤入
const PREFIX = LAN ? `/${randomBytes(6).toString('hex')}` : '';
const LIFETIME_MIN = 60;

async function send404(res) {
  res.writeHead(404, { 'content-type': TYPES['.html'] });
  res.end(await readFile(path.join(DIST, '404.html')).catch(() => '404'));
}

const server = http.createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (PREFIX) {
      if (rel !== PREFIX && !rel.startsWith(PREFIX + '/')) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        return res.end('找不到頁面');
      }
      rel = rel.slice(PREFIX.length) || '/';
    }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(DIST, rel);
    // 只允許讀取 DIST 資料夾內的檔案（避免 ../ 讀到其他資料夾）
    if (!file.startsWith(DIST + path.sep) || !(await stat(file)).isFile()) return send404(res);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(file));
  } catch {
    return send404(res);
  }
});

server.listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1', () => {
  if (!LAN) {
    console.log(`本機預覽：http://127.0.0.1:${PORT}/index.html（按 Ctrl+C 停止）`);
    return;
  }
  const ips = Object.values(os.networkInterfaces()).flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address);
  console.log('\n請讓 iPhone 連上「和這台電腦相同的 Wi-Fi」，再用 Safari 輸入下列網址（擇一可開啟的即可）：\n');
  if (!ips.length) console.log('  （找不到這台電腦的區網 IP，請確認電腦已連上 Wi-Fi）');
  for (const ip of ips) console.log(`  http://${ip}:${PORT}${PREFIX}/index.html`);
  console.log(`\n這個網址只在本次啟動有效，${LIFETIME_MIN} 分鐘後自動停止；驗收完請按 Ctrl+C 停止。`);
  console.log('若電腦跳出「是否允許連入連線／防火牆」詢問，請只允許「私人網路」。\n');
  setTimeout(() => {
    console.log(`已到 ${LIFETIME_MIN} 分鐘，自動停止預覽。`);
    server.close();
    process.exit(0);
  }, LIFETIME_MIN * 60 * 1000).unref();
});
