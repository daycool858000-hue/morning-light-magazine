#!/usr/bin/env node
// QA 測試版（dist-qa）的 WebKit 模擬 Safari 檢查：只測 QA 才有的新功能。不是在真正 iPhone 上執行。
// 需先執行 npm test（會建置 dist-qa）。
import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { TOWARD_TOPICS } from '../scripts/lib/toward-light-editorial.mjs';
const require = createRequire(import.meta.url);
const { webkit } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist-qa');
const base = JSON.parse(await readFile(path.join(ROOT, 'config/site.json'), 'utf8')).basePath;
const port = 4371;
const origin = `http://127.0.0.1:${port}`;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, origin);
  let rel = decodeURIComponent(u.pathname.slice(base.length)) || 'index.html';
  const file = path.resolve(DIST, rel);
  if (!u.pathname.startsWith(base) || !file.startsWith(DIST + path.sep) || !existsSync(file) || (await stat(file)).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(port, '127.0.0.1', r));
const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok }); console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); };
let browser;
try {
  if (!existsSync(path.join(DIST, 'quiet-power.html'))) throw new Error('找不到 dist-qa，請先執行 npm test');
  browser = await webkit.launch({ headless: true });
  for (const width of [320, 375, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${origin}${base}quiet-power.html`);
    await page.tap('.dir-jump a');
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({ hash: location.hash, header: Math.round(document.querySelector('.site-header').getBoundingClientRect().bottom), kicker: Math.round(document.querySelector('.needs-intro .kicker').getBoundingClientRect().top), title: Math.round(document.getElementById('needs-title').getBoundingClientRect().top) }));
    check(`WebKit ${width}px 讀利：點「從你想了解的事開始 ↓」跳到 START HERE，小標不被固定頁首遮住`, r.hash === '#needs-title' && r.kicker >= r.header && r.title < 760, JSON.stringify(r));
    const overflow = [];
    for (const f of ['quiet-power.html', 'toward-light.html', 'city.html', 'articles/batch6-welfare-overview.html', 'articles/batch5-harassment-three-laws.html']) {
      await page.goto(`${origin}${base}${f}`);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (o > 0) overflow.push(`${f} ${o}px`);
    }
    await page.goto(`${origin}${base}toward-light.html`);
    const t = await page.evaluate(() => { const s = [...document.querySelectorAll('.toward-topic summary')].map((e) => e.getBoundingClientRect()); return { n: s.length, firstBottom: Math.round(s[0].bottom), sameRow: Math.round(s[0].top) === Math.round(s[1].top) }; });
    check(`WebKit ${width}px 向光：第一個畫面就看到第一排索引，八個索引兩欄排列`, t.n === 8 && t.firstBottom <= 760 && t.sameRow, JSON.stringify(t));
    check(`WebKit ${width}px 讀利、向光、城市福利與含表格文章無水平溢位，無 JS 錯誤`, overflow.length === 0 && errors.length === 0, [...overflow, ...errors].join('；'));
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${origin}${base}toward-light.html`);
  const bad = [];
  for (const t of TOWARD_TOPICS) {
    await page.tap(`#toward-${t.id} summary`);
    const s = await page.evaluate((id) => { const d = document.getElementById(id); return { open: d.open, links: [...d.querySelectorAll('.toward-story-links a')].filter((a) => a.getBoundingClientRect().height >= 44).length }; }, `toward-${t.id}`);
    if (!s.open || s.links !== t.slugs.length) bad.push(`${t.id} ${JSON.stringify(s)}`);
  }
  await page.tap('#toward-women-center a[href="articles/batch6-women-center-services.html"]');
  await page.waitForURL('**/articles/batch6-women-center-services.html');
  check('WebKit 390px 向光：八個索引都能點開，文章連結齊全且高度 ≥ 44px；婦女中心課程第一篇可開啟', bad.length === 0, bad.join('；'));
  await page.goto(`${origin}${base}city.html`);
  const order = await page.evaluate(() => document.getElementById('benefits').getBoundingClientRect().top < document.getElementById('finder').getBoundingClientRect().top && document.querySelectorAll('#benefits .story').length === 6);
  check('WebKit 390px 城市與福利：「先了解有哪些福利」六篇在縣市選擇之前', order);
  await ctx.close();
} finally {
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
}
const failed = checks.filter((x) => !x.ok);
console.log(`WebKit QA 模擬測試：${checks.length} 項，通過 ${checks.length - failed.length}，失敗 ${failed.length}`);
if (failed.length) process.exit(1);
