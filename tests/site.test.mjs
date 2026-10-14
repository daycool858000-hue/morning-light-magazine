#!/usr/bin/env node
// 晨光生活誌 自動化測試：以模擬 GitHub Pages 的本機伺服器開啟建置結果，並用 Playwright（Chromium）逐頁檢查。
// 用法：npm test（會先建置 preview 與 production 版本）
// 需要 Playwright：本機請先 `npm i -D playwright`；若環境已全域安裝，會自動使用。

import http from 'node:http';
import { readFile, readdir, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  const candidates = ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/node22/lib/node_modules/playwright'].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch { /* 試下一個 */ }
  }
  console.error('找不到 Playwright。請執行 npm i -D playwright 後再測試。');
  process.exit(2);
}
const { chromium } = loadPlaywright();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const DIST_PROD = path.join(ROOT, 'dist-production');
const site = JSON.parse(await readFile(path.join(ROOT, 'config/site.json'), 'utf8'));
const BASE = site.basePath; // 模擬 GitHub Pages 專案網址的子路徑
const PORT = 4321;
const ORIGIN = `http://127.0.0.1:${PORT}`;

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
};

// ---------- 模擬 GitHub Pages 的靜態伺服器 ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  let rel = decodeURIComponent(url.pathname);
  if (!rel.startsWith(BASE)) rel = '/__missing__';
  rel = rel.slice(BASE.length) || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(DIST, rel);
  if (file.startsWith(DIST) && existsSync(file) && (await stat(file)).isFile()) {
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } else {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    res.end(await readFile(path.join(DIST, '404.html')));
  }
});
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

async function listHtml(dir, prefix = '') {
  const out = [];
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) {
      if (entry !== 'assets') out.push(...(await listHtml(full, `${prefix}${entry}/`)));
    } else if (entry.endsWith('.html')) out.push(prefix + entry);
  }
  return out.sort();
}
const pages = (await listHtml(DIST)).filter((p) => p !== '404.html');

