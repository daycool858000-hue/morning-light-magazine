#!/usr/bin/env node
// 六大主題擴充（PR #11）QA 分批匯入機制的驗收測試。
// 前置：npm test 已建好 dist（一般預覽）、dist-production（正式版）、dist-qa（真實佇列）。
// 本測試另用 tests/fixtures/qa-expansion/QUEUE.json 範例佇列建置 dist-qa-expansion，檢查：
//   一、真實佇列：未開啟或未查核的項目不會進 QA；正式版與一般預覽不受影響。
//   二、範例佇列：單篇文章有獨立網址、來源、日期、分類與搜尋；讀利／向光只在指定時接在原清單之後；
//       同網址資源只補原卡、不同網址以簡潔入口呈現、縣市資源進城市篩選；未查核項目不出現。
//   三、錯誤情境：未查核卻開啟、slug 重複、自行標成核准、與長期入口同網址等，建置會失敗。
//   四、320／375／390／1280px（Chromium，及 CI 中的 WebKit）沒有水平溢位，入口可點高度 ≥ 44px。
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadQaExpansion, QA_EXPANSION_QUEUE } from '../scripts/lib/qa-expansion.mjs';
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
const FIXTURE = 'tests/fixtures/qa-expansion/QUEUE.json';
const OUT = 'dist-qa-expansion';
const QX = path.join(ROOT, OUT);
const readJson = async (f) => JSON.parse(await readFile(path.join(ROOT, f), 'utf8'));
const site = await readJson('config/site.json');
const categories = await readJson('content/categories.json');
const counties = await readJson('content/counties.json');
const resourceData = await readJson('content/resources.json');
const fixture = await readJson(FIXTURE);
const realQueue = await readJson(QA_EXPANSION_QUEUE);
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

// ---------- 一、真實佇列 ----------
const realArticles = realQueue.articles.filter((x) => x.importToQa);
const realResources = realQueue.resources.filter((x) => x.importToQa);
check('真實佇列：維持 not-approved，開啟匯入的項目全部已完成來源查核（有日期與查核紀錄）',
  realQueue.approvalStatus === 'not-approved' &&
  [...realArticles, ...realResources].every((x) => x.sourceCheck === 'source-checked' && /^\d{4}-\d{2}-\d{2}$/.test(x.sourceCheckedOn) && existsSync(path.join(ROOT, x.sourceCheckRecord || '-'))) &&
  [...realQueue.articles, ...realQueue.resources].every((x) => x.ownerPublicationApproval !== true && x.productionApproved !== true),
  `佇列文章 ${realQueue.articles.length} 篇（開啟 ${realArticles.length}）、資源 ${realQueue.resources.length} 筆（開啟 ${realResources.length}）`);
const qaFiles = (await readdir(path.join(ROOT, 'dist-qa/articles'))).map((f) => f.replace(/\.html$/, ''));
const unexpected = qaFiles.filter((s) => s.startsWith('exp-') && !realArticles.some((x) => x.slug === s));
check('真實佇列：dist-qa 只出現已開啟的擴充文章，未開啟的 22 篇候選不會出現', unexpected.length === 0, unexpected.join('、'));

const approvalsText = await readFile(path.join(ROOT, 'content/release-approvals.json'), 'utf8');
const markers = ['exp-', 'qa-x-', 'res-summary-qa', ...fixture.articles.map((a) => a.title), ...realQueue.articles.map((a) => a.title), ...fixture.resources.map((r) => r.name), ...realQueue.resources.map((r) => r.name)];
for (const [label, dir] of [['一般預覽版 dist', 'dist'], ['正式版 dist-production', 'dist-production']]) {
  const leaks = [];
  for (const f of await listFiles(path.join(ROOT, dir))) {
    if (!/\.(html|js|xml|txt)$/.test(f)) continue;
    const t = await read(dir, f);
    for (const m of markers) if (t.includes(m)) { leaks.push(`${f}：${m.slice(0, 24)}`); break; }
  }
  check(`發布隔離：${label} 不含任何擴充佇列文章、官方入口或補充文字`, leaks.length === 0, leaks.slice(0, 3).join('；'));
}
check('正式核准快照：沒有任何擴充佇列或範例項目', ![...realQueue.articles, ...fixture.articles].some((a) => approvalsText.includes(a.slug)) &&
  ![...realQueue.resources, ...fixture.resources].some((r) => approvalsText.includes(`"${r.id}"`)));

