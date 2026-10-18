#!/usr/bin/env node
// 九篇擴充文章＋PR #10 官方查詢入口的整合 QA 暫存模擬測試。
// 依 docs/NINE-ARTICLE-QA-STAGING-SOURCE-REVIEW-2026-10-17.md：
//   第一批 exp-01、exp-08 → 讀利；exp-11、exp-12 → 向光；
//   第二批 B4 → 讀利；A1、A2、A4、B5 → 向光。A1、B5 先前的待修理由已由
//   docs/EXPANSION-A1-B5-B4-INDEPENDENT-PRIMARY-SOURCE-RECHECK-2026-10-17.md 的獨立原始來源複核撤銷，九篇全部在暫存開啟（45 篇）。
// 前置：npm test 已建好 dist-qa（真實佇列，九篇全部未開啟）。
// 本測試以 docs/QA-EXPANSION-STAGING-NINE-2026-10-17.json 建置獨立暫存版 dist-qa-staging-nine，檢查：
//   一、暫存佇列與正式佇列欄位一致；正式佇列九篇仍 importToQa=false／pending；查核紀錄不再保留已撤銷的待修理由。
//   二、九篇全文逐行出現、來源筆數／標題／網址完整、分類、查核日期、未核准標示、noindex、搜尋索引，編輯用註記不外露；
//       A1 第三輪、B4 第二輪的最新用字（非政府網域標示、自行訂製服裝）確實出現。
//   三、舊的未上線 slug 不出現在任何頁面、搜尋索引或網站地圖；正式版與公開 QA 建置不含九篇。
//   四、讀利 23→26、向光 13→19 且八索引不變；原 36 篇與未受影響頁面和 dist-qa 完全相同。
//   五、PR #10 的 11 筆文字入口與 act-09 同網址沿用在整合後仍正確，沒有重複建卡。
//   六、320／375／390／1280px（Chromium，及 CI 中的 WebKit）無水平溢位、來源不超出畫面、搜尋可開啟。
// 設定 NINE_SCREENSHOTS=<資料夾> 時，另存 390／1280px 截圖供站主驗收（CI 不設定）。
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseExpansionArticle, extractSection, QA_EXPANSION_QUEUE } from '../scripts/lib/qa-expansion.mjs';
import { QA_PORTAL_CATEGORY } from '../scripts/lib/qa-portal-routing.mjs';
import { TOWARD_READING_SLUGS } from '../scripts/lib/toward-light-editorial.mjs';
import { ACTIVITIES_FILE } from '../scripts/lib/qa-activities.mjs';

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
const STAGING = 'docs/QA-EXPANSION-STAGING-NINE-2026-10-17.json';
const REVIEW = 'docs/NINE-ARTICLE-QA-STAGING-SOURCE-REVIEW-2026-10-17.md';
const DECISION = 'docs/FIRST-FOUR-EXPANSION-ARTICLES-EDITORIAL-QA-DECISION-2026-10-17.md';
const OUT = 'dist-qa-staging-nine';
const SX = path.join(ROOT, OUT);
const IDS = ['exp-01', 'exp-08', 'exp-11', 'exp-12', 'A1', 'A2', 'A4', 'B4', 'B5'];
const RECHECK = 'docs/EXPANSION-A1-B5-B4-INDEPENDENT-PRIMARY-SOURCE-RECHECK-2026-10-17.md';
// 暫存預期：slug、目錄、分類、搜尋關鍵字（關鍵字取自各篇標題，用來驗證搜尋找得到）
const WANT = {
  'exp-01': { slug: 'exp-household-shared-budget', directory: 'readli', category: 'life-family', search: '家庭共同費用' },
  'exp-08': { slug: 'exp-personal-boundaries', directory: 'readli', category: 'health', search: '界線可以怎麼說清楚' },
  'exp-11': { slug: 'exp-choosing-open-courses', directory: 'toward', category: 'learning', search: '試學一小段' },
  'exp-12': { slug: 'exp-compare-everyday-experiments', directory: 'toward', category: 'learning', search: '生活實驗' },
  A1: { slug: 'exp-women-center-courses', directory: 'toward', category: 'learning', search: '婦女中心有什麼課' },
  A2: { slug: 'exp-family-education-adults', directory: 'toward', category: 'life-family', search: '成年家人' },
  A4: { slug: 'exp-local-events-formats', directory: 'toward', category: 'learning', search: '展覽、講座與工作坊' },
  B4: { slug: 'exp-clothing-labels', directory: 'readli', category: 'life-family', search: '衣物成分與洗標' },
  B5: { slug: 'exp-ai-answer-verification', directory: 'toward', category: 'learning', search: '來源仍要自己打開' },
};
const READLI_NEW = ['exp-01', 'exp-08', 'B4'];
const TOWARD_NEW = ['exp-11', 'exp-12', 'A1', 'A2', 'A4', 'B5'];