const browser = await chromium.launch();
try {
  // ---------- 1. 每一頁在多種寬度下的載入、溢位、圖片、連結 ----------
  const widths = [320, 375, 390, 768, 1024, 1440];
  const consoleErrors = [];
  const failed = [];
  const thirdParty = new Set();
  let overflow = [];
  let brokenImages = [];

  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${width}px ${page.url()}：${m.text()}`); });
    page.on('requestfailed', (r) => failed.push(`${r.url()} (${r.failure()?.errorText})`));
    page.on('request', (r) => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:')) thirdParty.add(r.url()); });
    page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    for (const p of pages) {
      await page.goto(`${ORIGIN}${BASE}${p}`, { waitUntil: 'load' });
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (o > 0) overflow.push(`${p} @${width}px 溢出 ${o}px`);
      const bad = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
      brokenImages.push(...bad.map((s) => `${p}: ${s}`));
    }
    await ctx.close();
  }
  check(`所有 ${pages.length} 個頁面於 ${widths.join('/')}px 無水平溢位`, overflow.length === 0, overflow.slice(0, 5).join('；'));
  check('所有圖片與插圖正常載入', brokenImages.length === 0, brokenImages.slice(0, 5).join('；'));
  check('沒有 JavaScript 錯誤', consoleErrors.length === 0, consoleErrors.slice(0, 5).join('；'));
  check('沒有載入失敗的資源（404 等）', failed.length === 0, [...new Set(failed)].slice(0, 5).join('；'));
  check('頁面不向任何第三方網域發出請求（無追蹤、無外部字型或腳本）', thirdParty.size === 0, [...thirdParty].slice(0, 5).join('；'));

  // ---------- 2. 靜態 HTML 檢查：內部連結、外部連結、禁用元素 ----------
  const linkProblems = [];
  const externalProblems = [];
  const forbidden = [];
  const missingCommon = [];
  const telLinks = new Set();
  for (const p of [...pages, '404.html']) {
    const html = await readFile(path.join(DIST, p), 'utf8');
    for (const pattern of [/<iframe/i, /google-analytics|googletagmanager|gtag\(|fbq\(|connect\.facebook/i, /sms:110/i, /<form[^>]*method="post"/i, /<input(?![^>]*type="search")/i, /localStorage|sessionStorage|document\.cookie/]) {
      if (pattern.test(html)) forbidden.push(`${p}: ${pattern}`);
    }
    if (!html.includes('data-switch-screen')) missingCommon.push(`${p} 缺少切換畫面`);
    if (!html.includes('disclaimer.html') || !html.includes('privacy.html')) missingCommon.push(`${p} 頁尾缺少聲明連結`);
    for (const [, href] of html.matchAll(/<a [^>]*href="([^"]+)"/g)) {
      if (href.startsWith('tel:')) { telLinks.add(href); continue; }
      if (/^https?:/.test(href)) {
        if (!href.startsWith('https://')) externalProblems.push(`${p}: 非 HTTPS ${href}`);
        continue;
      }
      if (href.startsWith('#')) {
        if (href.length > 1 && !html.includes(`id="${href.slice(1)}"`)) linkProblems.push(`${p}: 找不到錨點 ${href}`);
        continue;
      }
      const [target, hash] = href.split('#');
      const resolved = p === '404.html' ? target.replace(BASE, '') : path.posix.normalize(path.posix.join(path.posix.dirname(p), target));
      if (!existsSync(path.join(DIST, resolved))) { linkProblems.push(`${p}: 失效連結 ${href}`); continue; }
      if (hash && !hash.startsWith('county=')) {
        const targetHtml = await readFile(path.join(DIST, resolved), 'utf8');
        if (!targetHtml.includes(`id="${hash}"`)) linkProblems.push(`${p}: ${resolved} 找不到錨點 #${hash}`);
      }
    }
    // 外連必須有 noopener noreferrer（切換畫面連結也需 noreferrer）
    for (const [tag] of html.matchAll(/<a [^>]*href="https?:[^"]+"[^>]*>/g)) {
      if (!/rel="[^"]*noreferrer/.test(tag) || !/rel="[^"]*noopener/.test(tag)) externalProblems.push(`${p}: 外連缺少 rel 安全屬性 ${tag.slice(0, 80)}`);
    }
    if (!html.includes('<meta name="referrer" content="no-referrer">')) externalProblems.push(`${p}: 缺少 referrer 政策`);
  }
  check('所有站內連結與錨點都能開啟', linkProblems.length === 0, linkProblems.slice(0, 8).join('；'));
  check('外部連結皆為 HTTPS 且具 noopener noreferrer、全站 no-referrer', externalProblems.length === 0, externalProblems.slice(0, 5).join('；'));
  check('無 iframe、追蹤碼、sms:110、POST 表單、搜尋以外的輸入欄位或本機儲存', forbidden.length === 0, forbidden.join('；'));
  check('每頁都有切換畫面與免責聲明／隱私宣告連結', missingCommon.length === 0, missingCommon.join('；'));
  const badTel = [...telLinks].filter((t) => !/^tel:\d+$/.test(t));
  check(`撥號連結格式正確（${[...telLinks].sort().join('、')}）`, badTel.length === 0 && ['tel:110', 'tel:113', 'tel:119', 'tel:1925'].every((t) => telLinks.has(t)), badTel.join('、'));

  // ---------- 3. 互動功能 ----------
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  // 不真的連到 Google：攔截後回傳空白頁
  await ctx.route('https://www.google.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }));
  const page = await ctx.newPage();

  // 切換畫面：以 replace 前往 Google，返回鍵不會回到本站
  await page.goto(`${ORIGIN}${BASE}index.html`);
  await page.goto(`${ORIGIN}${BASE}law.html`);
  const before = await page.evaluate(() => history.length);
  await page.tap('[data-switch-screen]');
  await page.waitForURL('https://www.google.com/**');
  const after = await page.evaluate(() => history.length);
  await page.goBack();
  const backUrl = page.url();
  check('切換畫面：在原分頁前往 Google，且使用 replace（不新增歷史紀錄）', after === before && !backUrl.endsWith('law.html'), `history ${before}→${after}，返回後網址 ${backUrl}`);

  // 手機選單
  await page.goto(`${ORIGIN}${BASE}index.html`);
  const hiddenBefore = await page.isHidden('#site-nav');
  await page.tap('.menu-toggle');
  const visibleAfter = await page.isVisible('#site-nav a[href="health.html"]');
  await page.keyboard.press('Escape');
  const hiddenAgain = await page.isHidden('#site-nav');
  check('手機選單可開啟、關閉（含 Esc）', hiddenBefore && visibleAfter && hiddenAgain);

  // 城市索引
  await page.goto(`${ORIGIN}${BASE}city.html`);
  const statusText = () => page.textContent('#finder-status');
  const optionCount = await page.locator('#county option[value]:not([value=""])').count();
  check('城市索引提供 22 個縣市選項', optionCount === 22, `實際 ${optionCount}`);
  await page.tap('.county-chip[data-county="taichung"]');
  const s1 = await statusText();
  const pressed = await page.getAttribute('.county-chip[data-county="taichung"]', 'aria-pressed');
  await page.selectOption('#service-type', '法律扶助');
  const s2 = await statusText();
  const visibleCards = await page.locator('[data-res]:visible').count();
  check('縣市選擇與服務類型篩選正常', s1.includes('臺中市') && pressed === 'true' && s2.includes('法律扶助') && visibleCards >= 1, `${s1} / ${s2}`);
  check('縣市篩選不改變網址', page.url() === `${ORIGIN}${BASE}city.html`);
  await page.goto(`${ORIGIN}${BASE}city.html#county=kinmen`);
  const fromHash = await page.inputValue('#county');
  check('首頁縣市入口可帶入縣市，且讀取後清除網址中的縣市', fromHash === 'kinmen' && !page.url().includes('kinmen'), page.url());

  // 搜尋
  await page.goto(`${ORIGIN}${BASE}search.html`);
  await page.fill('#q', '法律扶助');
  await page.waitForTimeout(300);
  const hits = await page.locator('[data-search-results] li').count();
  await page.fill('#q', '臺中');
  await page.waitForTimeout(300);
  const countyHits = await page.locator('[data-search-results] li').count();
  await page.fill('#q', '台中');
  await page.waitForTimeout(300);
  const countyHits2 = await page.locator('[data-search-results] li').count();
  await page.fill('#q', 'zzzz無此內容');
  await page.press('#q', 'Enter');
  await page.waitForTimeout(300);
  const emptyShown = await page.isVisible('[data-search-empty]');
  check('站內搜尋：機構、縣市（臺／台通用）可搜尋；無結果時提供分類入口', hits > 0 && countyHits > 0 && countyHits2 === countyHits && emptyShown, `法律扶助 ${hits} 筆、臺中 ${countyHits} 筆、台中 ${countyHits2} 筆`);
  check('搜尋文字不出現在網址中', page.url() === `${ORIGIN}${BASE}search.html`, page.url());

  // 首頁主視覺搜尋：結果以浮層顯示、最多 6 筆、不改變網址
  await page.goto(`${ORIGIN}${BASE}index.html`);
  await page.fill('#home-q', '心理');
  await page.waitForTimeout(300);
  const homeHits = await page.locator('.hero [data-search-results] li').count();
  const homeFirst = await page.getAttribute('.hero [data-search-results] li a', 'href');
  await page.press('#home-q', 'Escape');
  await page.waitForTimeout(200);
  const homeCleared = await page.locator('.hero [data-search-results] li').count();
  check('首頁主視覺搜尋：顯示結果（最多 6 筆）、Esc 清除、不改變網址', homeHits > 0 && homeHits <= 6 && !!homeFirst && homeCleared === 0 && page.url() === `${ORIGIN}${BASE}index.html`, `心理 ${homeHits} 筆`);

  // 學習與活動：過期活動隱藏（以頁面注入的模擬資料測試）
  await page.goto(`${ORIGIN}${BASE}learning.html`);
  const eventsOk = await page.evaluate(() => {
    const grid = document.querySelector('#events-title').closest('section').querySelector('.event-list');
    grid.innerHTML = '<article data-event-end="2000-01-01">old</article><article data-event-end="2999-12-31">new</article>';
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const [oldE, newE] = grid.querySelectorAll('article');
    return oldE.hidden === true && newE.hidden === false && document.getElementById('events-empty').hidden === true;
  });
  check('學習與活動：已結束活動自動隱藏、未結束活動保留', eventsOk);

  // 404：不存在的網址顯示 404 頁，且其連結可用
  const resp = await page.goto(`${ORIGIN}${BASE}no-such-page/deep.html`);
  const homeHref = await page.getAttribute('.notfound a.btn', 'href');
  check('不存在的網址回傳 404 頁，且回首頁連結正確', resp.status() === 404 && homeHref === `${BASE}index.html`);
  await ctx.close();

  // ---------- 4. 停用 JavaScript 時的基本可用性 ----------
  const noJs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const nj = await noJs.newPage();
  await nj.goto(`${ORIGIN}${BASE}index.html`);
  const navVisible = await nj.isVisible('#site-nav a[href="career.html"]');
  const switchHref = await nj.getAttribute('[data-switch-screen]', 'href');
  await nj.goto(`${ORIGIN}${BASE}city.html`);
  const allListed = await nj.locator('[data-res]').count();
  check('停用 JavaScript 時：導覽可見、切換畫面為一般連結、城市頁列出全部資源', navVisible && switchHref === site.switchScreenUrl && allListed > 0);
  await noJs.close();

  // ---------- 5. 減少動態效果 ----------
  const rm = await browser.newContext({ reducedMotion: 'reduce' });
  const rp = await rm.newPage();
  await rp.goto(`${ORIGIN}${BASE}index.html`);
  const anim = await rp.evaluate(() => getComputedStyle(document.querySelector('.fade-in')).animationName);
  check('遵守系統「減少動態效果」設定', anim === 'none', anim);
  await rm.close();
} finally {
  await browser.close();
  server.close();
}

