#!/usr/bin/env node
// 第一批四篇擴充文章（EXP-QA-01-20261017）的 QA 暫存模擬測試。
// 依 docs/FIRST-FOUR-EXPANSION-ARTICLES-EDITORIAL-QA-DECISION-2026-10-17.md：exp-01、exp-08 → 讀利；exp-11、exp-12 → 向光。
// 前置：npm test 已建好 dist-qa（真實佇列，四篇仍未開啟）。
// 本測試以 docs/QA-EXPANSION-STAGING-FIRST-FOUR-2026-10-17.json 建置獨立暫存版 dist-qa-staging-first-four，檢查：
//   一、暫存佇列與正式佇列、manifest 編輯決策一致；正式佇列四篇仍 importToQa=false／pending。
//   二、兩份 V2 已同步：exp-11 的平台欄位修正、exp-12 新增的科教館 2022 年來源。
//   三、四篇全文逐行出現、來源標題完整不截斷、分類、讀利／向光接續、搜尋索引、未核准標示與 noindex、正文只有一份。
//   四、原 36 篇與未受影響頁面與 dist-qa 完全相同；舊的未上線 slug 不出現。
//   五、320／375／390／1280px（Chromium，及 CI 中的 WebKit）無水平溢位、來源連結不超出畫面、讀利／向光卡片尺寸與原卡一致、搜尋可開啟。
// 設定 FIRST_FOUR_SCREENSHOTS=<資料夾> 時，另存 390／1280px 截圖供站主驗收（CI 不設定）。
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseExpansionArticle, extractSection, QA_EXPANSION_QUEUE } from '../scripts/lib/qa-expansion.mjs';
import { TOWARD_READING_SLUGS } from '../scripts/lib/toward-light-editorial.mjs';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const c of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/node22/lib/node_modules/playwright'].filter(Boolean)) {
    try { return require(c); } catch { /* 試下一個 */ }
  }
  console.error('找不到 Playwright。');
  process.exit(2);
}
const { chromium, webkit } = loadPlaywright();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGING = 'docs/QA-EXPANSION-STAGING-FIRST-FOUR-2026-10-17.json';
const DECISION = 'docs/FIRST-FOUR-EXPANSION-ARTICLES-EDITORIAL-QA-DECISION-2026-10-17.md';
const OUT = 'dist-qa-staging-first-four';
const SX = path.join(ROOT, OUT);
const IDS = ['exp-01', 'exp-08', 'exp-11', 'exp-12'];
const WANT = {
  'exp-01': { slug: 'exp-household-shared-budget', directory: 'readli', category: 'life-family', search: '家庭共同費用' },
  'exp-08': { slug: 'exp-personal-boundaries', directory: 'readli', category: 'health', search: '界線可以怎麼說清楚' },
  'exp-11': { slug: 'exp-choosing-open-courses', previous: 'exp-open-course-certificates', directory: 'toward', category: 'learning', search: '試學一小段' },
  'exp-12': { slug: 'exp-compare-everyday-experiments', previous: 'exp-reading-popular-science', directory: 'toward', category: 'learning', search: '生活實驗' },
};
const readJson = async (f) => JSON.parse(await readFile(path.join(ROOT, f), 'utf8'));
const site = await readJson('config/site.json');
const categories = await readJson('content/categories.json');
const staging = await readJson(STAGING);
const realQueue = await readJson(QA_EXPANSION_QUEUE);
const manifest = await readJson('docs/CONTENT-EXPANSION-22-ARTICLE-MANIFEST-2026-10-16.json');
const BASE = site.basePath;

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const read = (dir, f) => readFile(path.join(ROOT, dir, f), 'utf8');
async function listFiles(dir, prefix = '') {
  const out = [];
  for (const e of await readdir(dir)) {
    const full = path.join(dir, e);
    if ((await stat(full)).isDirectory()) out.push(...(await listFiles(full, `${prefix}${e}/`)));
    else out.push(`${prefix}${e}`);
  }
  return out;
}
const links = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
// 比對全文用：去掉標籤與所有空白
const plainHtml = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, '');
const plainMd = (line) => line.trim().replace(/^#{1,6}\s+/, '').replace(/^(?:-|\d+\.)\s+/, '').replace(/\*\*/g, '')
  .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1').replace(/\s+/g, '');

// ---------- 一、佇列與編輯決策 ----------
const queueProblems = [];
if (staging.stagingOnly !== true || staging.approvalStatus !== 'not-approved' || staging.resources.length !== 0) queueProblems.push('暫存佇列必須 stagingOnly、not-approved 且不含資源');
if (JSON.stringify(staging.articles.map((a) => a.id)) !== JSON.stringify(IDS)) queueProblems.push(`暫存佇列應只有 ${IDS.join('、')}`);
if (JSON.stringify(staging.sourceFiles) !== JSON.stringify(realQueue.sourceFiles)) queueProblems.push('暫存佇列 stopAt 與正式佇列不同');
const choice = manifest.currentStatus20261017?.firstQaEditorialChoice;
if (JSON.stringify(choice?.ids) !== JSON.stringify(IDS) || JSON.stringify(choice?.readingSections) !== JSON.stringify({ readli: ['exp-01', 'exp-08'], toward: ['exp-11', 'exp-12'] })) queueProblems.push('manifest 第一批選擇與本測試不同');
for (const id of IDS) {
  const s = staging.articles.find((a) => a.id === id);
  const r = realQueue.articles.find((a) => a.id === id);
  const m = manifest.newArticles.find((a) => a.id === id);
  const ed = m?.firstQaBatchEditorial;
  const w = WANT[id];
  if (!s || !r || !ed) { queueProblems.push(`${id} 缺少佇列或 manifest 資料`); continue; }
  for (const k of ['slug', 'title', 'category', 'sourceFile', 'heading', 'directory', 'previousUnpublishedSlug', 'related']) {
    if (JSON.stringify(s[k]) !== JSON.stringify(r[k])) queueProblems.push(`${id} ${k} 暫存與正式佇列不同`);
  }
  if (r.slug !== w.slug || r.slug !== ed.proposedSlug) queueProblems.push(`${id} slug ${r.slug} 與編輯決策 ${ed.proposedSlug} 不同`);
  if ((r.previousUnpublishedSlug || null) !== (ed.previousUnpublishedSlug || null) || (r.previousUnpublishedSlug || null) !== (w.previous || null)) queueProblems.push(`${id} 舊 slug 溯源不符`);
  if (r.directory !== w.directory || r.directory !== ed.directory || r.category !== w.category) queueProblems.push(`${id} 目錄／分類不符`);
  if (r.importToQa !== false || r.sourceCheck !== 'pending' || r.sourceCheckedOn !== null || r.sourceCheckRecord !== null) queueProblems.push(`${id} 正式佇列被開啟或標成已查核`);
  if (s.importToQa !== true || s.sourceCheck !== 'source-checked' || s.sourceCheckedOn !== '2026-10-17' || s.sourceCheckRecord !== DECISION) queueProblems.push(`${id} 暫存佇列匯入欄位不符`);
}
// 第二批五篇已由站主指示：B4 讀利，A1、A2、A4、B5 向光；正式佇列仍全部關閉；其餘 13 篇維持 none
const SECOND_BATCH = { A1: 'toward', A2: 'toward', A4: 'toward', B4: 'readli', B5: 'toward' };
const others = realQueue.articles.filter((a) => !IDS.includes(a.id));
if (others.some((a) => a.importToQa !== false)) queueProblems.push('第一批以外的文章被開啟');
if (others.some((a) => a.directory !== (SECOND_BATCH[a.id] || 'none'))) queueProblems.push('第一批以外的文章目錄不符（第二批 B4 readli、其餘四篇 toward，其他 none）');
check('佇列：暫存只含第一批四篇並與正式佇列欄位一致；exp-01／08 讀利、exp-11／12 向光且改用新 slug；正式佇列四篇仍 importToQa=false／pending，第二批五篇（B4 讀利、四篇向光）已定目錄但未開啟，其餘 13 篇維持 directory=none',
  queueProblems.length === 0, queueProblems.slice(0, 5).join('；'));

// ---------- 二、V2 同步 ----------
const v2a = await readFile(path.join(ROOT, 'docs/EXPANSION-BATCH10-SIX-REVISED-ARTICLES-V2-2026-10-17.md'), 'utf8');
const v2b = await readFile(path.join(ROOT, 'docs/EXPANSION-BATCH10-REMAINING-SIX-ARTICLES-V2-2026-10-17.md'), 'utf8');
const syncProblems = [];
if (!v2a.includes('頁面列出課程名稱、地區／縣市、出處單位、日期與報名／連結等欄位') || v2a.includes('可以依縣市、主題、時間和來源篩選')) syncProblems.push('exp-11 平台欄位修正未同步');
if (!v2b.includes('(https://www.ntsec.gov.tw/article/FileAtt.ashx?id=6193)')) syncProblems.push('exp-12 科教館 2022 年來源未同步');
check('V2 同步：exp-11 改為官網實際欄位敘述（不宣稱固定主題篩選）；exp-12 加上科教館《科學研習》2022 年來源', syncProblems.length === 0, syncProblems.join('；'));

// ---------- 三、暫存建置 ----------
execFileSync(process.execPath, ['scripts/build.mjs', '--mode=qa', `--out=${OUT}`], { cwd: ROOT, env: { ...process.env, QA_EXPANSION_QUEUE: STAGING }, stdio: 'pipe' });
let guarded = false;
try {
  execFileSync(process.execPath, ['scripts/build.mjs', '--mode=qa', '--out=dist-qa'], { cwd: ROOT, env: { ...process.env, QA_EXPANSION_QUEUE: STAGING }, stdio: 'pipe' });
} catch (e) { guarded = /暫存模擬佇列/.test(String(e.stderr)); }
check('部署隔離：暫存佇列不可建置到公開 QA 所用的 dist-qa', guarded);

const idx = await read(OUT, 'assets/data/search-index.js');
const LEAK = /QA 編輯狀態|本批編輯校核門檻|建議分類|建議閱讀入口|編輯對應|stopAt|sourceCheck|importToQa/;
const fileText = new Map();
const articleProblems = [];
const parsed = {};
for (const x of staging.articles) {
  const w = WANT[x.id];
  const file = `articles/${x.slug}.html`;
  if (!existsSync(path.join(SX, file))) { articleProblems.push(`${x.id} 沒有文章頁`); continue; }
  const html = await read(OUT, file);
  if (!fileText.has(x.sourceFile)) fileText.set(x.sourceFile, await readFile(path.join(ROOT, x.sourceFile), 'utf8'));
  const text = fileText.get(x.sourceFile);
  const stop = staging.sourceFiles[x.sourceFile]?.stopAt;
  const [{ raw }] = extractSection(text, x.heading, stop ? text.indexOf(stop) : -1);
  const a = parseExpansionArticle(x.id, raw);
  parsed[x.id] = a;
  const main = (/<article class="article">[\s\S]*?<\/article>/.exec(html) || [''])[0];
  const prose = plainHtml(main);
  // 全文：原稿每一行正文都要出現在頁面上
  for (const line of a.body.split('\n').filter((l) => l.trim())) {
    if (/^\|[\s:|-]+\|$/.test(line.trim())) continue;
    const cells = line.trim().startsWith('|') ? line.split('|').map(plainMd).filter(Boolean) : [plainMd(line)];
    if (cells.some((c) => !prose.includes(c))) { articleProblems.push(`${x.id} 頁面缺少：${line.trim().slice(0, 30)}`); break; }
  }
  // 來源：數量相同、標題完整（不因「|」或長度被截斷）、外部連結
  const srcBlock = (/<div class="sources"><h2>參考來源<\/h2>[\s\S]*?<\/div>/.exec(html) || [''])[0];
  const rendered = [...srcBlock.matchAll(/<li><a href="([^"]+)" class="ext" rel="noopener noreferrer">([^<]+)<\/a>/g)].map((m) => ({ url: decode(m[1]), title: decode(m[2]) }));
  if (rendered.length !== a.sources.length || a.sources.some((s, i) => rendered[i]?.url !== s.url || rendered[i]?.title !== s.title)) articleProblems.push(`${x.id} 參考來源 ${rendered.length}/${a.sources.length} 筆或標題被截斷`);
  const cat = categories.find((c) => c.id === w.category);
  if (!html.includes(`<h1>${x.title}</h1>`)) articleProblems.push(`${x.id} 標題不符`);
  if (!html.includes(`<a href="../${cat.slug}">${cat.title}</a>`) || !html.includes(`<span class="pill">${cat.title}</span>`)) articleProblems.push(`${x.id} 分類不符`);
  if (!html.includes('來源查核：2026-10-17（AI 編輯查核，尚未經網站擁有人核准）') || !html.includes('未核准測試內容') || !html.includes('<meta name="robots" content="noindex, nofollow">')) articleProblems.push(`${x.id} 缺少查核日期、未核准標示或 noindex`);
  if (LEAK.test(html)) articleProblems.push(`${x.id} 編輯用文字進入網頁`);
  if (!(await read(OUT, cat.slug)).includes(`href="articles/${x.slug}.html"`)) articleProblems.push(`${x.id} 分類頁沒有連結`);
  if (!idx.includes(`"title":"${x.title}"`) || !idx.includes(`"url":"articles/${x.slug}.html"`)) articleProblems.push(`${x.id} 不在搜尋索引`);
}
if (parsed['exp-12']?.sources.length !== 3 || !parsed['exp-12'].sources.some((s) => s.url.endsWith('FileAtt.ashx?id=6193'))) articleProblems.push('exp-12 前台來源未含科教館 2022 年參考');
if (!parsed['exp-11']?.body.includes('## 用公開官方入口延伸探索') || !parsed['exp-11'].body.includes('出處單位')) articleProblems.push('exp-11 前台未使用修正後段落');
check('四篇文章：全文逐行出現、標題與分類正確、參考來源筆數與標題完整（exp-12 共 3 筆）、查核日期、未核准標示、noindex、搜尋索引，編輯用註記不外露',
  articleProblems.length === 0, articleProblems.slice(0, 5).join('；'));

// 正文只生成一份：每篇第一段正文只出現在自己的文章頁
const dupProblems = [];
const htmlFiles = (await listFiles(SX)).filter((f) => f.endsWith('.html'));
const htmlCache = new Map();
for (const f of htmlFiles) htmlCache.set(f, plainHtml(await read(OUT, f)));
for (const x of staging.articles) {
  const paras = parsed[x.id].body.split(/\n\s*\n/).map((p) => plainMd(p.replace(/\n/g, ''))).filter((p) => p.length > 40 && !p.startsWith('|'));
  for (const p of paras.slice(1, 3)) {
    const where = htmlFiles.filter((f) => htmlCache.get(f).includes(p));
    if (where.length !== 1 || where[0] !== `articles/${x.slug}.html`) dupProblems.push(`${x.id} 段落出現在 ${where.join('、') || '無'}`);
  }
}
check('不重複正文：四篇各只有一份文章頁，讀利／向光／分類頁只連結不複製正文', dupProblems.length === 0, dupProblems.slice(0, 3).join('；'));

// 讀利／向光
const qaQp = await read('dist-qa', 'quiet-power.html');
const sxQp = await read(OUT, 'quiet-power.html');
const sxToward = await read(OUT, 'toward-light.html');
const qaToward = await read('dist-qa', 'toward-light.html');
const readliRe = /<h3><a href="articles\/([^"]+)\.html">/g;
const towardRe = /<article class="toward-reading-card">\s*<a href="articles\/([^"]+)\.html">/g;
const readliBefore = links(qaQp, readliRe);
const readliAfter = links(sxQp, readliRe);
const towardAfter = links(sxToward, towardRe);
const r = (id) => WANT[id].slug;
check('讀利：原 23 篇順序不變，exp-01、exp-08 接在最後；向光：原 13 篇與八索引不變，exp-11、exp-12 接在最後；兩目錄互不重複',
  readliBefore.length === 23 && JSON.stringify(readliAfter) === JSON.stringify([...readliBefore, r('exp-01'), r('exp-08')]) &&
  JSON.stringify(towardAfter) === JSON.stringify([...TOWARD_READING_SLUGS, r('exp-11'), r('exp-12')]) &&
  qaToward.match(/toward-panel"/g)?.length === sxToward.match(/toward-panel"/g)?.length &&
  !sxQp.includes(r('exp-11')) && !sxQp.includes(r('exp-12')) && !sxToward.includes(r('exp-01')) && !sxToward.includes(r('exp-08')),
  `讀利 ${readliAfter.length}、向光 ${towardAfter.length}`);