const readJson = async (f) => JSON.parse(await readFile(path.join(ROOT, f), 'utf8'));
const site = await readJson('config/site.json');
const categories = await readJson('content/categories.json');
const staging = await readJson(STAGING);
const realQueue = await readJson(QA_EXPANSION_QUEUE);
const portals = await readJson(ACTIVITIES_FILE);
const BASE = site.basePath;
const enabled = staging.articles.filter((a) => a.importToQa === true);

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
const plainHtml = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, '');
const plainMd = (line) => line.trim().replace(/^#{1,6}\s+/, '').replace(/^(?:-|\d+\.)\s+/, '').replace(/\*\*/g, '')
  .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1').replace(/\s+/g, '');

// ---------- 一、佇列一致性與發布界線 ----------
const queueProblems = [];
if (staging.stagingOnly !== true || staging.approvalStatus !== 'not-approved' || staging.resources.length !== 0) queueProblems.push('暫存佇列必須 stagingOnly、not-approved 且不含資源');
if (JSON.stringify(staging.articles.map((a) => a.id)) !== JSON.stringify(IDS)) queueProblems.push(`暫存佇列應依序含 ${IDS.join('、')}`);
if (JSON.stringify(staging.sourceFiles) !== JSON.stringify(realQueue.sourceFiles)) queueProblems.push('暫存佇列 stopAt 與正式佇列不同');
for (const id of IDS) {
  const s = staging.articles.find((a) => a.id === id);
  const r = realQueue.articles.find((a) => a.id === id);
  const w = WANT[id];
  if (!s || !r) { queueProblems.push(`${id} 缺少佇列資料`); continue; }
  for (const k of ['slug', 'title', 'category', 'sourceFile', 'heading', 'directory', 'previousUnpublishedSlug', 'related']) {
    if (JSON.stringify(s[k]) !== JSON.stringify(r[k])) queueProblems.push(`${id} ${k} 暫存與正式佇列不同`);
  }
  if (r.slug !== w.slug || r.directory !== w.directory || r.category !== w.category) queueProblems.push(`${id} slug／目錄／分類與本測試預期不符`);
  // 正式佇列（公開 QA 部署唯一讀取的檔）九篇一律維持關閉
  if (r.importToQa !== false || r.sourceCheck !== 'pending' || r.sourceCheckedOn !== null || r.sourceCheckRecord !== null) queueProblems.push(`${id} 正式佇列被開啟或標成已查核`);
  const record = id.startsWith('exp-') ? DECISION : REVIEW;
  if (s.importToQa !== true || s.sourceCheck !== 'source-checked' || s.sourceCheckedOn !== '2026-10-17' || s.sourceCheckRecord !== record || 'stagingBlocker' in s) queueProblems.push(`${id} 暫存佇列匯入欄位不符`);
}
const others = realQueue.articles.filter((a) => !IDS.includes(a.id));
if (others.length !== 13 || others.some((a) => a.directory !== 'none' || a.importToQa !== false)) queueProblems.push('九篇以外的 13 篇被指定目錄或開啟');
for (const f of [REVIEW, RECHECK]) if (!existsSync(path.join(ROOT, f))) queueProblems.push(`缺少 ${f}`);
// 已被官方原文推翻的舊判斷不可再當成待修理由保留
const reviewText = existsSync(path.join(ROOT, REVIEW)) ? await readFile(path.join(ROOT, REVIEW), 'utf8') : '';
if (!reviewText.includes(RECHECK) || /不進本輪暫存|建議改為「洗標規定自 2023-05-18 施行」/.test(reviewText)) queueProblems.push('來源查核紀錄仍保留已撤銷的待修理由或未引用獨立複核');
check('佇列：暫存依序含九篇且全部開啟、欄位與正式佇列一致（B4 讀利，A1／A2／A4／B5 向光）；查核紀錄引用獨立複核並撤銷舊待修理由；正式佇列九篇仍 importToQa=false／pending，其餘 13 篇維持 directory=none',
  queueProblems.length === 0, queueProblems.slice(0, 5).join('；'));

// ---------- 二、暫存建置與九篇內容 ----------
execFileSync(process.execPath, ['scripts/build.mjs', '--mode=qa', `--out=${OUT}`], { cwd: ROOT, env: { ...process.env, QA_EXPANSION_QUEUE: STAGING }, stdio: 'pipe' });
let guarded = false;
try {
  execFileSync(process.execPath, ['scripts/build.mjs', '--mode=qa', '--out=dist-qa'], { cwd: ROOT, env: { ...process.env, QA_EXPANSION_QUEUE: STAGING }, stdio: 'pipe' });
} catch (e) { guarded = /暫存模擬佇列/.test(String(e.stderr)); }
check('部署隔離：暫存佇列不可建置到公開 QA 所用的 dist-qa', guarded);

const idx = await read(OUT, 'assets/data/search-index.js');
const LEAK = /QA 編輯狀態|本批編輯校核門檻|建議分類|建議歸類|建議閱讀入口|編輯對應|候選，未核准|stopAt|sourceCheck|importToQa|stagingBlocker/;
const fileText = new Map();
const articleProblems = [];
const parsed = {};
for (const x of enabled) {
  const w = WANT[x.id];
  const file = `articles/${x.slug}.html`;
  if (!existsSync(path.join(SX, file))) { articleProblems.push(`${x.id} 沒有文章頁`); continue; }
  const html = await read(OUT, file);
  if (!fileText.has(x.sourceFile)) fileText.set(x.sourceFile, await readFile(path.join(ROOT, x.sourceFile), 'utf8'));
  const text = fileText.get(x.sourceFile);
  const stop = staging.sourceFiles[x.sourceFile]?.stopAt;
  const found = extractSection(text, x.heading, stop ? text.indexOf(stop) : -1);
  if (found.length !== 1) { articleProblems.push(`${x.id} 原稿中找到 ${found.length} 篇同編號文章`); continue; }
  const a = parseExpansionArticle(x.id, found[0].raw);
  parsed[x.id] = a;
  if (a.problems.length) articleProblems.push(`${x.id} 解析問題：${a.problems[0]}`);
  if (found[0].title !== x.title) articleProblems.push(`${x.id} 原稿標題與佇列不同`);
  const prose = plainHtml(html);
  // 全文：原稿每一行正文都要出現在頁面上
  for (const line of a.body.split('\n').filter((l) => l.trim())) {
    if (/^\|[\s:|-]+\|$/.test(line.trim())) continue;
    const cells = line.trim().startsWith('|') ? line.split('|').map(plainMd).filter(Boolean) : [plainMd(line)];
    if (cells.some((c) => !prose.includes(c))) { articleProblems.push(`${x.id} 頁面缺少：${line.trim().slice(0, 30)}`); break; }
  }
  // 來源：筆數相同、標題完整、順序一致
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
// 九篇來源筆數合計 23 個不同網址（與連結檢查 --set=expansion9 相同）
const SRC_COUNT = { 'exp-01': 1, 'exp-08': 2, 'exp-11': 2, 'exp-12': 3, A1: 6, A2: 3, A4: 2, B4: 2, B5: 2 };
for (const [id, n] of Object.entries(SRC_COUNT)) if (parsed[id]?.sources.length !== n) articleProblems.push(`${id} 來源應為 ${n} 筆，實得 ${parsed[id]?.sources.length}`);
const allUrls = new Set(Object.values(parsed).flatMap((a) => a.sources.map((s) => s.url)));
if (allUrls.size !== 23) articleProblems.push(`九篇不同來源網址應為 23 個，實得 ${allUrls.size}`);
// 第二批原稿的內部歸類行不可成為正文第一段
for (const id of ['A1', 'A2', 'A4', 'B4', 'B5']) if (/^\*\*(建議(歸類|閱讀入口)|編輯對應)/.test(parsed[id]?.body || '')) articleProblems.push(`${id} 原稿的編輯歸類行被當成正文`);
// PR #11 最新用字：A1 第三輪非政府網域標示、B4 第二輪法規用語
const a1 = existsSync(path.join(SX, `articles/${WANT.A1.slug}.html`)) ? await read(OUT, `articles/${WANT.A1.slug}.html`) : '';
const b4 = existsSync(path.join(SX, `articles/${WANT.B4.slug}.html`)) ? await read(OUT, `articles/${WANT.B4.slug}.html`) : '';
if (!a1.includes('桃園市北區婦女中心網站｜活動資訊（非政府網域；報名請查當期公告）') || !a1.includes('受託執行團體')) articleProblems.push('A1 未同步第三輪非政府網域標示');
if (!b4.includes('自行訂製服裝') || b4.includes('個別訂製服裝') || !b4.includes('2023 年 5 月 18 日生效')) articleProblems.push('B4 未同步「自行訂製服裝」或來源日期被改動');
check(`九篇文章（${enabled.map((x) => x.id).join('、')}）：全文逐行出現、標題與分類正確、參考來源筆數與標題完整、查核日期、未核准標示、noindex、分類頁連結與搜尋索引，編輯用註記不外露`,
  articleProblems.length === 0, articleProblems.slice(0, 5).join('；'));

// 正文只生成一份
const dupProblems = [];
const htmlFiles = (await listFiles(SX)).filter((f) => f.endsWith('.html'));
const htmlCache = new Map();
for (const f of htmlFiles) htmlCache.set(f, plainHtml(await read(OUT, f)));
for (const x of enabled) {
  const paras = (parsed[x.id]?.body || '').split(/\n\s*\n/).map((p) => plainMd(p.replace(/\n/g, ''))).filter((p) => p.length > 40 && !p.startsWith('|'));
  for (const p of paras.slice(1, 3)) {
    const where = htmlFiles.filter((f) => htmlCache.get(f).includes(p));
    if (where.length !== 1 || where[0] !== `articles/${x.slug}.html`) dupProblems.push(`${x.id} 段落出現在 ${where.join('、') || '無'}`);
  }
}
check('不重複正文：九篇各只有一份文章頁，讀利／向光／分類頁只放連結', dupProblems.length === 0, dupProblems.slice(0, 3).join('；'));

// ---------- 三、舊 slug 與發布隔離 ----------
const leakHits = [];
for (const f of await listFiles(SX)) {
  if (!/\.(html|js|xml|txt)$/.test(f)) continue;
  const t = await read(OUT, f);
  for (const s of ['exp-open-course-certificates', 'exp-reading-popular-science']) if (t.includes(s)) leakHits.push(`${f}：舊 slug ${s}`);
}
// 正式版與公開 QA（讀正式佇列，九篇全部關閉）都不可含九篇任何一篇
for (const dir of ['dist-production', 'dist-qa']) {
  if (!existsSync(path.join(ROOT, dir))) { leakHits.push(`${dir} 未建置`); continue; }
  for (const f of await listFiles(path.join(ROOT, dir))) {
    if (!/\.(html|js|xml|txt)$/.test(f)) continue;
    const t = await read(dir, f);
    for (const id of IDS) if (t.includes(WANT[id].slug)) leakHits.push(`${dir}/${f}：${WANT[id].slug}`);
  }
}
const robots = await read(OUT, 'robots.txt').catch(() => '');
if (!/Disallow:\s*\/\s*$/m.test(robots)) leakHits.push('暫存版 robots.txt 未全站 Disallow');
check('發布隔離：舊的未上線 slug 不出現；正式版 dist-production 與公開 QA dist-qa 都不含九篇任何一篇；暫存版 robots 全站禁止索引', leakHits.length === 0, leakHits.slice(0, 3).join('；'));

// ---------- 四、讀利／向光與既有內容 ----------
const qaQp = await read('dist-qa', 'quiet-power.html');
const sxQp = await read(OUT, 'quiet-power.html');
const qaToward = await read('dist-qa', 'toward-light.html');
const sxToward = await read(OUT, 'toward-light.html');
const readliRe = /<h3><a href="articles\/([^"]+)\.html">/g;
const towardRe = /<article class="toward-reading-card">\s*<a href="articles\/([^"]+)\.html">/g;
const readliBefore = links(qaQp, readliRe);
const readliAfter = links(sxQp, readliRe);
const towardAfter = links(sxToward, towardRe);
const slug = (id) => WANT[id].slug;
check('讀利：原 23 篇順序不變，exp-01、exp-08、B4 接在最後（26 篇）；向光：原 13 篇與八索引不變，exp-11、exp-12、A1、A2、A4、B5 接在最後（19 張）；兩目錄互不重複',
  readliBefore.length === 23 && JSON.stringify(readliAfter) === JSON.stringify([...readliBefore, ...READLI_NEW.map(slug)]) &&
  JSON.stringify(towardAfter) === JSON.stringify([...TOWARD_READING_SLUGS, ...TOWARD_NEW.map(slug)]) &&
  qaToward.match(/toward-panel"/g)?.length === sxToward.match(/toward-panel"/g)?.length &&
  !READLI_NEW.some((id) => sxToward.includes(slug(id))) && !TOWARD_NEW.some((id) => sxQp.includes(slug(id))),
  `讀利 ${readliAfter.length}、向光 ${towardAfter.length}、八索引 ${sxToward.match(/toward-panel"/g)?.length}`);

