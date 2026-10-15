#!/usr/bin/env node
// 第二批候選內容（23 筆地方官方入口、12 篇導讀）本機測試預覽的驗收測試。
// 前置：node scripts/build.mjs --mode=qa（dist-qa）、一般預覽（dist）與正式版（dist-production）都已建置。
// 檢查兩件事：一、測試預覽中候選內容可正常閱讀與操作；二、候選內容不會出現在一般預覽或正式版。
import http from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadBatch2Articles, BATCH2_RESOURCES } from '../scripts/lib/qa-batch2.mjs';
import { loadBatch3OpenAccess, USAGE_NOTES } from '../scripts/lib/qa-batch3.mjs';
import { loadBatch45Articles, BATCH45_SOURCES } from '../scripts/lib/qa-batch45.mjs';
import { loadQaEnglishResources } from '../scripts/lib/qa-english.mjs';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const c of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/node22/lib/node_modules/playwright'].filter(Boolean)) {
    try { return require(c); } catch { /* 試下一個 */ }
  }
  console.error('找不到 Playwright。');
  process.exit(2);
}
const { chromium } = loadPlaywright();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QA = path.join(ROOT, 'dist-qa');
const site = JSON.parse(await readFile(path.join(ROOT, 'config/site.json'), 'utf8'));
const categories = JSON.parse(await readFile(path.join(ROOT, 'content/categories.json'), 'utf8'));
const counties = JSON.parse(await readFile(path.join(ROOT, 'content/counties.json'), 'utf8'));
const national = JSON.parse(await readFile(path.join(ROOT, 'content/resources.json'), 'utf8')).items;
const cand = JSON.parse(await readFile(path.join(ROOT, BATCH2_RESOURCES), 'utf8')).items;
const arts = await loadBatch2Articles(ROOT, categories);
const third = await loadBatch3OpenAccess(ROOT);
const fourth = await loadBatch45Articles(ROOT, categories); // Issue #2：第四批 9 篇＋第五批 4 篇
const englishResources = await loadQaEnglishResources(ROOT, [...national, ...cand, ...third.resources]);
const newEnglishResources = englishResources.filter(r => r.id.startsWith('qa-en-'));
const BASE = site.basePath;
const PORT = 4331;
const ORIGIN = `http://127.0.0.1:${PORT}`;

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function listFiles(dir, prefix = '') {
  const out = [];
  for (const e of await readdir(dir)) {
    const full = path.join(dir, e);
    if ((await stat(full)).isDirectory()) out.push(...(await listFiles(full, `${prefix}${e}/`)));
    else out.push(`${prefix}${e}`);
  }
  return out;
}
const read = (dir, f) => readFile(path.join(dir, f), 'utf8');

// ---------- 一、發布隔離：候選內容只在 dist-qa ----------
const markers = [...cand.map((r) => r.url), ...cand.map((r) => r.id), ...arts.map((a) => a.title), ...third.resources.map((r) => r.url), ...third.resources.map((r) => r.id), ...third.articles.map((a) => a.title), ...fourth.map((a) => a.title), ...newEnglishResources.map(r => r.id), 'batch2-', 'batch3-', 'batch4-', 'batch5-', '未核准測試內容'];
for (const [label, dir] of [['一般預覽版 dist', 'dist'], ['正式版 dist-production', 'dist-production']]) {
  const leaks = [];
  for (const f of await listFiles(path.join(ROOT, dir))) {
    if (!/\.(html|js|xml|txt)$/.test(f)) continue;
    const t = await read(path.join(ROOT, dir), f);
    for (const m of markers) if (t.includes(m)) { leaks.push(`${f}：${m.slice(0, 30)}`); break; }
  }
  check(`發布隔離：${label} 不含第二批 23 筆候選、第二～五批 30 篇候選文章或測試標示`, leaks.length === 0, leaks.slice(0, 3).join('；'));
}
const candStillPending = cand.every((r) => r.published === false && r.status === '待確認' && r.checkedAt === null);
const approvals = JSON.parse(await readFile(path.join(ROOT, 'content/release-approvals.json'), 'utf8'));
const notApproved = [...cand, ...third.resources].every((r) => !approvals.resources[r.id]);
const thirdPending = third.resources.every((r) => r.published === false && r.status === '待確認' && r.checkedAt === null) && third.articles.every((a) => a.publishApproval === 'not-approved');
check('第三批：9 筆生活自主學習入口與 5 篇原創文章均保持未核准且不在正式發布清單', thirdPending && notApproved);
check('候選資料本身未被改動：23 筆仍為 published:false、待確認、checkedAt:null，且不在既有發布核准清單', candStillPending && notApproved);