// ---------- 四、既有內容不變、舊 slug 不出現 ----------
const qaArticles = (await readdir(path.join(ROOT, 'dist-qa/articles'))).filter((f) => f.endsWith('.html'));
const changed = [];
for (const f of qaArticles) if ((await read('dist-qa', `articles/${f}`)) !== (await read(OUT, `articles/${f}`).catch(() => ''))) changed.push(f);
const sxArticles = (await readdir(path.join(SX, 'articles'))).filter((f) => f.endsWith('.html'));
for (const f of ['index.html', 'support.html', 'activities.html', 'search.html', 'city.html', 'career.html', 'law.html']) {
  if ((await read('dist-qa', f)) !== (await read(OUT, f))) changed.push(f);
}
check('既有內容：原 36 篇文章頁、首頁、支援、活動、搜尋頁及未收錄新篇的主題頁與 dist-qa 完全相同；暫存版共 40 篇',
  qaArticles.length === 36 && sxArticles.length === 40 && changed.length === 0, changed.slice(0, 5).join('、'));
const oldSlugHits = [];
for (const f of await listFiles(SX)) {
  if (!/\.(html|js|xml|txt)$/.test(f)) continue;
  const t = await read(OUT, f);
  for (const s of ['exp-open-course-certificates', 'exp-reading-popular-science']) if (t.includes(s)) oldSlugHits.push(`${f}：${s}`);
}
check('網址：exp-11、exp-12 只用新 slug，舊的未上線 slug 不出現在任何頁面、搜尋索引或網站地圖', oldSlugHits.length === 0, oldSlugHits.slice(0, 3).join('；'));