// ---------- 6. 正式版不得公開未查核資料 ----------
if (existsSync(DIST_PROD)) {
  const leaks = [];
  for (const p of await listHtml(DIST_PROD)) {
    const html = await readFile(path.join(DIST_PROD, p), 'utf8');
    if (html.includes('待查核') && html.includes('badge-pending')) leaks.push(p);
    if (html.includes('preview-bar') || html.includes('noindex')) leaks.push(`${p}（預覽標記）`);
    if (html.includes('攝影素材待補')) leaks.push(`${p}（素材待補文字）`);
  }
  check('正式版（production）不包含「待查核」資料與預覽標記', leaks.length === 0, leaks.join('、'));
}

// ---------- 8. 攝影素材處理流程（以測試用圖片驗證，不會進入網站） ----------
{
  const { execFileSync } = await import('node:child_process');
  const { mkdtemp } = await import('node:fs/promises');
  const os = await import('node:os');
  let sharp = null;
  try { sharp = require('sharp'); } catch { /* 未安裝 sharp */ }
  if (!sharp) {
    check('攝影素材處理流程（需要 sharp，請先 npm install）', false, '找不到 sharp');
  } else {
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'mlm-photos-'));
    const originals = path.join(tmp, 'originals');
    const out = path.join(tmp, 'photos');
    const distTmp = path.join(tmp, 'dist');
    await (await import('node:fs/promises')).mkdir(originals, { recursive: true });
    // 測試用圖片：純色合成圖，並刻意寫入含 GPS 的 EXIF，確認輸出會移除
    await sharp({ create: { width: 3200, height: 1800, channels: 3, background: { r: 230, g: 214, b: 190 } } })
      .withExif({ IFD0: { Copyright: 'test' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '25/1 2/1 0/1' } })
      .jpeg().toFile(path.join(originals, 'home-hero.jpg'));
    const env = { ...process.env, PHOTO_ORIGINALS: originals, PHOTO_OUT: out };
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/images.mjs')], { env, stdio: 'pipe' });
    const gen = JSON.parse(await readFile(path.join(out, 'generated.json'), 'utf8'));
    const files = await readdir(out);
    const wideOk = gen['home-hero']?.wide?.widths?.includes(2400) && files.includes('home-hero-wide-2400.webp') && files.includes('home-hero-portrait-1200.jpg');
    const m = await sharp(path.join(out, 'home-hero-wide-1600.webp')).metadata();
    const ratioOk = Math.abs(m.width / m.height - 16 / 7) < 0.01;
    const exifGone = !(await sharp(path.join(out, 'home-hero-wide-1200.jpg')).metadata()).exif;
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs'), '--mode=preview', `--out=${distTmp}`], { env, stdio: 'pipe' });
    const html = await readFile(path.join(distTmp, 'index.html'), 'utf8');
    const pictureOk = /<picture class="photo[^"]*hero-photo[^"]*"><source media="\(max-width: 699px\)" type="image\/webp" srcset="assets\/photos\/home-hero-portrait-/.test(html) && html.includes('fetchpriority="high"') && existsSync(path.join(distTmp, 'assets/photos/home-hero-wide-800.webp'));
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs'), '--mode=production', `--out=${distTmp}-prod`], { env, stdio: 'pipe' });
    const prodHasUnchecked = existsSync(path.join(`${distTmp}-prod`, 'assets/photos/home-hero-wide-800.webp')) || (await readFile(path.join(`${distTmp}-prod`, 'index.html'), 'utf8')).includes('<picture');
    check('攝影素材流程：依比例裁切、輸出多尺寸 WebP＋JPEG、移除 EXIF／GPS、預覽版輸出響應式 <picture>（手機另用直幅裁切）', wideOk && ratioOk && exifGone && pictureOk, `寬幅比例 ${m.width}×${m.height}`);
    check('正式版不使用尚未「已檢查」的攝影素材', !prodHasUnchecked);
    await rm(tmp, { recursive: true, force: true });
    await rm(`${distTmp}-prod`, { recursive: true, force: true });
  }
}

