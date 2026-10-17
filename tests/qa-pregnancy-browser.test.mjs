#!/usr/bin/env node
// 生活與家庭 01「懷孕與生育」閱讀區的瀏覽器驗收：Chromium 或 WebKit（模擬 Safari，不是真正 iPhone），320／375／390／1280px。
// 用法：node tests/qa-pregnancy-browser.test.mjs --browser=chromium|webkit [--shots=資料夾]
// 需先建置 dist-qa。只開本機 dist-qa，不連任何外部網站；官方外站可開性另見 check-links-browser.mjs --set=pregnancy。
import http from 'node:http';
import path from 'node:path';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const playwright = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist-qa');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const engine = args.browser === 'webkit' ? 'webkit' : 'chromium';
const shots = args.shots ? path.resolve(ROOT, args.shots) : '';
const base = JSON.parse(await readFile(path.join(ROOT, 'config/site.json'), 'utf8')).basePath;
const port = engine === 'webkit' ? 4381 : 4382;
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
// 目標元素頂端在固定頁首之下、仍在第一個畫面內
const landed = (page, id) => page.evaluate((id) => {
  const header = Math.round(document.querySelector('.site-header').getBoundingClientRect().bottom);
  const top = Math.round(document.getElementById(id).getBoundingClientRect().top);
  return { hash: location.hash, header, top, ok: top >= header - 1 && top < innerHeight - 80 };
}, id);
let browser;
try {
  if (!existsSync(path.join(DIST, 'life-family.html'))) throw new Error('找不到 dist-qa，請先執行 npm test');
  browser = await playwright[engine].launch({ headless: true });
  if (shots) await mkdir(shots, { recursive: true });
  for (const width of [320, 375, 390, 1280]) {
    const mobile = width < 1000;
    const ctx = await browser.newContext({ viewport: { width, height: mobile ? 760 : 900 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${engine} ${width}px`;

    await page.goto(`${origin}${base}life-family.html#pregnancy`);
    await page.waitForTimeout(300);
    const old = await landed(page, 'pregnancy');
    check(`${tag}：原本的 #pregnancy 入口仍可直接開啟，主題 01 不被頁首遮住`, old.hash === '#pregnancy' && old.ok, JSON.stringify(old));
    const before = await page.evaluate(() => [...document.querySelectorAll('#topics-title ~ .topic-list > .topic, .topic-list > .topic')].map((li) => li.id));
    check(`${tag}：主題索引十項排列不變`, JSON.stringify([...new Set(before)]) === JSON.stringify(['pregnancy', 'childcare', 'daycare', 'parenting', 'single-parent', 'special-circumstances', 'family-finance', 'long-term-care', 'respite', 'local-family']));
    if (shots) await page.locator('#pregnancy').screenshot({ path: path.join(shots, `${engine}-${width}-topic01.png`) });

    await page.click('#pregnancy .topic-guide-link a');
    await page.waitForTimeout(600);
    const g = await landed(page, 'pregnancy-guide');
    check(`${tag}：點「查看孕期與生育資訊整理」跳到 #pregnancy-guide，小標不被頁首遮住`, g.hash === '#pregnancy-guide' && g.ok, JSON.stringify(g));
    if (shots) await page.locator('#pregnancy-guide').screenshot({ path: path.join(shots, `${engine}-${width}-guide.png`) });

    const links = await page.locator('#pregnancy-guide .preg-links a').evaluateAll((as) => as.map((a) => { const r = a.getBoundingClientRect(); return { href: a.href, target: a.target, h: Math.round(r.height), w: Math.round(r.width), right: Math.round(r.right) }; }));
    const vw = await page.evaluate(() => innerWidth);
    check(`${tag}：九個官方連結都可見、可點擊（高度 ≥ 44px、不超出畫面），網址不重複`,
      links.length === 9 && new Set(links.map((l) => l.href)).size === 9 && links.every((l) => l.h >= 44 && l.w > 0 && l.right <= vw && l.target === '_blank' && l.href.startsWith('https://')), JSON.stringify(links.filter((l) => l.h < 44 || l.right > vw)));
    const inner = await page.locator('#pregnancy-guide .preg-inner a').evaluateAll((as) => as.map((a) => ({ href: a.getAttribute('href'), h: Math.round(a.getBoundingClientRect().height) })));
    check(`${tag}：站內延伸連結（法律權益、城市福利、育兒津貼、托育、回到索引）點擊區 ≥ 44px`, inner.length === 6 && inner.every((l) => l.h >= 44), JSON.stringify(inner));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`${tag}：生活與家庭頁沒有水平捲動`, overflow <= 0, `${overflow}px`);

    // 外部連結點擊會開新分頁：只攔下請求確認目標網址，不實際連到外站
    await ctx.route(/^https:\/\/(?!127\.0\.0\.1)/, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }));
    const [popup] = await Promise.all([ctx.waitForEvent('page'), page.click('#pregnancy-guide .preg-links a >> nth=2')]);
    check(`${tag}：點勞保局生育補助連結會另開分頁前往原網址`, popup.url() === 'https://www.bli.gov.tw/0109643.html', popup.url());
    await popup.close();

    await page.click('#pregnancy-guide .preg-next a[href="#childcare"]');
    await page.waitForTimeout(500);
    const cc = await landed(page, 'childcare');
    check(`${tag}：「出生後想查育兒津貼」跳到既有 #childcare 主題`, cc.hash === '#childcare' && cc.ok, JSON.stringify(cc));
    await page.goto(`${origin}${base}life-family.html#pregnancy-guide`);
    await page.click('#pregnancy-guide .preg-next a[href="#pregnancy"]');
    await page.waitForTimeout(500);
    const back = await landed(page, 'pregnancy');
    check(`${tag}：「回到主題索引」回到 #pregnancy`, back.hash === '#pregnancy' && back.ok, JSON.stringify(back));
    await page.goto(`${origin}${base}life-family.html#pregnancy-guide`);
    await page.click('#pregnancy-guide a[href="law.html#parental-leave"]');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);
    const law = await landed(page, 'parental-leave');
    check(`${tag}：分類頁導覽「法律與權益｜產假及育嬰留職停薪」開到 law.html#parental-leave`, page.url().endsWith('law.html#parental-leave') && law.ok, JSON.stringify(law));

    await page.goto(`${origin}${base}search.html`);
    await page.fill('[data-search-input]', '產檢');
    await page.press('[data-search-input]', 'Enter');
    await page.waitForTimeout(400);
    const hit = page.locator('[data-search-results] a[href="life-family.html#pregnancy-guide"]');
    const found = await hit.count();
    if (found) { await hit.first().click(); await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(500); }
    const s = found ? await landed(page, 'pregnancy-guide') : {};
    check(`${tag}：站內搜尋「產檢」找到孕期與生育資訊整理，點擊後到達 #pregnancy-guide`, found === 1 && s.ok && page.url().endsWith('life-family.html#pregnancy-guide'), JSON.stringify(s));

    if (shots) {
      await page.goto(`${origin}${base}life-family.html#pregnancy-guide`);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(shots, `${engine}-${width}-viewport.png`) });
    }
    check(`${tag}：沒有 JavaScript 錯誤`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
} catch (err) {
  check(`${engine} 測試執行`, false, err.message);
} finally {
  if (browser) await browser.close();
  server.close();
}
const failed = checks.filter((x) => !x).length;
console.log(`孕期與生育閱讀區（${engine}）：${checks.length} 項，通過 ${checks.length - failed}，失敗 ${failed}`);
if (failed) process.exitCode = 1;