// 正式版即使誤設環境變數也不會讀佇列
execFileSync(process.execPath, ['scripts/build.mjs', '--mode=production', '--out=dist-production'], { cwd: ROOT, env: { ...process.env, QA_EXPANSION_QUEUE: FIXTURE }, stdio: 'pipe' });
const prodAfter = (await listFiles(path.join(ROOT, 'dist-production/articles')).catch(() => [])).filter((f) => f.startsWith('exp-'));
check('正式版建置忽略 QA_EXPANSION_QUEUE：不產生任何擴充文章頁', prodAfter.length === 0, prodAfter.join('、'));

// ---------- 二、範例佇列建置 ----------
execFileSync(process.execPath, ['scripts/build.mjs', '--mode=qa', `--out=${OUT}`], { cwd: ROOT, env: { ...process.env, QA_EXPANSION_QUEUE: FIXTURE }, stdio: 'pipe' });
const on = fixture.articles.filter((a) => a.importToQa);
const off = fixture.articles.filter((a) => !a.importToQa);
const idx = await read(OUT, 'assets/data/search-index.js');
const articleProblems = [];
for (const a of on) {
  const file = `articles/${a.slug}.html`;
  if (!existsSync(path.join(QX, file))) { articleProblems.push(`${a.slug} 沒有獨立頁`); continue; }
  const t = await read(OUT, file);
  const cat = categories.find((c) => c.id === a.category);
  if (!t.includes(`<h1>${a.title}</h1>`)) articleProblems.push(`${a.slug} 標題不符`);
  if (!t.includes(`來源查核：${a.sourceCheckedOn}`)) articleProblems.push(`${a.slug} 沒有查核日期`);
  if (!t.includes('未核准測試內容') || !t.includes('<meta name="robots" content="noindex, nofollow">')) articleProblems.push(`${a.slug} 缺少未核准標示或 noindex`);
  if (!t.includes(`<a href="../${cat.slug}">${cat.title}</a>`)) articleProblems.push(`${a.slug} 麵包屑分類不符`);
  const src = (/<div class="sources"><h2>參考來源<\/h2>[\s\S]*?<\/div>/.exec(t) || [''])[0];
  if (!/class="ext" rel="noopener noreferrer"/.test(src)) articleProblems.push(`${a.slug} 參考來源缺少外部連結`);
  if (/編輯對應|建議分類|範例檔尾說明|stopAt/.test(t)) articleProblems.push(`${a.slug} 編輯用文字進入網頁`);
  if (!(await read(OUT, cat.slug)).includes(`href="articles/${a.slug}.html"`)) articleProblems.push(`${a.slug} 分類頁沒有連結`);
  if (!idx.includes(`"url":"articles/${a.slug}.html"`)) articleProblems.push(`${a.slug} 不在搜尋索引`);
  for (const rel of a.related) if (!t.includes(`href="../articles/${rel}.html"`)) articleProblems.push(`${a.slug} 相關閱讀缺 ${rel}`);
}
const inlineNote = await read(OUT, `articles/${on[0].slug}.html`);
if (!inlineNote.includes('本站不收取家庭帳戶、收入或財產資料。')) articleProblems.push('單行來源後的讀者說明被丟棄');
if (!(await read(OUT, `articles/${on[1].slug}.html`)).includes('測試用來源說明')) articleProblems.push('清單式來源說明未保留');
check('範例佇列：開啟的 3 篇各有獨立網址、標題、查核日期、分類、參考來源、相關閱讀、搜尋索引、未核准標示與 noindex，編輯用文字不外露',
  articleProblems.length === 0, articleProblems.slice(0, 5).join('；'));

