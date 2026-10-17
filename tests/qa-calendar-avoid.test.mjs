#!/usr/bin/env node
// 全站小日曆「近期活動」避讓驗收（QA-only）：Chromium 或 WebKit（模擬 Safari，不是真正 iPhone），320／375／390／1280px。
// 用法：node tests/qa-calendar-avoid.test.mjs --browser=chromium|webkit [--dist=dist-qa] [--shots=資料夾] [--report]
//       除錯：--only=頁面1,頁面2、--widths=390,1280、--debug（列出重疊座標）
// 需先建置 dist-qa。只開本機檔案，不連外部網站。
// 檢查：文章閱讀頁、六大主題頁、官方資源連結、搜尋結果、讀利、向光、懷孕與生育閱讀區，由上到下逐段捲動並停下後：
//   一、求助電話、有急事、切換畫面、搜尋框、表單與按鈕完全不被蓋住；
//   二、一般連結（含較長的官方連結文字延伸到右側的部分）每一行文字都不被蓋住，點擊位置仍落在連結上；
//   三、捲動進行中小日曆不跟著跳動，停下後才一次調整到位；小日曆維持原尺寸與外觀（必要時才縮成 44px 圖示）。
// --report 只列出問題、不判定失敗（用來量測修正前的舊版）。
import http from 'node:http';
import path from 'node:path';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const playwright = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const DIST = path.resolve(ROOT, args.dist || 'dist-qa');
const engine = args.browser === 'webkit' ? 'webkit' : 'chromium';
const shots = args.shots ? path.resolve(ROOT, args.shots) : '';
const reportOnly = 'report' in args;
const base = JSON.parse(await readFile(path.join(ROOT, 'config/site.json'), 'utf8')).basePath;
const port = engine === 'webkit' ? 4391 : 4392;
const origin = `http://127.0.0.1:${port}`;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, origin);
  const rel = decodeURIComponent(u.pathname.slice(base.length)) || 'index.html';
  const file = path.resolve(DIST, rel);
  if (!u.pathname.startsWith(base) || !file.startsWith(DIST + path.sep) || !existsSync(file) || (await stat(file)).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(port, '127.0.0.1', r));
const checks = [];
const check = (name, ok, detail = '') => { checks.push(ok); console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); };

// 文章閱讀頁（原 36 篇＋擴充、含長來源連結）、六大主題、讀利、向光、活動、首頁
const PAGES = [
  'articles/exp-choosing-open-courses.html', 'articles/exp-women-center-courses.html', 'articles/batch2-01.html',
  'articles/batch6-welfare-overview.html', 'articles/batch5-harassment-three-laws.html',
  'life-family.html', 'career.html', 'health.html', 'law.html', 'city.html', 'learning.html',
  'quiet-power.html', 'toward-light.html', 'activities.html', 'index.html',
];
const SEARCHES = ['產檢', '補助', '婦女'];
// --only=頁面1,頁面2 只檢查指定頁面（除錯用）；--widths=390,1280 只跑指定寬度
const ONLY = args.only ? args.only.split(',') : null;
const WIDTHS = args.widths ? args.widths.split(',').map(Number) : [320, 375, 390, 1280];

