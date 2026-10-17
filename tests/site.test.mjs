#!/usr/bin/env node
// 由己 SELF-AUTHORED 自動化測試：以模擬 GitHub Pages 的本機伺服器開啟建置結果，並用 Playwright（Chromium）逐頁檢查。
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
      // 延遲載入的圖片先改為立即載入，再確認每張都成功解碼
      const bad = await page.evaluate(async () => {
        // 捲動整頁，讓延遲載入的圖片依正常流程載入
        for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
        const imgs = [...document.images];
        await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.addEventListener('load', r); i.addEventListener('error', r); setTimeout(r, 8000); }))));
        return imgs.filter((i) => i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
      });
      brokenImages.push(...bad.map((s) => `${p}: ${s}`));
    }
    await ctx.close();
  }
  check(`所有 ${pages.length} 個頁面於 ${widths.join('/')}px 無水平溢位`, overflow.length === 0, overflow.slice(0, 5).join('；'));
  check('所有圖片正常載入（含延遲載入的照片）', brokenImages.length === 0, brokenImages.slice(0, 5).join('；'));
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
    const footer = (/<footer class="site-footer">[\s\S]*?<\/footer>/.exec(html) || [''])[0];
    if (!footer.includes('about.html') || !footer.includes('AI 生成') || !footer.includes('tel:110')) missingCommon.push(`${p} 頁尾缺少必要聲明或「關於由己」連結`);
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
  check('每頁都有切換畫面；頁尾有必要免責聲明、AI 圖像揭露與「關於由己」連結（完整免責與隱私說明在該頁）', missingCommon.length === 0, missingCommon.join('；'));
  const brandProblems = [];
  for (const p of [...pages, '404.html']) {
    const html = await readFile(path.join(DIST, p), 'utf8');
    if (/晨光生活誌|Morning Light|OWN WAY/i.test(html)) brandProblems.push(`${p} 仍有舊品牌名稱`);
    if (!/<title>[^<]*由己 SELF-AUTHORED[^<]*<\/title>/.test(html)) brandProblems.push(`${p} 標題缺少新品牌`);
    if (!html.includes('class="brand-name">由己<') || !html.includes('class="brand-en">SELF-AUTHORED<')) brandProblems.push(`${p} 頁首品牌標誌不完整`);
  }
  check('品牌：每頁標題與頁首皆為「由己 SELF-AUTHORED」，前台不再出現舊品牌名稱', brandProblems.length === 0, brandProblems.slice(0, 5).join('；'));
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

  // 切換畫面在手機各頁捲動到中段、底部，以及選單開啟時，都不需滑回頁首即可點擊
  {
    const problems = [];
    for (const pg of ['index.html', 'life-family.html', 'career.html', 'health.html', 'law.html', 'city.html', 'learning.html', 'support.html']) {
      await page.goto(`${ORIGIN}${BASE}${pg}`);
      for (const frac of [0, 0.5, 1]) {
        await page.evaluate((f) => window.scrollTo(0, (document.body.scrollHeight - window.innerHeight) * f), frac);
        await page.waitForTimeout(100);
        const ok = await page.evaluate(() => {
          const el = document.querySelector('[data-switch-screen]');
          if (!el) return false;
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return r.top >= 0 && r.bottom <= window.innerHeight && r.height >= 44 && !!hit && (hit === el || el.contains(hit));
        });
        if (!ok) problems.push(`${pg} 捲動 ${frac * 100}%`);
      }
    }
    await page.goto(`${ORIGIN}${BASE}index.html`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.tap('.menu-toggle');
    const visibleWithMenu = await page.isVisible('[data-switch-screen]');
    await page.tap('[data-switch-screen]');
    await page.waitForURL('https://www.google.com/**');
    check('切換畫面：手機版首頁、六大分類頁與求助頁在頂端／中段／底部及選單開啟時皆可直接點擊（高度 ≥ 44px）', problems.length === 0 && visibleWithMenu, problems.join('、'));
  }

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

  // ---------- V3.1：頁首雙目錄、支援資源入口、首頁精簡、快捷入口、有急事 ----------
  {
    const DIRS = [
      { href: 'quiet-power.html', zh: '讀利專欄', en: 'THE CONSIDERED PAGE' },
      { href: 'toward-light.html', zh: '向望', en: 'TOWARD OPEN SKIES' },
    ];
    // 1、2、11：手機頁首直接看到兩個目錄（中英文正確），且頁首元素不重疊、無水平溢位
    const headerProblems = [];
    for (const w of [320, 375, 390]) {
      const c = await browser.newContext({ viewport: { width: w, height: 760 }, isMobile: true, hasTouch: true });
      const pg = await c.newPage();
      for (const file of ['index.html', 'law.html', 'support.html', 'quiet-power.html']) {
        await pg.goto(`${ORIGIN}${BASE}${file}`);
        for (const scrollFrac of [0, 0.6, 'menu']) {
          if (scrollFrac === 'menu') { await pg.evaluate(() => window.scrollTo(0, 0)); await pg.tap('.menu-toggle'); }
          else await pg.evaluate((f) => window.scrollTo(0, (document.body.scrollHeight - innerHeight) * f), scrollFrac);
          await pg.waitForTimeout(80);
          const r = await pg.evaluate((dirs) => {
            // 以文字實際範圍（Range）量測，文字溢出元素框時也能偵測到重疊
            const box = (el) => {
              const rg = document.createRange();
              rg.selectNodeContents(el);
              const rects = [el.getBoundingClientRect(), rg.getBoundingClientRect()].filter((x) => x.width > 0);
              return { l: Math.min(...rects.map((x) => x.left)), r: Math.max(...rects.map((x) => x.right)), t: Math.min(...rects.map((x) => x.top)), b: Math.max(...rects.map((x) => x.bottom)) };
            };
            const els = {
              mark: document.querySelector('.site-header .brand-mark'),
              brand: document.querySelector('.site-header .brand-name'),
              brandEn: document.querySelector('.site-header .brand-en'),
              menu: document.querySelector('.menu-toggle'),
              sw: document.querySelector('[data-switch-screen]'),
              d0: document.querySelector(`.dir-nav a[href$="${dirs[0].href}"]`),
              d1: document.querySelector(`.dir-nav a[href$="${dirs[1].href}"]`),
            };
            const out = { missing: Object.keys(els).filter((k) => !els[k]) };
            if (out.missing.length) return out;
            const b = Object.fromEntries(Object.entries(els).map(([k, el]) => [k, box(el)]));
            const keys = Object.keys(b);
            out.overlaps = [];
            for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
              const A = b[keys[i]], B = b[keys[j]];
              if (A.l < B.r - 0.5 && B.l < A.r - 0.5 && A.t < B.b - 0.5 && B.t < A.b - 0.5) out.overlaps.push(`${keys[i]}×${keys[j]}`);
            }
            out.offscreen = keys.filter((k) => b[k].l < 0 || b[k].r > innerWidth || b[k].t < 0 || b[k].b > innerHeight);
            out.small = ['menu', 'sw', 'd0', 'd1'].filter((k) => b[k].b - b[k].t < 44);
            out.text = [0, 1].map((i) => [els[`d${i}`].querySelector('.dir-zh')?.textContent, els[`d${i}`].querySelector('.dir-en')?.textContent]);
            out.overflow = document.documentElement.scrollWidth - innerWidth;
            return out;
          }, DIRS);
          const where = `${w}px ${file}${scrollFrac === 'menu' ? ' 選單開啟' : scrollFrac ? ' 捲動後' : ''}`;
          if (r.missing?.length) { headerProblems.push(`${where} 缺少 ${r.missing.join('、')}`); continue; }
          if (r.overlaps.length) headerProblems.push(`${where} 重疊 ${r.overlaps.join('、')}`);
          if (r.offscreen.length) headerProblems.push(`${where} 超出畫面 ${r.offscreen.join('、')}`);
          if (r.small.length) headerProblems.push(`${where} 點擊區域不足 44px：${r.small.join('、')}`);
          if (r.overflow > 0) headerProblems.push(`${where} 水平溢位 ${r.overflow}px`);
          DIRS.forEach((d, i) => { if (r.text[i][0] !== d.zh || r.text[i][1] !== d.en) headerProblems.push(`${where} 目錄文字錯誤：${r.text[i].join(' ')}`); });
        }
      }
      await c.close();
    }
    check('頁首：手機 320／375／390px 不開選單即可看到「讀利專欄 THE CONSIDERED PAGE」「向望 TOWARD OPEN SKIES」與切換畫面；品牌文字、選單、切換畫面、兩個目錄互不重疊、不超出畫面、點擊區 ≥ 44px、無水平溢位（含捲動後與選單開啟時）', headerProblems.length === 0, headerProblems.slice(0, 6).join('；'));

    // 3、4：點擊兩個目錄前往正確頁面；兩個目錄頁都在前段提供同一個支援資源頁入口
    const dirProblems = [];
    for (const d of DIRS) {
      await page.goto(`${ORIGIN}${BASE}index.html`);
      await page.tap(`.dir-nav a[href="${d.href}"]`);
      await page.waitForURL(`**/${d.href}`);
      const info = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const entry = document.querySelector('.dir-head .support-entry');
        const firstSection = document.querySelector('main > .section');
        return {
          zh: h1?.querySelector('.dir-title-zh')?.textContent, en: h1?.querySelector('.dir-title-en')?.textContent,
          entryHref: entry?.getAttribute('href'), entryText: entry?.querySelector('strong')?.textContent,
          entryBeforeContent: !!entry && !!firstSection && (entry.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING) > 0,
          entryTop: entry ? entry.getBoundingClientRect().top + window.scrollY : Infinity,
          entryH: entry ? Math.round(entry.getBoundingClientRect().height) : 0,
          entryDesc: entry?.querySelector('small')?.textContent,
          entryIcon: !!entry?.querySelector('svg.support-entry-icon'),
          current: document.querySelector('.dir-nav [aria-current="page"]')?.getAttribute('href'),
        };
      });
      if (info.zh !== d.zh || info.en !== d.en) dirProblems.push(`${d.href} 標題 ${info.zh} ${info.en}`);
      if (info.entryHref !== 'support.html' || info.entryText !== '支援資源' || !info.entryBeforeContent) dirProblems.push(`${d.href} 支援資源入口不在頁面前段`);
      if (info.entryTop > 844 * 1.5) dirProblems.push(`${d.href} 支援資源入口位置過低（${Math.round(info.entryTop)}px）`);
      // V3.3：小型橫向入口——圖示＋標題＋一行說明，高度 44–72px（可點擊、不再像大型卡片）
      if (!info.entryIcon || info.entryDesc !== '查看正式求助專線與相關機構' || info.entryH < 44 || info.entryH > 72) dirProblems.push(`${d.href} 支援資源入口樣式不符（高 ${info.entryH}px）`);
      if (info.current !== d.href) dirProblems.push(`${d.href} 頁首未標示目前目錄`);
      await page.tap('.dir-head .support-entry');
      await page.waitForURL('**/support.html');
    }
    const supportPages = [];
    for (const f of pages) {
      const html = await readFile(path.join(DIST, f), 'utf8');
      if (/<h1[^>]*>支援資源<\/h1>/.test(html)) supportPages.push(f);
    }
    check('讀利專欄、向望：點擊頁首目錄前往正確頁面；兩頁前段都有小型「支援資源」入口（肌肉圖示、高度 44–72px），連往同一個既有支援資源頁（全站只有一個支援資源頁）', dirProblems.length === 0 && supportPages.length === 1 && supportPages[0] === 'support.html', [...dirProblems, `支援資源頁：${supportPages.join('、')}`].join('；'));

    // 頁首與手機選單不再有獨立的「支援資源」入口（只保留在讀利專欄與向望頁內）
    const navSupport = [];
    for (const f of pages) {
      const html = await readFile(path.join(DIST, f), 'utf8');
      const header = (/<header class="site-header">[\s\S]*?<\/header>/.exec(html) || [''])[0];
      if (header.includes('support.html')) navSupport.push(f);
    }
    check('頁首與手機選單：不再有獨立的「支援資源」入口（支援資源只從讀利專欄、向望頁內進入）', navSupport.length === 0, navSupport.join('、'));

    // 支援資源頁更名：主標題、瀏覽器標題、站內搜尋顯示名稱皆為「支援資源」，原有專線不變
    const sup = await readFile(path.join(DIST, 'support.html'), 'utf8');
    const idx = await readFile(path.join(DIST, 'assets/data/search-index.js'), 'utf8');
    const renameOk = sup.includes('<h1 id="page-title">支援資源</h1>') && sup.includes('<title>支援資源｜由己 SELF-AUTHORED</title>')
      && idx.includes('"title":"支援資源","text"') && !/支援資源與求助專線/.test(sup + idx)
      && ['tel:110', 'tel:119', 'tel:113', 'tel:1925'].every((t) => sup.includes(`href="${t}"`));
    check('支援資源頁：主標題、瀏覽器標題、搜尋名稱皆為「支援資源」，原有 110／119／113／1925 專線仍在', renameOk);

    // 5：原首頁移出的內容仍可從相關內頁抵達
    const movedProblems = [];
    const qp = await readFile(path.join(DIST, 'quiet-power.html'), 'utf8');
    const tl = await readFile(path.join(DIST, 'toward-light.html'), 'utf8');
    const about = await readFile(path.join(DIST, 'about.html'), 'utf8');
    // V3.3：兩篇使用指南不再公開，讀利專欄改為一行操作提示；全站不得留下文章連結或搜尋結果
    if (/編輯精選|href="articles\//.test(qp) || !qp.includes('class="dir-tip"')) movedProblems.push('讀利仍有使用指南卡片或缺少操作提示');
    for (const f of pages) if ((await readFile(path.join(DIST, f), 'utf8')).includes('href="articles/') || f.startsWith('articles/')) movedProblems.push(`${f} 仍有已撤下文章`);
    if (/"type":"文章"/.test(idx)) movedProblems.push('搜尋索引仍有已撤下文章');
    if ((qp.match(/class="need-list"/g) || []).length !== 1 || (qp.match(/class="need-no"/g) || []).length < 8) movedProblems.push('讀利缺少常見需求');
    if ((tl.match(/class="county-chip" href="city\.html#county=/g) || []).length !== 22) movedProblems.push('向望缺少 22 縣市入口');
    for (const name of ['台灣就業通', '衛生福利部社會及家庭署', '財團法人法律扶助基金會', '衛生福利部心理健康司']) if (!tl.includes(`<h3>${name}</h3>`)) movedProblems.push(`向望缺少官方資源 ${name}`);
    if (!tl.includes('href="learning.html"') || !tl.includes('href="learning.html#events-title"')) movedProblems.push('向望缺少學習與活動入口');
    for (const f of ['disclaimer.html', 'privacy.html', 'verification.html']) if (!about.includes(`href="${f}"`)) movedProblems.push(`關於由己缺少 ${f}`);
    check('原首頁內容仍可抵達：常見需求與操作提示→讀利專欄（使用指南卡片已撤下）；城市入口（22 縣市）、官方資源推薦、學習活動→向望；關於、免責、隱私、查核→關於由己', movedProblems.length === 0, movedProblems.join('；'));

    // 6：首頁六大主題卡全部可開啟
    const home = await readFile(path.join(DIST, 'index.html'), 'utf8');
    const catHrefs = [...home.matchAll(/<a class="cat-card" href="([^"]+)"/g)].map((m) => m[1]);
    const catOk = [];
    for (const h of catHrefs) {
      const resp = await page.goto(`${ORIGIN}${BASE}${h}`);
      if (resp.status() === 200) catOk.push(h);
    }
    const expectedCats = ['life-family.html', 'career.html', 'health.html', 'law.html', 'city.html', 'learning.html'];
    check('首頁六大主題卡：六張依序連到六個分類頁且皆可開啟', JSON.stringify(catHrefs) === JSON.stringify(expectedCats) && catOk.length === 6, catHrefs.join('、'));

    // 7：首頁底部快捷入口只有四個且順序正確
    const quick = [...home.matchAll(/<a class="quick[^"]*" href="([^"]+)">([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], zh: (/<span class="quick-zh">([^<]+)<\/span>/.exec(m[2]) || [])[1], en: (/<span class="quick-en">([^<]+)<\/span>/.exec(m[2]) || [])[1], inner: m[2] }));
    const quickOk = quick.length === 4
      && quick.map((q) => q.zh).join('|') === '有急事|讀利專欄|向望|關於由己'
      && quick[1].en === 'THE CONSIDERED PAGE' && quick[2].en === 'TOWARD OPEN SKIES'
      && quick.map((q) => q.href).join('|') === 'tel:110|quiet-power.html|toward-light.html|about.html';
    check('首頁快捷入口恰好 4 個，依序為：有急事、讀利專欄 THE CONSIDERED PAGE、向望 TOWARD OPEN SKIES、關於由己', quickOk, quick.map((q) => `${q.zh}→${q.href}`).join('、'));

    // 8、9：有急事只有手電筒圖示；為單一 tel:110 連結，不經過網站自製頁面或彈窗，畫面上不顯示電話號碼
    const urgent = quick[0] || { inner: '' };
    const urgentTag = (/<a class="quick quick-urgent"[^>]*>/.exec(home) || [''])[0];
    const svgs = (urgent.inner.match(/<svg/g) || []).length;
    const visibleText = urgent.inner.replace(/<span class="visually-hidden">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').trim();
    const attrsOk = urgentTag === '<a class="quick quick-urgent" href="tel:110">';
    const iconOk = svgs === 1 && urgent.inner.includes('icon-flashlight') && !/icon-(phone|bell|alarm)/.test(urgent.inner);
    const iconFile = await readFile(path.join(ROOT, 'src/icons/flashlight.svg'), 'utf8');
    const jsSrc = await readFile(path.join(ROOT, 'src/assets/js/main.js'), 'utf8');
    const jsIntercepts = /tel:|quick-urgent/.test(jsSrc);
    const ctxU = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const pu = await ctxU.newPage();
    let dialogs = 0; let navigatedHttp = 0; const telRequests = [];
    pu.on('dialog', async (dlg) => { dialogs++; await dlg.dismiss(); });
    pu.on('framenavigated', (fr) => { if (fr === pu.mainFrame() && /^http/.test(fr.url()) && !fr.url().endsWith('/index.html')) navigatedHttp++; });
    pu.on('request', (rq) => { if (rq.url().startsWith('tel:')) telRequests.push(rq.url()); });
    await pu.goto(`${ORIGIN}${BASE}index.html`);
    const beforeUrl = pu.url();
    await pu.tap('.quick-urgent').catch(() => null);
    await pu.waitForTimeout(800);
    const afterUrl = pu.url();
    const popups = ctxU.pages().length;
    await ctxU.close();
    const ctxN = await browser.newContext({ javaScriptEnabled: false });
    const pn = await ctxN.newPage();
    await pn.goto(`${ORIGIN}${BASE}index.html`);
    const noJsHref = await pn.getAttribute('.quick-urgent', 'href');
    await ctxN.close();
    check('有急事：只有一個原創手電筒圖示、畫面只顯示「有急事」三字（不顯示號碼）', iconOk && visibleText === '有急事' && /<svg/.test(iconFile), `圖示 ${svgs} 個，可見文字「${visibleText}」`);
    check('有急事：單一 <a href="tel:110">，無 target／onclick／JavaScript 攔截；點擊後沒有開啟網站頁面、新分頁或彈窗；停用 JavaScript 仍為 tel:110（未實際撥出）', attrsOk && !jsIntercepts && dialogs === 0 && navigatedHttp === 0 && afterUrl === beforeUrl && popups === 1 && noJsHref === 'tel:110', `標籤 ${urgentTag}；彈窗 ${dialogs}；網站頁面跳轉 ${navigatedHttp}；分頁 ${popups}`);
  }

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
  const noJsLocalEmpty = (await nj.isVisible('#local-empty')) ? (await nj.textContent('#local-empty')).trim() : '';
  check('停用 JavaScript 時：城市頁「在地服務」區塊顯示說明文字，不是空白標題', noJsLocalEmpty.length > 10, noJsLocalEmpty || '（空白）');
  await noJs.close();

  // ---------- 4-1. 無障礙基本檢查：語言、標題、替代文字、表單標籤、跳到主要內容、鍵盤焦點 ----------
  const a11yProblems = [];
  for (const p of [...pages, '404.html']) {
    const html = await readFile(path.join(DIST, p), 'utf8');
    if (!html.includes(`<html lang="${site.lang}"`)) a11yProblems.push(`${p} 缺少 lang`);
    const h1 = (html.match(/<h1[\s>]/g) || []).length;
    if (h1 !== 1) a11yProblems.push(`${p} 有 ${h1} 個 h1`);
    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="/.test(tag)) a11yProblems.push(`${p} 圖片缺少 alt：${tag.slice(0, 60)}`);
    for (const [tag, id] of html.matchAll(/<(?:select|input)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
      if (!html.includes(`for="${id}"`) && !/aria-label(ledby)?="/.test(tag)) a11yProblems.push(`${p} 表單欄位 #${id} 沒有標籤`);
    }
    if (!/<a class="skip-link" href="#main">/.test(html) || !html.includes('<main id="main"')) a11yProblems.push(`${p} 缺少「跳到主要內容」或 main`);
  }
  check('無障礙基本檢查：每頁有 lang、恰好一個 h1、圖片皆有 alt、表單欄位皆有標籤、有「跳到主要內容」', a11yProblems.length === 0, a11yProblems.slice(0, 6).join('；'));
  const kb = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const kp = await kb.newPage();
  await kp.goto(`${ORIGIN}${BASE}index.html`);
  await kp.keyboard.press('Tab');
  const firstFocus = await kp.evaluate(() => ({ cls: document.activeElement.className, top: document.activeElement.getBoundingClientRect().top }));
  await kp.keyboard.press('Enter');
  const afterSkip = await kp.evaluate(() => document.activeElement.id);
  await kp.keyboard.press('Tab');
  const ring = await kp.evaluate(() => { const el = document.activeElement; const s = getComputedStyle(el.closest('.search-form') || el); return { tag: el.tagName, outline: s.outlineStyle, width: s.outlineWidth }; });
  await kb.close();
  check('鍵盤操作：第一個 Tab 是可見的「跳到主要內容」，按 Enter 後焦點移到主要內容，之後的焦點有可見外框', firstFocus.cls === 'skip-link' && firstFocus.top >= 0 && afterSkip === 'main' && ring.outline !== 'none' && parseFloat(ring.width) >= 2, `第一個焦點 ${firstFocus.cls}，跳轉後 #${afterSkip}，下一個 ${ring.tag} 外框 ${ring.outline} ${ring.width}`);

  // ---------- 4-2. 手機最終檢查發現的兩個問題（2026-10-15）：主題索引連結點擊區、320px 分類卡標題斷行 ----------
  const tapCtx = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
  const tp = await tapCtx.newPage();
  const smallLinks = [];
  for (const cat of ['life-family', 'career', 'health', 'law', 'city', 'learning']) {
    await tp.goto(`${ORIGIN}${BASE}${cat}.html`);
    const hs = await tp.$$eval('.topic-links a', (as) => as.map((a) => Math.round(a.getBoundingClientRect().height)));
    for (const h of hs) if (h < 44) smallLinks.push(`${cat} ${h}px`);
  }
  await tp.goto(`${ORIGIN}${BASE}index.html`);
  const wrapped = await tp.$$eval('.cat-title', (ts) => ts.filter((t) => {
    const r = document.createRange(); r.selectNodeContents(t.lastElementChild || t);
    return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size > 1;
  }).map((t) => t.textContent.trim()));
  await tapCtx.close();
  check('手機：分類頁「主題索引」的機構連結點擊高度 ≥ 44px；320px 首頁六張分類卡標題不在字中斷行', smallLinks.length === 0 && wrapped.length === 0, [...smallLinks.slice(0, 3), ...wrapped].join('、'));

  // ---------- 5a. 首頁主視覺文字與照片的實際對比 ----------
  {
    let sharpLib = null;
    try { sharpLib = require('sharp'); } catch { /* 未安裝 */ }
    const lum = (r, g, b) => {
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const results5a = [];
    for (const [w, h] of [[768, 1024], [1024, 768], [1100, 800], [1200, 800], [1280, 900], [1440, 900], [1920, 1080], [390, 844]]) {
      const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
      const pg = await c.newPage();
      await pg.goto(`${ORIGIN}${BASE}index.html`, { waitUntil: 'load' });
      await pg.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.addEventListener('load', r); i.addEventListener('error', r); setTimeout(r, 8000); })))));
      // 以文字實際佔用的範圍（逐行）計算，而非整個區塊寬度
      const boxes = await pg.evaluate(() => ['.hero-kicker', '.hero h1', '.hero-lead'].flatMap((sel) => {
        const el = document.querySelector(sel);
        const range = document.createRange();
        range.selectNodeContents(el);
        const color = getComputedStyle(el).color;
        return [...range.getClientRects()].filter((r) => r.width > 4).map((r) => ({ sel, x: r.x, y: r.y, w: r.width, h: r.height, color }));
      }));
      await pg.evaluate(() => document.querySelectorAll('.hero-copy > :not(.search-box)').forEach((el) => { el.style.visibility = 'hidden'; }));
      // 截取整頁（文字在照片下方時可能超出第一屏），確保量測範圍一定有被截到
      const shot = await pg.screenshot({ fullPage: true });
      const { data, info } = await sharpLib(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      for (const sel of ['.hero-kicker', '.hero h1', '.hero-lead']) {
        if (!boxes.some((b) => b.sel === sel)) results5a.push({ where: `${w}px ${sel}（找不到文字範圍）`, ratio: NaN, large: false });
      }
      for (const b of boxes) {
        const [tr, tg, tb] = b.color.match(/\d+/g).map(Number);
        const lt = lum(tr, tg, tb);
        const ls = [];
        for (let y = Math.max(0, Math.floor(b.y)); y < Math.min(info.height, b.y + b.h); y += 2) {
          for (let x = Math.max(0, Math.floor(b.x)); x < Math.min(info.width, b.x + b.w); x += 2) {
            const i = (y * info.width + x) * 3;
            ls.push(lum(data[i], data[i + 1], data[i + 2]));
          }
        }
        ls.sort((a, z) => a - z);
        const inside = b.x >= 0 && b.y >= 0 && b.x + b.w <= info.width && b.y + b.h <= info.height;
        const darkest = inside && ls.length ? ls[Math.floor(ls.length * 0.02)] : NaN; // 排除極少數雜訊後，最暗的背景；量不到即視為失敗
        results5a.push({ where: `${w}px ${b.sel}（右緣 ${Math.round(b.x + b.w)}px）`, ratio: (darkest + 0.05) / (lt + 0.05), large: b.sel === '.hero h1' });
      }
      await c.close();
    }
    // 無法量測（NaN）一律視為不通過，避免空白量測被誤判為通過
    const low5a = results5a.filter((r) => !Number.isFinite(r.ratio) || r.ratio < (r.large ? 3 : 4.5));
    const worst = results5a.reduce((m, r) => (!Number.isFinite(r.ratio) || r.ratio < m.ratio ? r : m));
    check('首頁主視覺文字疊在照片上的實際對比（以最暗 2% 背景計算）：標題 ≥ 3:1、其他文字 ≥ 4.5:1', low5a.length === 0, `最低 ${worst.where} = ${worst.ratio.toFixed(2)}${low5a.length ? '；不足：' + low5a.map((r) => `${r.where} ${r.ratio.toFixed(2)}`).join('、') : ''}`);
  }

  // ---------- 5b. 手機版圖片下載量 ----------
  {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
    const pg = await c.newPage();
    let bytes = 0;
    let biggest = { url: '', size: 0 };
    pg.on('response', async (r) => {
      if (r.request().resourceType() !== 'image') return;
      const len = (await r.body().catch(() => Buffer.alloc(0))).length;
      bytes += len;
      if (len > biggest.size) biggest = { url: r.url().split('/').pop(), size: len };
    });
    await pg.goto(`${ORIGIN}${BASE}index.html`, { waitUntil: 'networkidle' });
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    await pg.waitForLoadState('networkidle');
    await c.close();
    check('手機首頁（2 倍解析度、捲動到底）圖片總下載量 ≤ 1.5 MB，單張 ≤ 300 KB', bytes <= 1.5 * 1024 * 1024 && biggest.size <= 300 * 1024, `總計 ${(bytes / 1024).toFixed(0)} KB，最大 ${biggest.url} ${(biggest.size / 1024).toFixed(0)} KB`);
  }

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
