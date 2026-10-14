#!/usr/bin/env node
// 本機預覽伺服器：只在本機（127.0.0.1）提供 dist/，不對外公開。
// 用法：npm run preview，然後以瀏覽器開啟顯示的網址。
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, process.argv[2] || 'dist');
const PORT = Number(process.env.PORT) || 4173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml' };

http
  .createServer(async (req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(DIST, rel);
    try {
      if (!file.startsWith(DIST) || !(await stat(file)).isFile()) throw new Error('not found');
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      res.end(await readFile(path.join(DIST, '404.html')));
    }
  })
  .listen(PORT, '127.0.0.1', () => console.log(`本機預覽：http://127.0.0.1:${PORT}/index.html（按 Ctrl+C 停止）`));
