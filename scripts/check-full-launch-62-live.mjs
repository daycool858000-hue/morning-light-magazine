// 完整首發 62 篇隔離預覽（youji-topic54-preview/full-launch-62/）部署後檢查，只讀取網頁、不修改任何網站。
// 用法：node scripts/check-full-launch-62-live.mjs <origin> [chromium|webkit]
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/');
const playwright = require('playwright');
const origin = process.argv[2] || 'https://daycool858000-hue.github.io';
const engine = process.argv[3] === 'webkit' ? 'webkit' : 'chromium';
const BASE = `${origin}/youji-topic54-preview/full-launch-62/`;
const ROOTSITE = `${origin}/youji-topic54-preview/`;
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ' — ' + detail : ''}`); };

console.log(`瀏覽器：${engine}｜網址：${BASE}`);
const browser = await playwright[engine].launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const bad = [];
page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });

// 1. 從首頁爬全部站內頁面
const seen = new Set(); const queue = [BASE + 'index.html']; const pages = [];
const brokenLinks = [];
while (queue.length) {
  const url = queue.shift(); if (seen.has(url)) continue; seen.add(url);
  const resp = await page.goto(url, { waitUntil: 'load' });
  if (!resp || resp.status() !== 200) { brokenLinks.push(`${resp?.status()} ${url}`); continue; }
  const info = await page.evaluate(() => ({
    links: [...document.querySelectorAll('a[href]')].map((a) => a.href),
    noindex: !!document.querySelector('meta[name="robots"][content*="noindex"]'),
    qaBar: document.body.innerText.includes('未核准測試內容'),
    css: getComputedStyle(document.body).fontFamily !== '' && [...document.styleSheets].some((s) => { try { return s.cssRules.length > 50; } catch { return false; } }),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    pending: document.body.innerText.includes('編輯草稿：來源與資料尚待複核'),
  }));
  // 圖片：捲到底讓 lazy 圖片載入
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } });
  await page.waitForTimeout(150);
  const brokenImgs = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).map((i) => i.currentSrc));
  pages.push({ url, ...info, brokenImgs });
  for (const l of info.links) {
    const u = new URL(l); u.hash = '';
    const s = u.toString();
    if (s.startsWith(BASE) && /\.html$|\/$/.test(u.pathname) && !seen.has(s)) queue.push(s.endsWith('/') ? s + 'index.html' : s);
    else if (u.origin === origin && !s.startsWith(BASE)) brokenLinks.push(`跳出子資料夾 ${s} ← ${url}`);
  }
}
const arts = pages.filter((p) => p.url.includes('/articles/'));
check('站內頁面全部 200、無跳出子資料夾的連結', brokenLinks.length === 0, `${pages.length} 頁${brokenLinks.length ? '；' + brokenLinks.slice(0, 5).join('｜') : ''}`);
check('文章頁 62 篇', arts.length === 62, String(arts.length));
check('撤稿 exp-12 未恢復', !pages.some((p) => p.url.includes('compare-everyday')));
check('13 篇標示待複核', arts.filter((p) => p.pending).length === 13, String(arts.filter((p) => p.pending).length));
check('每頁 noindex', pages.every((p) => p.noindex));
check('每頁「未核准測試內容」', pages.every((p) => p.qaBar));
check('每頁 CSS 已套用', pages.every((p) => p.css), pages.filter((p) => !p.css).map((p) => p.url).join(' '));
check('375px 無左右溢位', pages.every((p) => p.overflow <= 0), pages.filter((p) => p.overflow > 0).map((p) => `${p.url}:${p.overflow}`).join(' '));
check('圖片全部載入', pages.every((p) => p.brokenImgs.length === 0), pages.flatMap((p) => p.brokenImgs).slice(0, 5).join(' '));
check('靜態資源無 4xx', bad.length === 0, bad.slice(0, 5).join(' '));
for (const hub of ['life-family', 'career', 'health', 'law', 'city', 'learning']) check(`分類頁 ${hub}`, pages.some((p) => p.url.endsWith(`/${hub}.html`)));

// 2. 讀利／向望數量、活動與入口
await page.goto(BASE + 'quiet-power.html');
const ql = await page.evaluate(() => new Set([...document.querySelectorAll('main a[href*="articles/"]')].map((a) => a.pathname)).size);
await page.goto(BASE + 'toward-light.html');
const tl = await page.evaluate(() => new Set([...document.querySelectorAll('main a[href*="articles/"]')].map((a) => a.pathname)).size);
check('讀利 38 篇／向望 24 篇', ql === 38 && tl === 24, `${ql}／${tl}`);
await page.goto(BASE + 'activities.html');
const act = await page.evaluate(() => ({ notices: document.querySelectorAll('.notice').length, cal: !!document.querySelector('.act-entry') }));
check('活動頁 9 場活動＋小日曆', act.notices === 9 && act.cal, JSON.stringify(act));

// 3. 搜尋
await page.goto(BASE + 'search.html');
const input = page.locator('input[type="search"]').first();
await input.fill('勞保');
await page.waitForTimeout(500);
const hits = await page.evaluate(() => [...document.querySelectorAll('main a[href]')].filter((a) => a.closest('[id*="result"],[class*="result"]')).map((a) => a.href));
check('搜尋有結果且連結在子資料夾內', hits.length > 0 && hits.filter((h) => h.startsWith(origin)).every((h) => h.startsWith(BASE)), `${hits.length} 筆`);
if (hits[0]?.startsWith(BASE)) { const r = await page.goto(hits[0]); check('搜尋結果可開啟', r.status() === 200, hits[0]); }

// 4. 原 54 主題網站
const r0 = await page.goto(ROOTSITE);
const rootInfo = await page.evaluate(() => ({ title: document.title, bar: document.querySelector('.qa-bar')?.innerText.slice(0, 40) }));
check('原 54 主題首頁仍正常', r0.status() === 200 && !page.url().includes('full-launch-62'), JSON.stringify(rootInfo));
await browser.close();
const fails = results.filter((x) => !x).length;
console.log(fails ? `\n${fails} 項未通過` : `\n全部 ${results.length} 項通過`);
process.exit(fails ? 1 : 0);