const qaArticles = (await readdir(path.join(ROOT, 'dist-qa/articles'))).filter((f) => f.endsWith('.html'));
const changed = [];
for (const f of qaArticles) if ((await read('dist-qa', `articles/${f}`)) !== (await read(OUT, `articles/${f}`).catch(() => ''))) changed.push(f);
const sxArticles = (await readdir(path.join(SX, 'articles'))).filter((f) => f.endsWith('.html'));
// 九篇分屬生活與家庭、身心健康、學習與活動；其餘頁面不得有任何差異
for (const f of ['index.html', 'support.html', 'activities.html', 'search.html', 'city.html', 'career.html', 'law.html']) {
  if ((await read('dist-qa', f)) !== (await read(OUT, f))) changed.push(f);
}
check('既有內容：原 36 篇文章頁、首頁、支援、活動、搜尋頁與未收錄新篇的主題頁（城市、職涯、法律）和 dist-qa 完全相同；暫存版共 45 篇',
  qaArticles.length === 36 && sxArticles.length === 45 && changed.length === 0, `${sxArticles.length} 篇；差異 ${changed.slice(0, 5).join('、') || '無'}`);

// ---------- 五、PR #10 官方查詢入口整合 ----------
const portalProblems = [];
const learning = await read(OUT, 'learning.html');
const portalPages = new Map();
for (const c of categories) portalPages.set(c.id, await read(OUT, c.slug));
let primaryCount = 0;
for (const it of portals.items) {
  const cat = QA_PORTAL_CATEGORY[it.id];
  if (!cat) { portalProblems.push(`${it.id} 未設定主題`); continue; }
  if (it.id === 'act-09') {
    // 與既有「open-culture-events」卡完全同網址：不建新卡，沿用原卡
    if (portalPages.get(cat).includes(`id="portal-${it.id}"`)) portalProblems.push('act-09 同網址卻另建文字入口');
    if (!learning.includes('id="res-open-culture-events"')) portalProblems.push('act-09 沿用的原卡不在學習與活動頁');
    continue;
  }
  primaryCount += 1;
  const page = portalPages.get(cat);
  // 網頁上的網址是經過 HTML 轉義的（& → &amp;），比對前要用同樣的寫法
  const href = it.url.replace(/&/g, '&amp;');
  if (!page.includes(`id="portal-${it.id}"`) || !page.includes(href)) portalProblems.push(`${it.id} 不在 ${cat} 主題頁的文字入口`);
  // 同一網址不可在同一頁出現兩次以上（文字入口＋資源卡重複建卡）
  const hits = page.split(`"${href}"`).length - 1;
  if (hits > 1) portalProblems.push(`${it.id} 網址在 ${cat} 主題頁出現 ${hits} 次`);
}
if (primaryCount !== 11) portalProblems.push(`文字入口應為 11 筆，實得 ${primaryCount}`);
check('PR #10 整合：11 筆不同網址的官方查詢入口在對應主題頁以文字列呈現、act-09 沿用既有文化部卡不另建卡，同一網址不重複，與新增文章並存不衝突',
  portalProblems.length === 0, portalProblems.slice(0, 5).join('；'));