// 停下後的檢查：關鍵元素整塊不可重疊；一般連結每一行文字不可重疊，且文字中央點得到
const inspect = (page) => page.evaluate(() => {
  const CRIT = 'input, select, textarea, button, a[href^="tel:"], a[href^="sms:"], .quick-urgent, [data-switch-screen], .search-form, .support-entry';
  const chip = document.querySelector('.act-entry');
  const c = chip.getBoundingClientRect();
  const hit = (r) => r.width && r.height && r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top && r.bottom > 0 && r.top < innerHeight;
  const name = (el) => (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, '').slice(0, 14);
  const out = { crit: [], text: [], chip: { w: Math.round(c.width), h: Math.round(c.height), compact: chip.classList.contains('is-compact'), inView: c.top >= 0 && c.bottom <= innerHeight && c.right <= innerWidth } };
  for (const el of document.querySelectorAll(`${CRIT}, a[href], label[for], summary`)) {
    if (chip.contains(el) || el.classList.contains('skip-link')) continue;
    if (el.matches(CRIT)) { for (const r of el.getClientRects()) if (hit(r)) out.crit.push(name(el)); continue; }
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    const box = el.getBoundingClientRect();
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!/\S/.test(n.nodeValue)) continue;
      range.selectNodeContents(n);
      // 只算看得到的文字：裁到連結本身的範圍（被省略號截掉、溢出的部分不算）
      for (const t of range.getClientRects()) {
        const r = { left: Math.max(t.left, box.left), right: Math.min(t.right, box.right), top: Math.max(t.top, box.top), bottom: Math.min(t.bottom, box.bottom) };
        r.width = Math.max(0, r.right - r.left); r.height = Math.max(0, r.bottom - r.top);
        if (!hit(r)) continue;
        const x = Math.min(Math.max(c.left + 1, r.left), r.right - 1);
        const y = (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2;
        const at = document.elementFromPoint(x, y);
        out.text.push(`${name(el)}${at && el.contains(at) ? '' : '（點不到）'}${window.__calDebug ? JSON.stringify([r.left, r.top, r.right, r.bottom, c.left, c.top, scrollY].map(Math.round)) : ''}`);
      }
    }
  }
  return out;
});
const chipTop = (page) => page.evaluate(() => Math.round(document.querySelector('.act-entry').getBoundingClientRect().top));
// 小日曆在捲動停下約 0.12 秒後才調整（加一個畫面更新），等它就位再檢查
const settle = (page) => page.waitForTimeout(engine === 'webkit' ? 300 : 220);

// 由上到下、每次捲動半個畫面並停下
async function sweep(page, label, problems, worst) {
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const step = await page.evaluate(() => Math.round(innerHeight * 0.55));
  for (let y = 0; ; y = Math.min(max, y + step)) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await settle(page);
    const s = await inspect(page);
    if (s.crit.length) problems.push(`${label} 捲動 ${y}px 蓋住 ${s.crit.slice(0, 2).join('、')}`);
    if (s.text.length) problems.push(`${label} 捲動 ${y}px 蓋住連結文字 ${s.text.slice(0, 2).join('、')}`);
    if (!s.chip.inView || s.chip.h < 44 || s.chip.w < 44 || s.chip.h > 64 || s.chip.w > 80) problems.push(`${label} 捲動 ${y}px 小日曆尺寸或位置異常 ${JSON.stringify(s.chip)}`);
    if (s.chip.compact) worst.compact++;
    worst.stops++;
    if (y >= max) break;
  }
}

