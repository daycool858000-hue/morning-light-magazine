#!/usr/bin/env node
// 完整首發隔離版（dist-qa-all62-city-review，不公開）：62篇文章與主要目錄的閱讀版面、圖片、活動依臺灣日期隱藏。
// 用法：node tests/qa-full-launch-browser.test.mjs --browser=chromium|webkit（模擬 Safari，不是真正 iPhone）
// 需先執行 tests/qa-full-launch-city-services.test.mjs（會建置該資料夾）。只開本機檔案，不連外部網站。
import http from 'node:http';
import path from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const playwright = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const engine = args.browser === 'webkit' ? 'webkit' : 'chromium';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(ROOT, args.dist || 'dist-qa-all62-city-review');
const base = JSON.parse(await readFile(path.join(ROOT, 'config/site.json'), 'utf8')).basePath;
const port = 4393;
const origin = `http://127.0.0.1:${port}`;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.avif': 'image/avif' };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, origin);
  const file = path.resolve(DIST, decodeURIComponent(u.pathname.slice(base.length)) || 'index.html');
  if (!u.pathname.startsWith(base) || !file.startsWith(DIST + path.sep) || !existsSync(file) || (await stat(file)).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(port, '127.0.0.1', r));
const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok }); console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); };
let browser;
try {
  if (!existsSync(path.join(DIST, 'activities.html'))) throw new Error(`找不到 ${DIST}，請先執行 node tests/qa-full-launch-city-services.test.mjs`);
  const articles = (await readdir(path.join(DIST, 'articles'))).filter((f) => f.endsWith('.html')).map((f) => 'articles/' + f);
  const hubs = ['index.html', 'search.html', 'quiet-power.html', 'toward-light.html', 'activities.html', 'city.html', 'life-family.html', 'career.html', 'health.html', 'law.html', 'learning.html'];
  check('完整首發隔離版有 62 篇文章頁', articles.length === 62, String(articles.length));
  browser = await playwright[engine].launch({ headless: true });
  for (const [width, mobile] of [[320, true], [390, true], [1280, false]]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    const errors = [], missing = new Set(), bad = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(origin)) missing.add(r.url().slice(origin.length)); });
    for (const f of [...articles, ...hubs]) {
      await page.goto(`${origin}${base}${f}`, { waitUntil: 'load' });
      const s = await page.evaluate(async () => {
        for (const i of document.images) i.loading = 'eager';
        await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 3000); })));
        // 正文段落（不含文末「資料來源」小字）
        const ps = [...document.querySelectorAll('.prose p')].filter((p) => !p.closest('.sources'));
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
          font: ps.length ? Math.min(...ps.map((p) => parseFloat(getComputedStyle(p).fontSize))) : null,
          line: ps.length ? Math.round(Math.max(...ps.map((p) => p.getBoundingClientRect().width))) : 0,
          h1: !!document.querySelector('h1'),
          noindex: !!document.querySelector('meta[name="robots"][content*="noindex"]'),
        };
      });
      const issues = [];
      if (s.overflow > 0) issues.push('橫向溢位 ' + s.overflow + 'px');
      if (s.brokenImages) issues.push('圖片載入失敗 ' + s.brokenImages);
      if (!s.h1) issues.push('缺 h1');
      if (!s.noindex) issues.push('缺 noindex');
      if (f.startsWith('articles/') && (s.font === null || s.font < 16)) issues.push('正文字級 ' + s.font);
      if (f.startsWith('articles/') && width === 1280 && s.line > 820) issues.push('行寬 ' + s.line);
      if (issues.length) bad.push(`${f}: ${issues.join('、')}`);
    }
    check(`${engine} ${width}px 62篇文章＋11個目錄頁：無橫向溢位、圖片可載入、正文 ≥ 16px、桌機行寬 ≤ 820px、皆有 noindex、無 JS 錯誤、無站內 404`,
      bad.length === 0 && errors.length === 0 && missing.size === 0, [...bad, ...errors, ...missing].slice(0, 10).join('；'));
    await ctx.close();
  }
  // 活動依臺灣日期（UTC+8）隱藏：活動頁與學習與活動頁同步
  for (const [when, expected] of [['2026-10-18T10:00:00+08:00', 9], ['2026-11-16T00:30:00+08:00', 7], ['2026-11-23T08:00:00+08:00', 6], ['2027-07-26T08:00:00+08:00', 0]]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(when));
    const seen = {};
    for (const f of ['activities.html', 'learning.html']) {
      await page.goto(`${origin}${base}${f}`);
      seen[f] = await page.locator('.notice[data-act-until]:not([hidden])').count();
    }
    await page.goto(`${origin}${base}activities.html`);
    seen.empty = await page.evaluate(() => { const e = document.getElementById('notices-empty'); return e ? !e.hidden : null; });
    check(`${engine} 臺灣時間 ${when.slice(0, 16)}：活動頁與學習與活動各顯示 ${expected} 筆，已過期者隱藏`,
      seen['activities.html'] === expected && seen['learning.html'] === expected && seen.empty === (expected === 0), JSON.stringify(seen));
    await ctx.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise((r) => server.close(r));
}
const failed = checks.filter((x) => !x.ok);
console.log(`完整首發隔離版瀏覽器檢查（${engine}）：${checks.length} 項，通過 ${checks.length - failed.length}，失敗 ${failed.length}`);
if (failed.length) process.exit(1);