// ---------- 二、測試預覽的靜態檢查 ----------
const qaPages = (await listFiles(QA)).filter((f) => f.endsWith('.html'));
const missingBar = [];
for (const f of qaPages) {
  const t = await read(QA, f);
  if (!t.includes('class="preview-bar qa-bar"') || !t.includes('noindex')) missingBar.push(f);
}
check(`測試預覽：${qaPages.length} 個頁面都顯示「未核准測試內容」提示並禁止搜尋引擎收錄`, missingBar.length === 0, missingBar.join('、'));

const city = await read(QA, 'city.html');
const cardIds = [...city.matchAll(/<article class="res-card" id="res-([^"]+)"/g)].map((m) => m[1]);
const candInCity = cand.filter((r) => cardIds.includes(r.id));
const urls = cand.map((r) => r.url);
const dupUrl = urls.filter((u, i) => urls.indexOf(u) !== i);
const nationalUrls = new Set(national.map((r) => r.url));
check('城市頁：23 筆地方入口全部出現，ID 與網址皆不重複，也不與 18 筆全國資源網址重複', candInCity.length === 23 && new Set(cardIds).size === cardIds.length && dupUrl.length === 0 && urls.every((u) => !nationalUrls.has(u)), `出現 ${candInCity.length} 筆`);

const topicIds = new Set(categories.flatMap((c) => c.topics.map((t) => t.id)));
const countyIds = new Set(counties.map((c) => c.id));
const badRef = cand.filter((r) => !r.categories.every((c) => categories.some((x) => x.id === c)) || !r.topics.every((t) => topicIds.has(t)) || !r.regions.every((g) => countyIds.has(g)));
const uncovered = counties.filter((c) => !cand.some((r) => r.regions.includes(c.id)));
check('23 筆皆為有效分類、主題與縣市，且 22 縣市每一個都有地方入口', badRef.length === 0 && uncovered.length === 0, [...badRef.map((r) => r.id), ...uncovered.map((c) => c.name)].join('、'));

const cardHtml = (id) => (new RegExp(`<article class="res-card" id="res-${id}"[\\s\\S]*?</article>`).exec(city) || [''])[0];
const englishCardProblems = [];
for (const item of newEnglishResources) {
  const card = cardHtml(item.id);
  if (!card || !card.includes('lang="en"') || !card.includes('未核准測試內容')) englishCardProblems.push(item.id + ' missing English QA card');
  if (item.nameEn && !card.includes(item.nameEn)) englishCardProblems.push(item.id + ' missing English agency name');
}
for (const item of englishResources.filter(r => r.qaEnglish && !r.id.startsWith('qa-en-'))) {
  const card = cardHtml(item.id);
  if (!card.includes('res-summary-en')) englishCardProblems.push(item.id + ' missing English summary');
}
check('英文輔助 QA：3 張多語官方入口及 8 張既有資源英文說明；維持未核准狀態與官方來源', englishCardProblems.length === 0 && newEnglishResources.length === 3 && englishResources.filter(r => r.qaEnglish && !r.id.startsWith('qa-en-')).length === 8, englishCardProblems.join('；'));

const chiayi = cand.filter((r) => r.regions.includes('chiayi-city')).map((r) => cardHtml(r.id));
const typeOf = (h) => (/<dt>入口類型<\/dt><dd>([^<]+)<\/dd>/.exec(h) || [])[1] || '';
const nameOf = (h) => (/<h3>([^<]+)<\/h3>/.exec(h) || [])[1] || '';
check('嘉義市兩張卡片名稱、入口類型與網址皆不同，不會混淆', chiayi.length === 2 && nameOf(chiayi[0]) !== nameOf(chiayi[1]) && typeOf(chiayi[0]) !== typeOf(chiayi[1]), chiayi.map((h) => `${nameOf(h)}／${typeOf(h)}`).join('；'));

