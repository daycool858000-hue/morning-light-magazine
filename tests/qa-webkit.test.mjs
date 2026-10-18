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
import { QA_EXPANSION_QUEUE } from '../scripts/lib/qa-expansion.mjs';
const require = createRequire(import.meta.url);
const { webkit } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist-qa');
// 六大主題擴充佇列明確指定讀利／向望的文章，會接在原 23／13 篇之後
const expansionQueue = JSON.parse(await readFile(path.join(ROOT, QA_EXPANSION_QUEUE), 'utf8'));
const extraIn = (dir) => expansionQueue.articles.filter((a) => a.importToQa && a.directory === dir).length;
const TOWARD_COUNT = 13 + extraIn('toward');
const READLI_COUNT = 23 + extraIn('readli');
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
    check(`WebKit ${width}px 向望：第一個畫面就看到第一排索引，八個索引兩欄排列`, t.n === 8 && t.firstBottom <= 760 && t.sameRow, JSON.stringify(t));
    const vertical = await page.locator('.toward-reading-card').evaluateAll(cards =>
      cards.map(c => ({ x: Math.round(c.getBoundingClientRect().left), y: Math.round(c.getBoundingClientRect().top), w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height) }))
    );
    check(`WebKit ${width}px 向望：13 篇採單欄上下滑動、寬度一致且文字可閱讀`,
      vertical.length === TOWARD_COUNT && vertical.every((v,i) => v.w >= width - 56 && v.w < width && v.h >= 106 && v.h < 230 &&
        (i === 0 || (v.x === vertical[i-1].x && v.y > vertical[i-1].y))), JSON.stringify(vertical.slice(0, 3)));
    await page.goto(`${origin}${base}quiet-power.html`);
    const compact = await page.locator('.readli-reading .story-grid .story').evaluateAll(cards =>
      cards.map(c => { const h = c.querySelector('h3 a').getBoundingClientRect(); return { h: Math.round(c.getBoundingClientRect().height), linkH: Math.round(h.height), cardW: Math.round(c.getBoundingClientRect().width), media: c.querySelector('.story-media') ? getComputedStyle(c.querySelector('.story-media')).display : 'none' }; })
    );
    check(`WebKit ${width}px 讀利：23 篇為精簡單欄清單，標題可觸控、沒有大型圖片`,
      compact.length === READLI_COUNT && compact.every(c => c.h >= 75 && c.h < 240 && c.linkH >= 44 && c.cardW < width && c.media !== 'block'), JSON.stringify(compact.slice(0, 3)));
    await page.goto(`${origin}${base}learning.html`);
    const learningState = await page.evaluate(() => {
      const list = [...document.querySelectorAll('#events-title + .notice-list .notice, [data-act-list] > .notice')];
      const title = document.getElementById('art-title')?.getBoundingClientRect().top ?? -1;
      const upcoming = document.getElementById('events-title')?.getBoundingClientRect().top ?? -1;
      return {
        activities: list.length,
        sources: list.filter(e => e.querySelector('.notice-link[href^="https://"]')).length,
        firstArticleBeforeActivities: title >= 0 && upcoming > title,
        noHorizontalScroll: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    check(`WebKit ${width}px 學習與活動：先看到八篇閱讀文章，再顯示九筆已公告活動及官方來源`,
      learningState.activities === 9 && learningState.sources === 9 &&
      learningState.firstArticleBeforeActivities && learningState.noHorizontalScroll,
      JSON.stringify(learningState));
    // 新階段：14 筆長期查詢入口中，同網址 act-09 不建立第二張卡；
    // 原11筆＋松菸／華山2筆（共13）在各自主題以容易點擊的文字列呈現。
    const portalResult = [];
    for (const [file, expected] of [['life-family.html', 2], ['career.html', 3],
      ['health.html', 2], ['law.html', 1], ['learning.html', 5]]) {
      await page.goto(`${origin}${base}${file}`);
      const state = await page.locator('.qa-portal-list > li').evaluateAll(rows =>
        rows.map(row => { const a=row.querySelector('a'), rect=a.getBoundingClientRect(); return {
          href:a.getAttribute('href'), h:Math.round(rect.height),
          target:a.target, rel:a.rel, overflow:document.documentElement.scrollWidth > innerWidth
        }; })
      );
      if (state.length !== expected || state.some(x => x.h < 44 || !x.href?.startsWith('https://') ||
          x.target !== '_blank' || !x.rel.includes('noopener') || x.overflow)) portalResult.push(file + ' ' + JSON.stringify(state));
    }
    check(`WebKit ${width}px 官方入口：13 筆不同網址以輕量文字列在五個主題顯示，44px 可點、HTTPS、無橫向溢位`,
      portalResult.length === 0, portalResult.join('；'));
    // 網站內容增加後，五個主題可以直接跳到需求／索引，無須把整頁滑到底。
    const jumpFailures = [];
    for (const [file, target] of [
      ['life-family.html', 'need-title'], ['career.html', 'need-title'],
      ['health.html', 'need-title'], ['law.html', 'need-title'],
      ['learning.html', 'topics-title'],
    ]) {
      await page.goto(`${origin}${base}${file}`);
      const jump = page.locator('.cat-hero-jump a');
      if (await jump.count() !== 1) { jumpFailures.push(file + ' missing shortcut'); continue; }
      await jump.tap();
      await page.waitForTimeout(450);
      const o = await page.evaluate((id) => {
        const heading = document.getElementById(id), header = document.querySelector('.site-header');
        const r = heading.getBoundingClientRect();
        return {hash:location.hash, top:Math.round(r.top), header:Math.round(header.getBoundingClientRect().bottom), bottom:Math.round(r.bottom)};
      }, target);
      if (o.hash !== '#' + target || o.top < o.header || o.top > 760 || o.bottom <= o.top)
        jumpFailures.push(file + ' ' + JSON.stringify(o));
    }
    await page.goto(`${origin}${base}city.html`);
    if (await page.locator('.cat-hero-jump').count() !== 0) jumpFailures.push('city should keep independent layout');
    check(`WebKit ${width}px 五個主題頁首捷徑：44px 可觸控，直接跳到未被固定頁首遮住的需求或索引；城市原版不變`,
      jumpFailures.length === 0, jumpFailures.join('；'));
    check(`WebKit ${width}px 首頁、活動頁、讀利、向望、城市福利與含表格文章無水平溢位，無 JS 錯誤`, overflow.length === 0 && errors.length === 0, [...overflow, ...errors].join('；'));
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
  check('WebKit 向望：13 篇文章直接展示為單欄可點擊閱讀卡，390px 上下滑動',
    gallery === TOWARD_COUNT && cardLinks === TOWARD_COUNT && readingLayout.length === 3 &&
    readingLayout[0].y < readingLayout[1].y && readingLayout[1].y < readingLayout[2].y &&
    readingLayout[0].x === readingLayout[1].x && readingLayout[1].x === readingLayout[2].x &&
    readingLayout.every(c => c.w >= 300 && c.w <= 390),
    JSON.stringify({ gallery, cardLinks, readingLayout }));
  await page.tap('#toward-women-center a[href="articles/batch6-women-center-services.html"]');
  await page.waitForURL('**/articles/batch6-women-center-services.html');
  check('WebKit 390px 向望：八個索引都能點開（入口維持原欄位），文章連結齊全且高度 ≥ 44px；婦女中心課程第一篇可開啟', bad.length === 0, bad.join('；'));
  // 全站小日曆：新分頁首次進站第 2 秒看不到、第 3.5 秒浮現；點進活動頁；換到讀利、向望、文章仍直接顯示
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
    check('WebKit 390px 全站小日曆：首次進站第 2 秒看不到、第 3.5 秒浮現並常駐（≥ 44px、在畫面內、不蓋住切換畫面）；換到讀利、向望、文章直接顯示；點進活動頁列出具體活動官方公告（另開新分頁＋noopener）與 14 個長期入口', s2.vis === 'hidden' && s35.vis === 'visible' && s45.op === 1 && s45.h >= 44 && s45.inView && s45.clearOfSwitch && later.length === 0 && n >= 4 && portals === 14, JSON.stringify({ s2, s35, s45, later, n, portals }));
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