const offLeaks = [];
for (const a of off) {
  if (existsSync(path.join(QX, `articles/${a.slug}.html`))) offLeaks.push(`${a.slug} 產生了文章頁`);
  for (const f of await listFiles(QX)) {
    if (!/\.(html|js)$/.test(f)) continue;
    const t = await read(OUT, f);
    if (t.includes(a.slug) || t.includes(a.title)) { offLeaks.push(`${f} 含 ${a.slug}`); break; }
  }
}
for (const r of fixture.resources.filter((x) => !x.importToQa)) {
  for (const f of await listFiles(QX)) {
    if (/\.(html|js)$/.test(f) && (await read(OUT, f)).includes(r.url)) { offLeaks.push(`${f} 含未查核資源 ${r.id}`); break; }
  }
}
check('範例佇列：未完成來源查核（pending）的文章與資源完全不出現（文章頁、分類、搜尋皆無）', offLeaks.length === 0, offLeaks.join('；'));

// 讀利／向光：原有 23／13 篇順序不變，只在 directory 指定時接在最後
const qaQp = await read('dist-qa', 'quiet-power.html');
const qxQp = await read(OUT, 'quiet-power.html');
const qaToward = await read('dist-qa', 'toward-light.html');
const qxToward = await read(OUT, 'toward-light.html');
const readliRe = /<h3><a href="articles\/([^"]+)\.html">/g;
const towardRe = /<article class="toward-reading-card">\s*<a href="articles\/([^"]+)\.html">/g;
const readliBefore = links(qaQp, readliRe).filter((s) => !s.startsWith('exp-'));
const readliAfter = links(qxQp, readliRe);
const towardAfter = links(qxToward, towardRe);
const wantReadli = on.filter((a) => a.directory === 'readli').map((a) => a.slug);
const wantToward = on.filter((a) => a.directory === 'toward').map((a) => a.slug);
check('讀利／向光：原 23 篇與 13 篇順序完全不變；擴充文章只在佇列指定時接在最後，directory=none 不進兩目錄',
  readliBefore.length === 23 && JSON.stringify(readliAfter) === JSON.stringify([...readliBefore, ...wantReadli]) &&
  JSON.stringify(towardAfter) === JSON.stringify([...TOWARD_READING_SLUGS, ...wantToward]) &&
  qaToward.match(/toward-panel"/g)?.length === qxToward.match(/toward-panel"/g)?.length &&
  !on.filter((a) => a.directory === 'none').some((a) => qxQp.includes(a.slug) || qxToward.includes(a.slug)),
  `讀利 ${readliAfter.length}、向光 ${towardAfter.length}`);