const rosters = cand.filter((r) => r.id.endsWith('-service-center-roster'));
const rosterOk = rosters.length === 3 && rosters.every((r) => typeOf(cardHtml(r.id)).startsWith('中央（衛福部）公布的地方社福中心名錄') && !r.serviceTypes.includes('婦女福利') && !/婦女中心/.test(r.name + r.summary));
check('嘉義縣、嘉義市、連江縣社福中心名錄：標示為中央公布的地方中心名錄，且未被標成婦女福利或婦女中心', rosterOk);

const kh = cardHtml('batch2-kaohsiung-welfare-directory');
check('高雄市：標示為市府社會福利目錄，入口類型註明「非社會局／處獨立網站」，名稱未冒稱社會局網站', /市府官方福利查詢目錄（非社會局／處獨立網站）/.test(kh) && !/社會局官方網站|社會局網站/.test(nameOf(kh)));

const nationalCards = national.filter((r) => r.published !== false && r.status !== '已撤下');
const qaNationalCardsCount = nationalCards.length + third.resources.filter((r) => r.regions.includes('national')).length + newEnglishResources.filter(r => r.regions.includes('national')).length;
const natChanged = nationalCards.filter((r) => !cardHtml(r.id).includes(`<h3>${r.name}</h3>`) || !cardHtml(r.id).includes(r.summary));
check(`原有 ${nationalCards.length} 筆全國性資料仍在且名稱、簡介未被覆寫`, natChanged.length === 0, natChanged.map((r) => r.id).join('、'));

const allQaBadged = cand.every((r) => cardHtml(r.id).includes('badge-qa'));
check('每張地方候選卡片都有「未核准測試內容」標籤', allQaBadged);

