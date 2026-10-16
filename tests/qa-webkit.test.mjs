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
    for (const f of ['index.html', 'activities.html', 'quiet-power.html', 'toward-light.html', 'city.html', 'articles/batch6-welfare-overview.html', 'articles/batch5-harassment-three-laws.html']) {
      await page.goto(`${origin}${base}${f}`);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (o > 0) overflow.push(`${f} ${o}px`);
    }
    await page.goto(`${origin}${base}toward-light.html`);
    const t = await page.evaluate(() => { const s = [...document.querySelectorAll('.toward-entry')].map((e) => e.getBoundingClientRect()); return { n: s.length, firstBottom: Math.round(s[0].bottom), sameRow: Math.round(s[0].top) === Math.round(s[1].top) }; });
    check(`WebKit ${width}px 向光：第一個畫面就看到第一排索引，八個索引兩欄排列`, t.n === 8 && t.firstBottom <= 760 && t.sameRow, JSON.stringify(t));
    check(`WebKit ${width}px 首頁、活動頁、讀利、向光、城市福利與含表格文章無水平溢位，無 JS 錯誤`, overflow.length === 0 && errors.length === 0, [...overflow, ...errors].join('；'));
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${origin}${base}toward-light.html`);
  const bad = [];
  const boxes = () => page.$$eval('.toward-entry', (es) => es.map((e) => Math.round(e.getBoundingClientRect().left)));
  const cols = await boxes();
  for (const t of TOWARD_TOPICS) {
    await page.tap(`label[for="toward-toggle-${t.id}"]`);
    const s = await page.evaluate((id) => { const d = document.getElementById(id); return { open: getComputedStyle(d).display !== 'none', links: [...d.querySelectorAll('.toward-story-links a')].filter((a) => a.getBoundingClientRect().height >= 44).length }; }, `toward-${t.id}`);
    if (!s.open || s.links !== t.slugs.length) bad.push(`${t.id} ${JSON.stringify(s)}`);
  }
  if (JSON.stringify(await boxes()) !== JSON.stringify(cols)) bad.push('展開後入口欄位改變');
  const gallery = await page.locator('.toward-reading-card').count();
  const readingLayout = await page.locator('.toward-reading-card').evaluateAll(cards =>
    cards.slice(0, 3).map(c => ({ x: Math.round(c.getBoundingClientRect().left), y: Math.round(c.getBoundingClientRect().top), w: Math.round(c.getBoundingClientRect().width) }))
  );
  const cardLinks = await page.locator('.toward-reading-card a[href^="articles/"]').count();
  check('WebKit 向光：13 篇文章直接展示為可點擊卡片，手機 390px 每排兩張且不產生單卡溢出',
    gallery === 13 && cardLinks === 13 && readingLayout.length === 3 &&
    readingLayout[0].y === readingLayout[1].y && readingLayout[2].y > readingLayout[1].y &&
    readingLayout[0].x < readingLayout[1].x && readingLayout.every(c => c.w >= 120 && c.w <= 190),
    JSON.stringify({ gallery, cardLinks, readingLayout }));
  await page.tap('#toward-women-center a[href="articles/batch6-women-center-services.html"]');
  await page.waitForURL('**/articles/batch6-women-center-services.html');
  check('WebKit 390px 向光：八個索引都能點開（入口維持原欄位），文章連結齊全且高度 ≥ 44px；婦女中心課程第一篇可開啟', bad.length === 0, bad.join('；'));
  // 全站小日曆：新分頁首次進站第 2 秒看不到、第 3.5 秒浮現；點進活動頁；換到讀利、向光、文章仍直接顯示
  {
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const p = await c2.newPage();
    const st = () => p.evaluate(() => { const e = document.querySelector('.act-entry'); const s = getComputedStyle(e); const b = e.getBoundingClientRect(); const sw = document.querySelector('[data-switch-screen]').getBoundingClientRect(); return { t: Math.round(performance.now()), vis: s.visibility, op: parseFloat(s.opacity), h: Math.round(b.height), inView: b.bottom <= innerHeight && b.right <= innerWidth, clearOfSwitch: b.top >= sw.bottom }; });
    const at = (ms) => p.waitForFunction((x) => performance.now() >= x, ms, { polling: 50 });
    await p.goto(`${origin}${base}index.html`, { waitUntil: 'domcontentloaded' });
    await at(2000); const s2 = await st();
    await at(3500); const s35 = await st();
    await at(4500); const s45 = await st();
    const later = [];
    for (const f of ['quiet-power.html', 'toward-light.html', 'articles/batch6-welfare-overview.html']) {
      await p.goto(`${origin}${base}${f}`, { waitUntil: 'domcontentloaded' });
      const s = await st();
      if (s.t > 2000 || s.vis !== 'visible' || s.op !== 1) later.push(`${f} ${JSON.stringify(s)}`);
    }
    await p.tap('.act-entry');
    await p.waitForURL('**/activities.html');
    const n = await p.locator('.notice:not([hidden]) a.notice-link[target="_blank"][rel="noopener noreferrer"]').count();
    const portals = await p.locator('.act-item a[target="_blank"][rel="noopener noreferrer"]').count();
    check('WebKit 390px 全站小日曆：首次進站第 2 秒看不到、第 3.5 秒浮現並常駐（≥ 44px、在畫面內、不蓋住切換畫面）；換到讀利、向光、文章直接顯示；點進活動頁列出具體活動官方公告（另開新分頁＋noopener）與 12 個長期入口', s2.vis === 'hidden' && s35.vis === 'visible' && s45.op === 1 && s45.h >= 44 && s45.inView && s45.clearOfSwitch && later.length === 0 && n >= 4 && portals === 12, JSON.stringify({ s2, s35, s45, later, n, portals }));
    await c2.close();
  }
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
