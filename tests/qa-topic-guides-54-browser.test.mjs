#!/usr/bin/env node
// 54主題入口整合版（dist-qa-topic54，獨立 staging，不是公開 QA）：Chromium 或 WebKit（模擬 Safari，不是真正 iPhone）相容檢查。
// 用法：node tests/qa-topic-guides-54-browser.test.mjs --browser=chromium|webkit
// 需先執行 tests/qa-topic-guides-54.test.mjs（會建置 dist-qa-topic54）。只開本機檔案，不連外部網站。
// 只補測整合相容性：六大主題頁 320／375／390／1280px 無橫向捲動、新入口可點（44px）、另開新視窗且 noopener、
// 12 條提醒可見、孕產閱讀區（PR #17）仍在、主題索引錨點可跳轉。外部網址的開啟結果沿用 PR #16 的 CI 稽核。
import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const playwright = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const DIST = path.join(ROOT, 'dist-qa-topic54');
const engine = args.browser === 'webkit' ? 'webkit' : 'chromium';
const base = JSON.parse(await readFile(path.join(ROOT, 'config/site.json'), 'utf8')).basePath;
const cats = JSON.parse(await readFile(path.join(ROOT, 'content/categories.json'), 'utf8'));
const data = JSON.parse(await readFile(path.join(ROOT, 'docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json'), 'utf8'));
const port = engine === 'webkit' ? 4393 : 4394;
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
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? '✔' : '✘'} ${engine} ${name}${detail && !ok ? ' — ' + detail : ''}`); };

const shown = data.topics.filter((t) => t.displayMode !== 'keep');
const expectLinks = shown.reduce((n, t) => n + t.links.length, 0);
const expectNotes = data.topics.filter((t) => t.clarification).length;
let browser;
try {
  if (!existsSync(path.join(DIST, 'life-family.html'))) throw new Error('找不到 dist-qa-topic54，請先執行 node tests/qa-topic-guides-54.test.mjs');
  browser = await playwright[engine].launch({ headless: true });
  for (const width of [320, 375, 390, 1280]) {
    const mobile = width < 1000;
    const ctx = await browser.newContext({ viewport: { width, height: mobile ? 760 : 900 }, ...(mobile && engine === 'webkit' ? { isMobile: true, hasTouch: true } : {}), deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let links = 0, notes = 0;
    const overflow = [], small = [], unsafe = [], hiddenNotes = [];
    for (const c of cats) {
      await page.goto(`${origin}${base}${c.id}.html`);
      const r = await page.evaluate(() => {
        const vw = innerWidth;
        const as = [...document.querySelectorAll('.topic-guide-links a')].map((a) => {
          const b = a.getBoundingClientRect();
          return { t: a.textContent.trim().slice(0, 16), h: b.height, right: b.right, left: b.left, target: a.target, rel: a.rel };
        });
        const ns = [...document.querySelectorAll('.topic-guide-clarification')].map((p) => {
          const b = p.getBoundingClientRect();
          return { h: b.height, right: b.right, vis: getComputedStyle(p).display !== 'none' && getComputedStyle(p).visibility !== 'hidden' };
        });
        return { o: document.documentElement.scrollWidth - vw, vw, as, ns };
      });
      if (r.o > 0) overflow.push(`${c.id} ${r.o}px`);
      links += r.as.length; notes += r.ns.length;
      for (const a of r.as) {
        if (a.h < 44) small.push(`${c.id}:${a.t}(${Math.round(a.h)})`);
        if (a.right > r.vw + 1 || a.left < -1) overflow.push(`${c.id}:${a.t} 超出畫面`);
        if (a.target !== '_blank' || !/noopener/.test(a.rel)) unsafe.push(`${c.id}:${a.t}`);
      }
      for (const n of r.ns) if (!n.vis || n.h <= 0 || n.right > r.vw + 1) hiddenNotes.push(c.id);
    }
    check(`${width}px 六大主題頁無橫向捲動、新入口不超出畫面`, overflow.length === 0, overflow.join('；'));
    check(`${width}px 顯示全部 ${expectLinks} 個新入口連結`, links === expectLinks, `實際 ${links}`);
    check(`${width}px 新入口點擊高度至少 44px`, small.length === 0, small.slice(0, 8).join('；'));
    check(`${width}px 新入口另開新視窗並帶 noopener`, unsafe.length === 0, unsafe.join('；'));
    check(`${width}px ${expectNotes} 條制度提醒完整顯示`, notes === expectNotes && hiddenNotes.length === 0, `${notes} ${hiddenNotes.join(',')}`);

    await page.goto(`${origin}${base}life-family.html`);
    const p = await page.evaluate(() => {
      const sec = document.querySelector('.preg-guide');
      const jump = document.querySelector('#pregnancy .topic-guide-link a');
      return { sec: !!sec, steps: sec ? sec.querySelectorAll('.preg-step').length : 0, jump: jump?.getAttribute('href') || '', pregNew: document.querySelectorAll('#pregnancy .topic-guide-links').length };
    });
    check(`${width}px 懷孕與生育閱讀區（PR #17）仍在，主題 01 未被54入口覆蓋`, p.sec && p.steps === 4 && p.jump === '#' + (await page.evaluate(() => document.querySelector('.preg-guide').id)) && p.pregNew === 0, JSON.stringify(p));
    // 頁首「從你想了解的事開始」索引仍可跳到修正後的主題
    await page.goto(`${origin}${base}law.html#official-complaints`);
    await page.waitForTimeout(300);
    const j = await page.evaluate(() => { const b = document.getElementById('official-complaints').getBoundingClientRect(); return { top: Math.round(b.top), links: document.querySelectorAll('#official-complaints .topic-guide-links a').length }; });
    check(`${width}px 主題錨點可直接跳到修正後的入口`, j.top >= 0 && j.top < (mobile ? 760 : 900) && j.links >= 1, JSON.stringify(j));
    check(`${width}px 無 JavaScript 錯誤`, errors.length === 0, errors.join('；'));
    await ctx.close();
  }
} catch (e) {
  failed++;
  console.error(e);
} finally {
  await browser?.close();
  server.close();
}
if (failed) { console.error(`${engine}：54主題入口整合相容檢查 ${failed} 項未通過`); process.exit(1); }
console.log(`${engine}：54主題入口整合相容檢查全部通過（不等於真正 iPhone／站主人工驗收）`);