// 文章
const qp = await read(QA, 'quiet-power.html');
const idx = await read(QA, 'assets/data/search-index.js');
const artProblems = [];
for (const a of arts) {
  const f = `articles/${a.slug}.html`;
  if (!existsSync(path.join(QA, f))) { artProblems.push(`${a.no} 缺少頁面`); continue; }
  const t = await read(QA, f);
  if (!qp.includes(`href="articles/${a.slug}.html"`)) artProblems.push(`${a.no} 讀利專欄沒有連結`);
  if (!t.includes(`<h1>${a.title}</h1>`)) artProblems.push(`${a.no} 標題不符`);
  const cat = categories.find((c) => c.id === a.category);
  if (!t.includes(`<span class="pill">${cat.title}</span>`)) artProblems.push(`${a.no} 分類不符`);
  if (!/來源查核：\d{4}-\d{2}-\d{2}/.test(t)) artProblems.push(`${a.no} 沒有查核日期`);
  const srcBox = (/<div class="sources">[\s\S]*?<\/div>/.exec(t) || [''])[0];
  if (a.sourcesList.some((s) => !srcBox.includes(s.url.replace(/&/g, '&amp;')))) artProblems.push(`${a.no} 官方來源缺漏`);
  const mainHtml = (/<main[\s\S]*<\/main>/.exec(t) || [''])[0];
  if ((mainHtml.match(new RegExp(a.summary.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length > 1) artProblems.push(`${a.no} 開頭段落在頁面中重複出現`);
  if (/發布前再確認|候選終稿|尚未核准公開|編輯附錄|<p>---<\/p>|\*\*/.test(t)) artProblems.push(`${a.no} 含編輯備註或未轉換的 Markdown`);
  if (!idx.includes(`"url":"articles/${a.slug}.html"`)) artProblems.push(`${a.no} 搜尋索引沒有`);
}
check('12 篇文章：各有獨立頁面、正確分類、查核日期與官方來源；讀利專欄與搜尋索引都找得到；不含編輯備註', artProblems.length === 0, artProblems.slice(0, 5).join('；'));
const withdrawn = existsSync(path.join(QA, 'articles/how-to-use.html')) || existsSync(path.join(QA, 'articles/status-labels.html')) || /看懂資料旁的小標籤|由己使用指南/.test(qp + idx);
check('兩篇已撤下的舊使用指南沒有重新出現', !withdrawn);

const newArticleProblems = [];
for (const a of third.articles) {
  const html = await read(QA, `articles/${a.slug}.html`).catch(() => '');
  if (!html.includes(`<h1>${a.title}</h1>`)) newArticleProblems.push(`${a.slug} 缺少內文或標題`);
  if (!html.includes('未核准測試內容')) newArticleProblems.push(`${a.slug} 未標示 QA`);
  if (!idx.includes(`"url":"articles/${a.slug}.html"`)) newArticleProblems.push(`${a.slug} 缺少搜尋索引`);
  if (!a.sourcesList.every((x) => html.includes(x.url.replace(/&/g, '&amp;')))) newArticleProblems.push(`${a.slug} 參考來源不完整`);
}
for (const r of third.resources) {
  const html = cardHtml(r.id);
  if (!html.includes(r.name.replace(/&/g, '&amp;')) || !html.includes('badge-qa')) newArticleProblems.push(`${r.id} 缺少候選卡或標示`);
  if (!html.includes(r.url.replace(/&/g, '&amp;'))) newArticleProblems.push(`${r.id} 缺少正確外部連結`);
}
check('第三批 5 篇文章／9 筆官方學習及生活導覽：連結、搜尋、標籤與來源完整', newArticleProblems.length === 0, newArticleProblems.slice(0, 6).join('；'));

// Issue #2：第四批 9 篇＋第五批 4 篇
const approvalsText = await read(ROOT, 'content/release-approvals.json');
const fourthProblems = [];
const EDITOR_LEFTOVER = /尚待核定|待核准事項|待核准：|出版前注意|公開前網址驗收|有效性提醒|維護策略|建議分類|刊登前限制|正式上稿前必查|避免混同|更新方式：|編輯說明|上 QA 前的批次|本次六篇的資料管理|統整｜本檔四篇|狀態：未核准候選|<p>---<\/p>|\*\*/;
const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
for (const a of fourth) {
  const f = `articles/${a.slug}.html`;
  if (!existsSync(path.join(QA, f))) { fourthProblems.push(`${a.slug} 缺少頁面`); continue; }
  const t = await read(QA, f);
  const cat = categories.find((c) => c.id === a.category);
  if (!t.includes(`<h1>${a.title}</h1>`)) fourthProblems.push(`${a.slug} 標題不符`);
  if (!t.includes(`<span class="pill">${cat.title}</span>`)) fourthProblems.push(`${a.slug} 分類不符`);
  if (!t.includes('來源查核：2026-10-16（AI 編輯查核，尚未經網站擁有人核准）') || !t.includes('badge-qa">未核准測試內容')) fourthProblems.push(`${a.slug} 缺少查核日期或未核准標籤`);
  if (!/<meta name="robots" content="noindex/.test(t)) fourthProblems.push(`${a.slug} 未禁止收錄`);
  if (!qp.includes(`href="articles/${a.slug}.html"`)) fourthProblems.push(`${a.slug} 讀利專欄沒有連結`);
  if (!(await read(QA, cat.slug)).includes(`articles/${a.slug}.html`)) fourthProblems.push(`${a.slug} 分類頁 ${cat.slug} 沒有連結`);
  if (!idx.includes(`"url":"articles/${a.slug}.html"`)) fourthProblems.push(`${a.slug} 搜尋索引沒有`);
  const srcBox = (/<div class="sources">[\s\S]*?<\/div>/.exec(t) || [''])[0];
  for (const x of a.sourcesList) {
    if (!x.url.startsWith('https://')) fourthProblems.push(`${a.slug} 來源非 https`);
    if (!srcBox.includes(`href="${x.url.replace(/&/g, '&amp;')}" class="ext" rel="noopener noreferrer"`)) fourthProblems.push(`${a.slug} 來源缺漏或缺 noopener：${x.url}`);
    if (x.note && !plain(srcBox).includes(x.note)) fourthProblems.push(`${a.slug} 來源說明未保留：${x.note.slice(0, 12)}`);
  }
  if (EDITOR_LEFTOVER.test(t)) fourthProblems.push(`${a.slug} 含編輯備註或未轉換的 Markdown：${EDITOR_LEFTOVER.exec(t)[0]}`);
  // 正文保真：原稿每個小標、每段文字（去掉 Markdown 記號後）都要原樣出現在頁面
  const pageText = plain((/<div class="prose">[\s\S]*?<div class="sources">/.exec(t) || [''])[0]).replace(/\s+/g, '');
  for (const line of a.body.split('\n').map((l) => l.trim()).filter(Boolean)) {
    if (/^\|[\s:|-]+\|$/.test(line)) continue;
    const want = line.replace(/^#{2,3}\s+|^-\s+|^\d+\.\s+/, '').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\|/g, '').replace(/\s+/g, '');
    if (!pageText.includes(want)) { fourthProblems.push(`${a.slug} 正文未完整保留：${line.slice(0, 20)}`); break; }
  }
  if (a.status !== '待確認' || a.publishApproval !== 'not-approved' || a.ownerApproved !== false || approvalsText.includes(a.slug)) fourthProblems.push(`${a.slug} 狀態被改成核准或進入正式核准清單`);
}
const tableHtml = await read(QA, 'articles/batch5-harassment-three-laws.html');
if ((tableHtml.match(/<table>[\s\S]*?<\/table>/) || [''])[0].split('<tr>').length - 1 !== 4) fourthProblems.push('三部性騷擾法規文章的比較表未轉為 1 列表頭＋3 列內容');
const allSlugs = [...arts, ...third.articles, ...fourth].map((a) => a.slug);
const qaArticleFiles = (await readdir(path.join(QA, 'articles'))).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, ''));
const extra = qaArticleFiles.filter((f) => !allSlugs.includes(f));
if (new Set(allSlugs).size !== allSlugs.length || allSlugs.length !== 30) fourthProblems.push(`QA 文章 slug 數 ${allSlugs.length}，應為 30 且不重複`);
if (extra.length) fourthProblems.push(`QA 出現不在範圍內的文章：${extra.join('、')}`);
const byCat = Object.fromEntries(categories.map((c) => [c.id, fourth.filter((a) => a.category === c.id).length]));
if (JSON.stringify(byCat) !== JSON.stringify({ 'life-family': 3, career: 3, health: 1, law: 2, city: 0, learning: 4 })) fourthProblems.push(`分類分布不符：${JSON.stringify(byCat)}`);
if (BATCH45_SOURCES.length !== 3) fourthProblems.push('載入來源檔不是 Issue #2 指定的三個原稿');
check('第四、五批 13 篇：各有獨立頁、六大分類正確（學習 4／生活 3／職涯 3／法律 2／健康 1）、正文與表格完整保留、來源 https 且附原稿說明、讀利／分類頁／搜尋皆可找到、無編輯備註、未核准＋noindex；QA 共 30 篇且無範圍外草稿', fourthProblems.length === 0, fourthProblems.slice(0, 6).join('；'));

// Issue #1 A：第三批卡片各有一行個別「使用方式」，其他卡片與一般預覽／正式版不顯示
const usageProblems = [];
for (const r of third.resources) {
  const rows = [...cardHtml(r.id).matchAll(/<dt>使用方式<\/dt><dd class="res-usage">([^<]*)<\/dd>/g)].map((m) => m[1]);
  if (rows.length !== 1 || rows[0] !== USAGE_NOTES[r.id]) usageProblems.push(`${r.id}：${rows.join('／') || '缺少'}`);
  if (/免費報名|保證免費|零門檻/.test(rows.join(''))) usageProblems.push(`${r.id} 使用方式含不當承諾`);
}
for (const r of [...cand, ...national]) if (cardHtml(r.id).includes('res-usage')) usageProblems.push(`${r.id} 不應顯示使用方式`);
for (const dir of ['dist', 'dist-production']) {
  for (const f of await listFiles(path.join(ROOT, dir))) if (f.endsWith('.html') && (await read(path.join(ROOT, dir), f)).includes('res-usage')) usageProblems.push(`${dir}/${f} 出現使用方式標示`);
}
check('第三批 9 張卡片各有一行個別「使用方式」（依各筆官方服務範圍），其他卡片、一般預覽與正式版不受影響', usageProblems.length === 0, usageProblems.slice(0, 4).join('；'));

// ---------- 三、瀏覽器操作（Chromium） ----------
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, ORIGIN);
  let rel = decodeURIComponent(u.pathname);
  rel = rel.startsWith(BASE) ? rel.slice(BASE.length) || 'index.html' : '__missing__';
  const file = path.join(QA, rel);
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
  if (file.startsWith(QA + path.sep) && existsSync(file) && (await stat(file)).isFile()) {
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } else { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch();
try {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await mobile.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // iPhone 實機回報：搜尋時不能讓六大主題與搜尋結果同時顯示。
  await page.goto(`${ORIGIN}${BASE}index.html`);
  await page.fill('#home-q', '托育');
  await page.waitForTimeout(190);
  const homeSearchActive = await page.evaluate(() => ({
    state: document.body.classList.contains('home-searching'),
    categoriesHidden: getComputedStyle(document.querySelector('.cats')).display === 'none',
    quickHidden: getComputedStyle(document.querySelector('.quick-section')).display === 'none',
    count: document.querySelectorAll('.hero .search-results a').length,
    firstVisible: Boolean(document.querySelector('.hero .search-results a')?.getClientRects().length),
    resultPosition: getComputedStyle(document.querySelector('.hero .search-results')).position,
  }));
  check('首頁輸入托育：只顯示可閱讀的搜尋結果，六大分類及快捷入口收起、不以浮層重疊',
    homeSearchActive.state && homeSearchActive.categoriesHidden && homeSearchActive.quickHidden &&
    homeSearchActive.count > 0 && homeSearchActive.firstVisible && homeSearchActive.resultPosition === 'static',
    JSON.stringify(homeSearchActive));
  await page.fill('#home-q', '完全不存在的測試詞xyz678');
  await page.waitForTimeout(190);
  check('首頁搜尋不到：顯示無結果提示且六大分類仍收起',
    await page.locator('.hero [data-search-empty]').isVisible() &&
    await page.locator('.cats').isHidden());
  await page.fill('#home-q', '');
  await page.waitForTimeout(190);
  check('首頁清空搜尋：恢復六大分類及快捷入口',
    !await page.locator('body').evaluate(e => e.classList.contains('home-searching')) &&
    await page.locator('.cats').isVisible() && await page.locator('.quick-section').isVisible());
  await page.fill('#home-q', '育兒');
  // CI 在高速連續填寫時偶爾還在處理 search input；等待明確可見及完整 44px 尺寸，
  // 不能跳過檢查，也不修改站主已驗收的搜尋腳本／按鈕樣式。
  const resetButton = page.locator('[data-search-clear]').first();
  let clearButtonOk = false;
  try {
    await resetButton.waitFor({ state: 'visible', timeout: 3500 });
    await page.waitForFunction(() => {
      const e = document.querySelector('.hero [data-search-clear]');
      if (!e || e.hidden || getComputedStyle(e).display === 'none') return false;
      const rect = e.getBoundingClientRect();
      return rect.height >= 44 && rect.width >= 44;
    }, null, { timeout: 3500 });
    clearButtonOk = true;
  } catch {
    // Report actual dimensions on failure; an actual too-small button remains a failing test.
  }
  const clearButtonDimensions = await resetButton.evaluate(el => {
    const box = el.getBoundingClientRect();
    return { width: box.width, height: box.height, hidden: el.hidden };
  });
  check('搜尋文字存在時：顯示至少 44px 的明確清除按鈕',
    clearButtonOk, JSON.stringify(clearButtonDimensions));
  await resetButton.click();
  await page.waitForTimeout(30);
  check('點擊清除搜尋文字：即時回復六大主題和快捷入口',
    await page.locator('#home-q').inputValue() === '' &&
    await page.locator('.cats').isVisible() &&
    await page.locator('.quick-section').isVisible() &&
    await resetButton.isHidden());
  await page.fill('#home-q', '托育');
  await page.waitForTimeout(190);
  await page.locator('#home-q').evaluate(el => {
    el.value = '';
    el.dispatchEvent(new Event('search', { bubbles: true }));
  });
  await page.waitForTimeout(20);
  check('模擬 Safari 原生清除 search 事件：立即還原分類',
    await page.locator('.cats').isVisible() && !(await page.locator('body').evaluate(el => el.classList.contains('home-searching'))));
  await page.fill('#home-q', '職訓');
  await page.waitForTimeout(190);
  await page.locator('#home-q').press('Escape');
  await page.waitForTimeout(40);
  check('首頁按 Escape：清空查詢並還原六大主題',
    await page.locator('#home-q').inputValue() === '' && await page.locator('.cats').isVisible());

  await page.goto(`${ORIGIN}${BASE}search.html`);
  await page.fill('#q', '心理');
  await page.waitForTimeout(190);
  check('獨立搜尋頁：輸入時不混入六大主題瀏覽區',
    await page.locator('.section[aria-labelledby="browse-title"]').isHidden() &&
    await page.locator('[data-search-results] a').count() > 0);
  await page.fill('#q', '');
  await page.waitForTimeout(190);
  check('獨立搜尋頁：清空後恢復主題瀏覽區',
    await page.locator('.section[aria-labelledby="browse-title"]').isVisible());

  // 22 縣市逐一切換
  await page.goto(`${ORIGIN}${BASE}city.html`);
  const countyProblems = [];
  for (const c of counties) {
    await page.selectOption('#county', c.id);
    await page.selectOption('#service-type', '');
    const shown = await page.$$eval('#local-results [data-res]:not([hidden])', (els) => els.map((e) => ({ id: e.id.replace('res-', ''), regions: e.dataset.regions })));
    const expected = cand.filter((r) => r.regions.includes(c.id)).map((r) => r.id).sort();
    const ids = shown.map((s) => s.id).sort();
    if (JSON.stringify(ids) !== JSON.stringify(expected)) countyProblems.push(`${c.name} 顯示 ${ids.length} 筆，應為 ${expected.length} 筆`);
    if (shown.some((s) => !s.regions.split(' ').includes(c.id))) countyProblems.push(`${c.name} 混入其他縣市`);
    const nat = await page.$$eval('#national-results [data-res]:not([hidden])', (els) => els.length);
    if (nat !== qaNationalCardsCount) countyProblems.push(`${c.name} 全國性 ${nat} 筆，預期 ${qaNationalCardsCount}`);
  }
  check('22 縣市逐一切換：每個縣市只顯示該縣市的地方入口（嘉義市 2 筆、其餘各 1 筆），全國性資源維持顯示', countyProblems.length === 0, countyProblems.slice(0, 4).join('；'));

  // 婦女福利篩選
  const womenProblems = [];
  let womenTotal = 0;
  for (const c of counties) {
    await page.selectOption('#county', c.id);
    await page.selectOption('#service-type', '婦女福利');
    const ids = (await page.$$eval('#local-results [data-res]:not([hidden])', (els) => els.map((e) => e.id.replace('res-', '')))).sort();
    const expected = cand.filter((r) => r.regions.includes(c.id) && r.serviceTypes.includes('婦女福利')).map((r) => r.id).sort();
    womenTotal += ids.length;
    if (JSON.stringify(ids) !== JSON.stringify(expected)) womenProblems.push(`${c.name}：${ids.join(',')}`);
    if (ids.some((id) => id.endsWith('-service-center-roster'))) womenProblems.push(`${c.name} 社福中心名錄被列為婦女福利`);
  }
  check(`服務類型「婦女福利」：有官方證據的 ${womenTotal} 個地方入口正確顯示，一般社福中心名錄不會出現`, womenProblems.length === 0 && womenTotal === cand.filter((r) => r.serviceTypes.includes('婦女福利')).length, womenProblems.slice(0, 3).join('；'));

  // 卡片按鈕點擊範圍
  await page.selectOption('#county', 'chiayi-city');
  await page.selectOption('#service-type', '');
  const btn = await page.$$eval('#local-results [data-res]:not([hidden]) .res-actions a', (as) => as.map((a) => { const r = a.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), a.target, a.rel]; }));
  check('手機版地方卡片：「前往官方網站」按鈕高度 ≥ 44px，外部連結具 noopener noreferrer', btn.length === 2 && btn.every(([w, h, , rel]) => h >= 44 && w >= 44 && /noopener/.test(rel) && /noreferrer/.test(rel)), JSON.stringify(btn));

  // 搜尋文章並開啟
  const searchProblems = [];
  for (const a of [arts[0], arts[6], arts[11], fourth[0], fourth[6], fourth[9], fourth[12]]) {
    await page.goto(`${ORIGIN}${BASE}search.html`);
    const kw = a.title.slice(0, 6);
    await page.fill('[data-search] input', kw);
    await page.waitForTimeout(150);
    const link = page.locator(`[data-search] a[href$="articles/${a.slug}.html"]`).first();
    if (!(await link.count())) { searchProblems.push(`搜尋「${kw}」找不到 ${a.no || a.slug}`); continue; }
    await link.click();
    await page.waitForURL(`**/articles/${a.slug}.html`);
    if ((await page.textContent('h1')).trim() !== a.title) searchProblems.push(`${a.no || a.slug} 開啟後標題不符`);
  }

  await page.goto(`${ORIGIN}${BASE}search.html`);
  for (const query of ['immigration', 'childcare', 'legal aid', 'residence']) {
    await page.fill('[data-search] input', query);
    await page.waitForTimeout(120);
    const count = await page.locator('[data-search-results] a').count();
    if (!count) searchProblems.push('英文搜尋無法找到相關資源：' + query);
  }
  await page.goto(`${ORIGIN}${BASE}search.html`);
  await page.fill('[data-search] input', '嘉義市');
  await page.waitForTimeout(150);
  const chiayiHits = await page.locator('[data-search] a[href*="batch2-chiayi-city"]').count();
  if (chiayiHits !== 2) searchProblems.push(`搜尋「嘉義市」找到 ${chiayiHits} 張嘉義市地方卡片`);
  check('站內搜尋：可找到文章（含第四、五批新文）並開啟閱讀頁；搜尋「嘉義市」可找到兩張地方卡片', searchProblems.length === 0, searchProblems.join('；'));

  // 讀利專欄進入所有文章
  await page.goto(`${ORIGIN}${BASE}quiet-power.html`);
  const qpLinks = await page.$$eval('#articles-title ~ .story-grid a, .story-grid h3 a', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
  const entry = await page.$eval('.dir-head .support-entry', (e) => ({ href: e.getAttribute('href'), h: Math.round(e.getBoundingClientRect().height) }));
  check('讀利專欄：導讀文章區列出第二批 12 篇、第三批 5 篇、第四批 9 篇、第五批 4 篇共 30 篇且連結正確；💪 支援資源小型入口仍在（連往 support.html、高度 ≥ 44px）', qpLinks.length === 30 && [...arts, ...third.articles, ...fourth].every((a) => qpLinks.includes(`articles/${a.slug}.html`)) && entry.href === 'support.html' && entry.h >= 44, `文章連結 ${qpLinks.length}；入口 ${JSON.stringify(entry)}`);
  check('測試預覽操作過程沒有 JavaScript 錯誤', errors.length === 0, errors.slice(0, 2).join('；'));
  await mobile.close();

  // 各寬度版面
  const overflow = [];
  const smallText = [];
  const pagesToCheck = ['index.html', 'city.html', 'quiet-power.html', 'toward-light.html', 'search.html', ...arts.map((a) => `articles/${a.slug}.html`), ...third.articles.map((a) => `articles/${a.slug}.html`), ...fourth.map((a) => `articles/${a.slug}.html`)];
  for (const w of [320, 375, 390, 768, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 700, hasTouch: w < 700 });
    const p = await ctx.newPage();
    for (const f of pagesToCheck) {
      await p.goto(`${ORIGIN}${BASE}${f}`);
      const r = await p.evaluate(() => ({ o: document.documentElement.scrollWidth - innerWidth, fs: parseFloat(getComputedStyle(document.querySelector('.prose p') || document.body).fontSize) }));
      if (r.o > 0) overflow.push(`${w}px ${f} 溢出 ${r.o}px`);
      if (f.startsWith('articles/') && r.fs < 15) smallText.push(`${w}px ${f} 內文 ${r.fs}px`);
    }
    await ctx.close();
  }
  check('320／375／390／768／1280px：首頁、城市、讀利、向光、搜尋及 30 篇 QA 文章（含比較表）皆無水平溢位，文章內文字級 ≥ 15px', overflow.length === 0 && smallText.length === 0, [...overflow, ...smallText].slice(0, 4).join('；'));
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n第二批測試預覽：${results.length} 項，通過 ${results.length - failed}，失敗 ${failed}`);
process.exit(failed ? 1 : 0);