// ---------- 六、手機與電腦 ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (!p.startsWith(BASE)) { res.writeHead(404); return res.end(); }
  p = p.slice(BASE.length) || 'index.html';
  if (p.endsWith('/')) p += 'index.html';
  try { const body = await readFile(path.join(SX, p)); res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(4339, '127.0.0.1', ok));
const ORIGIN = 'http://127.0.0.1:4339';
const SHOTS = process.env.NINE_SCREENSHOTS;
if (SHOTS) await mkdir(SHOTS, { recursive: true });
// 截圖：從倒數第 n＋1 張卡（最後一張原有卡）到最後一張新卡的範圍，讓所有新卡與原卡銜接處都在同一張圖裡
async function shotTail(page, selector, n, file) {
  const cards = page.locator(selector);
  const total = await cards.count();
  const first = await cards.nth(total - n - 1).boundingBox();
  const last = await cards.nth(total - 1).boundingBox();
  const vw = page.viewportSize().width;
  const sy = await page.evaluate(() => scrollY);
  await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: Math.max(0, first.y + sy - 24), width: vw, height: last.y + last.height - first.y + 48 } });
}
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
      const pages = [...enabled.map((x) => `articles/${x.slug}.html`), 'quiet-power.html', 'toward-light.html', 'life-family.html', 'health.html', 'learning.html', 'city.html'];
      for (const f of pages) {
        await page.goto(`${ORIGIN}${BASE}${f}`);
        const m = await page.evaluate(() => ({
          o: document.documentElement.scrollWidth - innerWidth,
          fs: parseFloat(getComputedStyle(document.querySelector('.prose p') || document.body).fontSize),
          src: [...document.querySelectorAll('.sources a')].filter((a) => a.getBoundingClientRect().right > innerWidth + 1).length,
          tables: [...document.querySelectorAll('.prose table')].filter((t) => t.getBoundingClientRect().right > innerWidth + 1).length,
          portals: [...document.querySelectorAll('.qa-portal-list a')].filter((a) => a.getBoundingClientRect().right > innerWidth + 1 || a.getBoundingClientRect().height < 44).length,
        }));
        if (m.o > 0) problems.push(`${w}px ${f} 水平溢位 ${m.o}px`);
        if (f.startsWith('articles/') && m.fs < 15) problems.push(`${w}px ${f} 內文 ${m.fs}px`);
        if (m.src || m.tables) problems.push(`${w}px ${f} 來源連結 ${m.src}、表格 ${m.tables} 超出畫面`);
        if (m.portals) problems.push(`${w}px ${f} 官方查詢入口 ${m.portals} 筆超出畫面或不足 44px`);
        if (SHOTS && (w === 390 || w === 1280) && f.startsWith('articles/')) await page.screenshot({ path: path.join(SHOTS, `${name.toLowerCase()}-${w}-${path.basename(f, '.html')}.png`), fullPage: true });
      }
      // 讀利：新三篇與原卡同為精簡清單、標題可觸控
      await page.goto(`${ORIGIN}${BASE}quiet-power.html`);
      const qp = await page.locator('.readli-reading .story-grid .story').evaluateAll((cards) => cards.map((c) => {
        const a = c.querySelector('h3 a');
        const b = c.getBoundingClientRect();
        return { slug: a.getAttribute('href'), h: Math.round(b.height), w: Math.round(b.width), linkH: Math.round(a.getBoundingClientRect().height) };
      }));
      const qpNew = qp.slice(-3);
      if (qp.length !== 26 || !qpNew.every((c, i) => c.slug.includes(slug(READLI_NEW[i]))) ||
          qpNew.some((c) => c.w !== qp[0].w || c.linkH < 44 || (mobile && (c.h < 75 || c.h >= 240)))) problems.push(`${w}px 讀利新卡 ${JSON.stringify(qpNew)}`);
      if (SHOTS && (w === 390 || w === 1280)) {
        await shotTail(page, '.readli-reading .story-grid .story', READLI_NEW.length, path.join(SHOTS, `${name.toLowerCase()}-${w}-readli-tail.png`));
      }
      // 向光：新六張與原 13 張同寬、手機單欄對齊
      await page.goto(`${ORIGIN}${BASE}toward-light.html`);
      const tw = await page.locator('.toward-reading-card').evaluateAll((cards) => cards.map((c) => {
        const b = c.getBoundingClientRect();
        return { href: c.querySelector('a').getAttribute('href'), x: Math.round(b.left), w: Math.round(b.width), h: Math.round(b.height), linkH: Math.round(c.querySelector('a').getBoundingClientRect().height) };
      }));
      const twNew = tw.slice(-6);
      if (tw.length !== 19 || !twNew.every((c, i) => c.href.includes(slug(TOWARD_NEW[i]))) ||
          twNew.some((c) => c.w !== tw[0].w || c.linkH < 44 || (mobile && (c.x !== tw[0].x || c.h < 106 || c.h >= 230)))) problems.push(`${w}px 向光新卡 ${JSON.stringify(twNew)}`);
      if (SHOTS && (w === 390 || w === 1280)) {
        await shotTail(page, '.toward-reading-card', TOWARD_NEW.length, path.join(SHOTS, `${name.toLowerCase()}-${w}-toward-tail.png`));
      }
      // 搜尋：九篇都能以標題關鍵字找到並開啟
      for (const x of enabled) {
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
    check(`${name} 320／375／390／1280px：九篇文章、讀利、向光、三個主題頁與城市頁無水平溢位，內文 ≥ 15px，來源、表格與官方查詢入口不超出畫面且可觸控 ≥ 44px；讀利 26／向光 19 的新卡與原卡尺寸一致；搜尋可找到並開啟九篇；無 JavaScript 錯誤`,
      problems.length === 0 && jsErrors.length === 0, [...problems, ...jsErrors].slice(0, 5).join('；'));
  }
} finally {
  server.close();
}

const failed = results.filter((x) => !x.ok).length;
console.log(`\n九篇整合 QA 暫存模擬：${results.length} 項，通過 ${results.length - failed}，失敗 ${failed}`);
process.exit(failed ? 1 : 0);