// ---------- 7. 色彩對比（WCAG AA 4.5:1） ----------
{
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  // 依 src/assets/css/main.css 的實際文字／背景組合
  const pairs = [
    ['#3B342E', '#FAF6EF'], ['#3B342E', '#FFFDF9'], ['#3B342E', '#E9DFD0'], ['#3B342E', '#EFE6D8'],
    ['#6A5E54', '#FAF6EF'], ['#6A5E54', '#FFFDF9'], ['#6A5E54', '#F3EBDF'], ['#6A5E54', '#EFE6D8'], ['#6A5E54', '#F4E8D2'], ['#6A5E54', '#EEF1E8'],
    ['#8A5634', '#FAF6EF'], ['#8A5634', '#FFFDF9'], ['#8A5634', '#F3EBDF'], ['#A9532F', '#FFFDF9'],
    ['#FFFFFF', '#A9532F'], ['#FFFFFF', '#5E7358'], ['#4E6148', '#EEF1E8'], ['#8E4426', '#F2DDD0'], ['#5E7358', '#FFFDF9'],
  ];
  const low = pairs.map(([f, b]) => [f, b, ratio(f, b)]).filter(([, , r]) => r < 4.5);
  check('主要文字／背景配色對比 ≥ 4.5:1', low.length === 0, low.map(([f, b, r]) => `${f} on ${b} = ${r.toFixed(2)}`).join('；'));
}

const failedCount = results.filter((r) => !r.ok).length;
console.log(`\n共 ${results.length} 項，通過 ${results.length - failedCount} 項，失敗 ${failedCount} 項。`);
process.exit(failedCount ? 1 : 0);