// 官方資源三種呈現
const resProblems = [];
const same = fixture.resources.find((r) => r.id === 'FX-SAME');
const existing = resourceData.items.find((r) => r.url === same.url);
const careerHtml = await read(OUT, 'career.html');
const cardCount = (careerHtml.match(new RegExp(`id="res-${existing.id}"`, 'g')) || []).length;
if (cardCount !== 1) resProblems.push(`同網址原卡應只有 1 張，實際 ${cardCount}`);
const card = (new RegExp(`<article class="res-card" id="res-${existing.id}"[\\s\\S]*?</article>`).exec(careerHtml) || [''])[0];
if (!card.includes(same.purpose) || !card.includes('data-expansion="FX-SAME"')) resProblems.push('同網址補充文字沒有加在原卡');
if (careerHtml.includes('qa-x-FX-SAME')) resProblems.push('同網址資源另外產生了文字入口');
if (!/"url":"career\.html#res-mol"[^}]*範例補充/.test(idx)) resProblems.push('同網址補充文字沒有併入原卡搜尋');
const nat = fixture.resources.find((r) => r.id === 'FX-NAT');
const lifeHtml = await read(OUT, 'life-family.html');
const row = (/<li id="qa-x-FX-NAT">[\s\S]*?<\/li>/.exec(lifeHtml) || [''])[0];
if (!row.includes(`href="${nat.url}"`) || !row.includes('rel="noopener noreferrer"') || !row.includes('未核准測試內容') || !row.includes('來源查核：2026-10-16') || !row.includes('語言：中文、English')) resProblems.push('全國性不同網址入口的文字列不完整');
if (lifeHtml.indexOf('id="qa-x-FX-NAT"') < lifeHtml.indexOf('id="res-title"')) resProblems.push('文字入口應位於官方資源區之後');
if (!idx.includes('"url":"life-family.html#qa-x-FX-NAT"')) resProblems.push('文字入口不在搜尋索引');
const tpe = fixture.resources.find((r) => r.id === 'FX-TPE');
const cityHtml = await read(OUT, 'city.html');
if (!new RegExp(`id="res-qa-x-fx-tpe" data-res data-regions="taipei"`).test(cityHtml) || !cityHtml.includes(tpe.entryType)) resProblems.push('縣市入口沒有進城市頁縣市篩選');
if (!idx.includes('"url":"city.html#res-qa-x-fx-tpe"')) resProblems.push('縣市入口不在搜尋索引');
for (const p of ['life-family.html', 'career.html', 'health.html', 'law.html', 'learning.html', 'city.html']) {
  const urls = links(await read(OUT, p), /<a href="(https:[^"]+)" class="ext[^"]*" rel="noopener noreferrer">[^<]*(?:<span class="qa-x-arrow|前往官方網站)/g);
  if (new Set(urls).size !== urls.length) resProblems.push(`${p} 出現相同網址的重複入口`);
}
check('官方資源：同網址只在原卡補文字（不另建卡、搜尋可找到）；不同網址全國入口以簡潔文字列呈現；縣市入口進城市篩選；各頁無同網址重複入口',
  resProblems.length === 0, resProblems.join('；'));

// 舊有 36 篇在範例建置中仍全部存在，且頁面與 dist-qa 完全相同（擴充只新增，不改舊頁）
const oldSlugs = qaFiles.filter((s) => !s.startsWith('exp-'));
const changed = [];
for (const s of oldSlugs) {
  const a = await read('dist-qa', `articles/${s}.html`);
  const b = await read(OUT, `articles/${s}.html`).catch(() => '');
  if (a !== b) changed.push(s);
}
check('既有 36 篇：範例匯入後全部保留，文章頁內容與未匯入時完全相同', oldSlugs.length === 36 && changed.length === 0, changed.join('、'));
const untouched = [];
// law.html 也有勞動部卡（同時屬職涯與法律），會一起顯示同網址補充文字，故不列入
for (const f of ['index.html', 'support.html', 'activities.html', 'search.html', 'health.html']) {
  if ((await read('dist-qa', f)) !== (await read(OUT, f))) untouched.push(f);
}
check('首頁、支援資源、活動頁、搜尋頁及沒有範例內容的主題頁 HTML 與未匯入時完全相同（含全站小日曆）', untouched.length === 0, untouched.join('、'));

// ---------- 三、錯誤情境 ----------
const ctx = {
  categories, counties, serviceTypes: resourceData.serviceTypes, existingResources: resourceData.items,
  existingArticles: oldSlugs.map((slug) => ({ slug, title: slug })), queueFile: FIXTURE,
};
const clone = () => JSON.parse(JSON.stringify(fixture));
const rejects = async (label, mutate, pattern) => {
  const q = clone();
  mutate(q);
  try { await loadQaExpansion(ROOT, { ...ctx, queue: q }); return `${label}：沒有被擋下`; } catch (e) { return pattern.test(e.message) ? '' : `${label}：錯誤訊息不符 ${e.message.slice(0, 80)}`; }
};
const negative = (await Promise.all([
  rejects('未查核卻開啟', (q) => { q.articles[3].importToQa = true; }, /尚未完成來源查核/),
  rejects('缺查核紀錄', (q) => { q.articles[0].sourceCheckRecord = null; }, /來源查核紀錄/),
  rejects('slug 與既有重複', (q) => { q.articles[0].slug = 'exp-x'; ctx.existingArticles.push({ slug: 'exp-x', title: 'x' }); }, /slug 與既有文章重複/),
  rejects('自行標成核准', (q) => { q.articles[0].ownerPublicationApproval = true; }, /不可在 QA 佇列標成已核准/),
  rejects('佇列核准狀態被改', (q) => { q.approvalStatus = 'approved'; }, /approvalStatus/),
  rejects('未指定讀利／向光', (q) => { delete q.articles[0].directory; }, /directory/),
  rejects('分類與原稿不符', (q) => { q.articles[0].category = 'law'; }, /分類/),
  rejects('標題與原稿不符', (q) => { q.articles[0].title = '改過的標題'; }, /標題與原稿不同/),
  rejects('與長期官方入口同網址', (q) => { q.resources[1].url = 'https://if.tabf.org.tw/lectureList'; }, /長期官方入口|活動公告/),
  rejects('佇列內同網址', (q) => { q.resources[2].url = q.resources[1].url; }, /同網址/),
  rejects('縣市入口缺服務類型', (q) => { delete q.resources[2].serviceTypes; }, /serviceTypes/),
  rejects('原稿不在允許資料夾', (q) => { q.articles[0].sourceFile = 'docs/BRAND.md'; }, /原稿不存在或不在/),
])).filter(Boolean);
let outside = '';
try { await loadQaExpansion(ROOT, { ...ctx, queueFile: 'content/resources.json' }); outside = '佇列放在 content/ 沒有被擋下'; } catch { /* 預期 */ }
check('錯誤情境：未查核、缺查核紀錄、slug 重複、自行核准、未指定目錄、分類／標題不符、與長期入口同網址、縣市欄位不全、佇列位置錯誤，建置都會失敗',
  negative.length === 0 && !outside, [...negative, outside].filter(Boolean).join('；'));

// ---------- 四、手機與電腦版面 ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (!p.startsWith(BASE)) { res.writeHead(404); return res.end(); }
  p = p.slice(BASE.length) || 'index.html';
  if (p.endsWith('/')) p += 'index.html';
  try { const body = await readFile(path.join(QX, p)); res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(body); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4337, '127.0.0.1', r));