// ---------- 五、手機與電腦 ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (!p.startsWith(BASE)) { res.writeHead(404); return res.end(); }
  p = p.slice(BASE.length) || 'index.html';
  if (p.endsWith('/')) p += 'index.html';
  try { const body = await readFile(path.join(SX, p)); res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(4338, '127.0.0.1', ok));
const ORIGIN = 'http://127.0.0.1:4338';
const SHOTS = process.env.FIRST_FOUR_SCREENSHOTS;
if (SHOTS) await mkdir(SHOTS, { recursive: true });
const engines = [['Chromium', chromium]];
try { const b = await webkit.launch(); await b.close(); engines.push(['WebKit', webkit]); } catch { console.log('（本機沒有 WebKit，WebKit 版面由 CI 執行）'); }
try {
  for (const [name, engine] of engines) {
    const browser = await engine.launch();
    const problems = [];
    const jsErrors = [];
    for (const w of [320, 375, 390, 1280]) {
      const mobile = w < 700;
      const ctxB = await browser.newContext({ viewport: { width: w, height: 860 }, isMobile: name === 'Chromium' ? mobile : undefined, hasTouch: mobile });
      const page = await ctxB.newPage();
      page.on('pageerror', (e) => jsErrors.push(e.message));
      const pages = [...staging.articles.map((x) => `articles/${x.slug}.html`), 'quiet-power.html', 'toward-light.html', 'life-family.html', 'health.html', 'learning.html'];
      for (const f of pages) {
        await page.goto(`${ORIGIN}${BASE}${f}`);
        const m = await page.evaluate(() => ({
          o: document.documentElement.scrollWidth - innerWidth,
          fs: parseFloat(getComputedStyle(document.querySelector('.prose p') || document.body).fontSize),
          src: [...document.querySelectorAll('.sources a')].filter((a) => a.getBoundingClientRect().right > innerWidth + 1).length,
          tables: [...document.querySelectorAll('.prose table')].filter((t) => t.getBoundingClientRect().right > innerWidth + 1).length,
        }));
        if (m.o > 0) problems.push(`${w}px ${f} 水平溢位 ${m.o}px`);
        if (f.startsWith('articles/') && m.fs < 15) problems.push(`${w}px ${f} 內文 ${m.fs}px`);
        if (m.src || m.tables) problems.push(`${w}px ${f} 來源連結 ${m.src}、表格 ${m.tables} 超出畫面`);
        if (SHOTS && (w === 390 || w === 1280) && f.startsWith('articles/')) await page.screenshot({ path: path.join(SHOTS, `${name.toLowerCase()}-${w}-${path.basename(f, '.html')}.png`), fullPage: true });
      }
      // 讀利：新兩篇與原卡同樣是精簡清單、標題可觸控
      await page.goto(`${ORIGIN}${BASE}quiet-power.html`);
      const qp = await page.locator('.readli-reading .story-grid .story').evaluateAll((cards) => cards.map((c) => {
        const a = c.querySelector('h3 a');
        return { slug: a.getAttribute('href'), h: Math.round(c.getBoundingClientRect().height), w: Math.round(c.getBoundingClientRect().width), linkH: Math.round(a.getBoundingClientRect().height) };
      }));
      const qpNew = qp.slice(-2);
      if (qp.length !== 25 || !qpNew[0].slug.includes(r('exp-01')) || !qpNew[1].slug.includes(r('exp-08')) ||
          qpNew.some((c) => c.w !== qp[0].w || c.linkH < 44 || (mobile && (c.h < 75 || c.h >= 240)))) problems.push(`${w}px 讀利新卡 ${JSON.stringify(qpNew)}`);
      if (SHOTS && (w === 390 || w === 1280)) {
        await page.locator('.readli-reading .story-grid .story').nth(24).scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(SHOTS, `${name.toLowerCase()}-${w}-readli-tail.png`) });
      }
      // 向光：新兩張與原 13 張同寬、排列一致
      await page.goto(`${ORIGIN}${BASE}toward-light.html`);
      const tw = await page.locator('.toward-reading-card').evaluateAll((cards) => cards.map((c) => {
        const b = c.getBoundingClientRect();
        return { href: c.querySelector('a').getAttribute('href'), x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), linkH: Math.round(c.querySelector('a').getBoundingClientRect().height) };
      }));
      const twNew = tw.slice(-2);
      if (tw.length !== 15 || !twNew[0].href.includes(r('exp-11')) || !twNew[1].href.includes(r('exp-12')) ||
          twNew.some((c) => c.w !== tw[0].w || c.linkH < 44 || (mobile && (c.x !== tw[0].x || c.h < 106 || c.h >= 230)))) problems.push(`${w}px 向光新卡 ${JSON.stringify(twNew)}`);
      if (SHOTS && (w === 390 || w === 1280)) {
        await page.locator('.toward-reading-card').nth(13).scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(SHOTS, `${name.toLowerCase()}-${w}-toward-tail.png`) });
      }
      // 搜尋：每篇都能以標題關鍵字找到並開啟
      for (const x of staging.articles) {
        await page.goto(`${ORIGIN}${BASE}search.html`);
        await page.fill('[data-search] input', WANT[x.id].search);
        await page.waitForTimeout(150);
        const hit = page.locator(`[data-search-results] a[href$="articles/${x.slug}.html"]`);
        if (!(await hit.count())) { problems.push(`${w}px 搜尋「${WANT[x.id].search}」找不到 ${x.id}`); continue; }
        await hit.first().click();
        await page.waitForLoadState('domcontentloaded');
        if (!page.url().endsWith(`articles/${x.slug}.html`) || (await page.locator('h1').innerText()) !== x.title) problems.push(`${w}px 搜尋結果無法開啟 ${x.id}`);
      }
      await ctxB.close();
    }
    await browser.close();
    check(`${name} 320／375／390／1280px：四篇文章、讀利、向光及三個主題頁無水平溢位，內文 ≥ 15px，來源與表格不超出畫面；讀利／向光新卡與原卡尺寸一致、可觸控 ≥ 44px；搜尋可找到並開啟四篇；無 JavaScript 錯誤`,
      problems.length === 0 && jsErrors.length === 0, [...problems, ...jsErrors].slice(0, 5).join('；'));
  }
} finally {
  server.close();
}

const failed = results.filter((x) => !x.ok).length;
console.log(`\n第一批四篇 QA 暫存模擬：${results.length} 項，通過 ${results.length - failed}，失敗 ${failed}`);
process.exit(failed ? 1 : 0);