let browser;
let exitCode = 0;
try {
  if (!existsSync(path.join(DIST, 'life-family.html'))) throw new Error(`找不到 ${DIST}，請先建置 dist-qa`);
  browser = await playwright[engine].launch({ headless: true });
  if (shots) await mkdir(shots, { recursive: true });
  for (const width of WIDTHS) {
    const mobile = width < 1000;
    const ctx = await browser.newContext({ viewport: { width, height: mobile ? 760 : 900 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
    // 已浮現過的狀態（同一分頁換頁直接顯示），避免每頁等 3 秒；進場計時另由 qa-batch2／qa-webkit 測試
    await ctx.addInitScript((dbg) => { window.__calDebug = dbg; try { sessionStorage.setItem('yj-cal-shown', '1'); } catch (e) { /* 無 */ } }, 'debug' in args);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${engine} ${width}px`;
    const problems = [];
    const worst = { compact: 0, stops: 0 };
    for (const f of PAGES.filter((x) => !ONLY || ONLY.includes(x))) {
      await page.goto(`${origin}${base}${f}`, { waitUntil: 'load' });
      await sweep(page, f, problems, worst);
    }
    for (const q of ONLY ? [] : SEARCHES) {
      await page.goto(`${origin}${base}search.html`, { waitUntil: 'load' });
      await page.fill('#q', q);
      await page.waitForTimeout(400);
      await sweep(page, `搜尋「${q}」`, problems, worst);
    }
    // 懷孕與生育閱讀區（官方連結文字較長）：從主題 01 點進完整指南後逐段檢查
    await page.goto(`${origin}${base}life-family.html#pregnancy`, { waitUntil: 'load' });
    await page.click('#pregnancy .topic-guide-link a');
    await settle(page);
    {
      const range = await page.evaluate(() => { const s = document.getElementById('pregnancy-guide').getBoundingClientRect(); return { top: Math.round(scrollY + s.top), bottom: Math.round(scrollY + s.bottom) }; });
      const step = Math.round((mobile ? 760 : 900) * 0.3);
      for (let y = range.top - 200; y < range.bottom; y += step) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await settle(page);
        const s = await inspect(page);
        if (s.crit.length || s.text.length) problems.push(`懷孕與生育 ${y}px 蓋住 ${[...s.crit, ...s.text].slice(0, 2).join('、')}`);
      }
    }
    for (const p of problems.slice(0, 12)) console.log(`   · ${tag} ${p}`);
    check(`${tag}：${PAGES.length} 頁＋${SEARCHES.length} 組搜尋結果＋懷孕與生育閱讀區，停下後小日曆不蓋住關鍵操作與任何連結文字（含長官方連結右側）`, problems.length === 0, `問題 ${problems.length} 處；停點 ${worst.stops}、暫縮 44px ${worst.compact} 次`);

    // 捲動進行中不跳動：連續捲動 0.6 秒期間位置不變，停下後 0.4 秒內調整到位
    await page.goto(`${origin}${base}life-family.html`, { waitUntil: 'load' });
    await page.evaluate(() => { const s = document.getElementById('pregnancy-guide'); window.scrollTo(0, scrollY + s.getBoundingClientRect().top - 100); });
    await settle(page);
    const tops = [];
    for (let i = 0; i < 36; i++) {
      await page.evaluate(() => window.scrollBy(0, 18));
      await page.waitForTimeout(16);
      tops.push(await chipTop(page));
    }
    const still = new Set(tops).size === 1;
    await page.waitForTimeout(400);
    const after = await inspect(page);
    check(`${tag}：連續捲動時小日曆不跟著跳動，停下後才調整且不蓋住內容`, still && !after.crit.length && !after.text.length, `捲動中位置 ${[...new Set(tops)].join('/')}；停下後 ${JSON.stringify({ crit: after.crit.length, text: after.text.length })}`);

    // 一般捲動與點擊：小日曆本身可點、仍連到活動頁
    await page.goto(`${origin}${base}articles/exp-choosing-open-courses.html`, { waitUntil: 'load' });
    const y0 = await page.evaluate(() => scrollY);
    if (mobile) await page.mouse.wheel(0, 600); else await page.mouse.wheel(0, 600);
    await settle(page);
    const y1 = await page.evaluate(() => scrollY);
    await page.click('.act-entry');
    await page.waitForURL('**/activities.html');
    check(`${tag}：一般捲動正常，小日曆仍可點擊前往近期活動`, y1 > y0, `scrollY ${y0}→${y1}`);

    if (shots) {
      await page.goto(`${origin}${base}life-family.html#pregnancy-guide`, { waitUntil: 'load' });
      await settle(page);
      await page.screenshot({ path: path.join(shots, `${engine}-${width}-pregnancy-guide-viewport.png`) });
    }
    check(`${tag}：沒有 JavaScript 錯誤`, errors.length === 0, errors.slice(0, 2).join('；'));
    await ctx.close();
  }
} catch (e) {
  console.error(e);
  exitCode = 1;
} finally {
  await browser?.close();
  server.close();
}
const failed = checks.filter((x) => !x).length;
console.log(`小日曆避讓（${engine}）：${checks.length} 項，通過 ${checks.length - failed}，失敗 ${failed}${reportOnly ? '（--report 僅量測，不判定）' : ''}`);
process.exitCode = exitCode || (failed && !reportOnly ? 1 : 0);