const ORIGIN = 'http://127.0.0.1:4337';
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
      for (const f of [...on.map((a) => `articles/${a.slug}.html`), 'life-family.html', 'career.html', 'learning.html', 'quiet-power.html', 'toward-light.html', 'city.html']) {
        await page.goto(`${ORIGIN}${BASE}${f}`);
        const r = await page.evaluate(() => ({
          o: document.documentElement.scrollWidth - innerWidth,
          fs: parseFloat(getComputedStyle(document.querySelector('.prose p') || document.body).fontSize),
          rows: [...document.querySelectorAll('.qa-x-list .qa-x-name')].map((a) => Math.round(a.getBoundingClientRect().height)),
        }));
        if (r.o > 0) problems.push(`${w}px ${f} 水平溢位 ${r.o}px`);
        if (f.startsWith('articles/') && r.fs < 15) problems.push(`${w}px ${f} 內文 ${r.fs}px`);
        if (r.rows.some((h) => h < 44)) problems.push(`${w}px ${f} 入口高度 ${r.rows.join(',')}`);
      }
      // 城市頁選臺北市後，範例縣市入口出現在「在地服務」；選其他縣市時隱藏
      await page.goto(`${ORIGIN}${BASE}city.html`);
      await page.selectOption('#county', 'taipei');
      const shown = await page.evaluate(() => { const c = document.getElementById('res-qa-x-fx-tpe'); return !!c && !c.hidden && c.parentElement.id === 'local-results'; });
      await page.selectOption('#county', 'kinmen');
      const hidden = await page.evaluate(() => document.getElementById('res-qa-x-fx-tpe').hidden);
      if (!shown || !hidden) problems.push(`${w}px 城市篩選：臺北市顯示 ${shown}、金門縣隱藏 ${hidden}`);
      // 搜尋可以找到範例文章並開啟
      await page.goto(`${ORIGIN}${BASE}search.html`);
      await page.fill('[data-search] input', '固定支出');
      await page.waitForTimeout(150);
      const hit = page.locator(`[data-search-results] a[href$="articles/${on[0].slug}.html"]`);
      if (!(await hit.count())) problems.push(`${w}px 搜尋找不到範例文章`);
      await ctxB.close();
    }
    await browser.close();
    check(`${name} 320／375／390／1280px：範例文章、主題頁文字入口、讀利、向光、城市頁無水平溢位，內文 ≥ 15px、入口 ≥ 44px，城市篩選與搜尋可用，無 JavaScript 錯誤`,
      problems.length === 0 && jsErrors.length === 0, [...problems, ...jsErrors].slice(0, 5).join('；'));
  }
} finally {
  server.close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n六大主題擴充匯入機制：${results.length} 項，通過 ${results.length - failed}，失敗 ${failed}`);
process.exit(failed ? 1 : 0);
