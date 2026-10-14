#!/usr/bin/env node
// 晨光生活誌 靜態網站產生器（無外部相依套件）
// 用法：node scripts/build.mjs [--mode=preview|production] [--out=dist]
//   preview    ：顯示所有未撤下的資料，並以標籤標示查核狀態；頁面加上「預覽版本」提示與 noindex。
//   production ：只輸出查核狀態為「已確認」且設定為公開的資料。

import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml as esc, parseFrontMatter, renderMarkdown } from './lib/markdown.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  }),
);
const MODE = args.mode === 'production' ? 'production' : 'preview';
const OUT = path.resolve(ROOT, args.out || 'dist');
const IS_PREVIEW = MODE === 'preview';

const STATUSES = ['已確認', '待確認', '需要修正', '已撤下'];
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());

// ---------------------------------------------------------------------------
// 讀取內容
// ---------------------------------------------------------------------------
const readJson = async (file) => JSON.parse(await readFile(path.join(ROOT, file), 'utf8'));

const site = await readJson('config/site.json');
const categories = await readJson('content/categories.json');
const counties = await readJson('content/counties.json');
const resourceData = await readJson('content/resources.json');
const hotlineData = await readJson('content/hotlines.json');
const eventData = await readJson('content/events.json');

async function readMarkdownDir(dir) {
  const full = path.join(ROOT, dir);
  const files = (await readdir(full)).filter((f) => f.endsWith('.md')).sort();
  return Promise.all(
    files.map(async (file) => {
      const { data, body } = parseFrontMatter(await readFile(path.join(full, file), 'utf8'));
      return { ...data, file: `${dir}/${file}`, name: file.replace(/\.md$/, ''), body };
    }),
  );
}
const articlesAll = await readMarkdownDir('content/articles');
const pagesAll = await readMarkdownDir('content/pages');

// ---------------------------------------------------------------------------
// 內容檢查：資料有誤時中止建置，避免把錯誤資料發布出去
// ---------------------------------------------------------------------------
const errors = [];
const categoryIds = new Set(categories.map((c) => c.id));
const countyIds = new Set(counties.map((c) => c.id));
const topicIds = new Set(categories.flatMap((c) => c.topics.map((t) => t.id)));
const serviceTypes = new Set(resourceData.serviceTypes);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isHttps = (v) => typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v);

const seen = new Set();
for (const r of resourceData.items) {
  const where = `resources.json → ${r.id || '(缺少 id)'}`;
  if (!r.id || seen.has(r.id)) errors.push(`${where}：id 缺少或重複`);
  seen.add(r.id);
  if (!r.name) errors.push(`${where}：缺少機構名稱`);
  if (!STATUSES.includes(r.status)) errors.push(`${where}：status 必須是 ${STATUSES.join('、')}`);
  if (r.checkedAt !== null && !isDate(r.checkedAt)) errors.push(`${where}：checkedAt 必須是 YYYY-MM-DD 或 null`);
  if (r.status === '已確認' && !isDate(r.checkedAt)) errors.push(`${where}：「已確認」的資料必須填寫實際查核日期`);
  if (!isHttps(r.url)) errors.push(`${where}：官方連結必須是 https 網址`);
  for (const c of r.categories) if (!categoryIds.has(c)) errors.push(`${where}：未知分類 ${c}`);
  for (const t of r.topics) if (!topicIds.has(t)) errors.push(`${where}：未知主題 ${t}`);
  for (const g of r.regions) if (g !== 'national' && !countyIds.has(g)) errors.push(`${where}：未知地區 ${g}`);
  for (const s of r.serviceTypes) if (!serviceTypes.has(s)) errors.push(`${where}：未知服務類型 ${s}`);
  for (const p of r.phones) if (!/^[0-9-]+$/.test(p.number)) errors.push(`${where}：電話只能包含數字與 -`);
  for (const s of r.sources) if (!isHttps(s.url)) errors.push(`${where}：來源網址必須是 https`);
}
for (const h of hotlineData.items) {
  if (!/^\d+$/.test(h.tel)) errors.push(`hotlines.json → ${h.id}：tel 只能是數字`);
  if (!STATUSES.includes(h.status)) errors.push(`hotlines.json → ${h.id}：status 不正確`);
}
for (const e of eventData.items) {
  const where = `events.json → ${e.id}`;
  if (!isDate(e.startDate) || !isDate(e.endDate)) errors.push(`${where}：日期格式需為 YYYY-MM-DD`);
  if (!isHttps(e.url)) errors.push(`${where}：活動頁面必須是 https 網址`);
  if (!STATUSES.includes(e.status)) errors.push(`${where}：status 不正確`);
}
for (const a of articlesAll) {
  const where = a.file;
  for (const key of ['title', 'slug', 'category', 'summary', 'published', 'updated', 'status', 'visibility']) {
    if (!a[key]) errors.push(`${where}：缺少 ${key}`);
  }
  if (a.slug && !/^[a-z0-9-]+$/.test(a.slug)) errors.push(`${where}：slug 只能使用小寫英文、數字與 -`);
  if (!STATUSES.includes(a.status)) errors.push(`${where}：status 不正確`);
  if (a.category !== 'guide' && !categoryIds.has(a.category)) errors.push(`${where}：未知分類 ${a.category}`);
  if (!['public', 'withdrawn'].includes(a.visibility)) errors.push(`${where}：visibility 需為 public 或 withdrawn`);
}
if (errors.length) {
  console.error('內容檢查失敗：\n- ' + errors.join('\n- '));
  process.exit(1);
}

// 依模式決定公開哪些資料
const isPublic = (status, published = true) =>
  published !== false && status !== '已撤下' && (IS_PREVIEW || status === '已確認');

const resources = resourceData.items.filter((r) => isPublic(r.status, r.published));
const hotlines = hotlineData.items.filter((h) => isPublic(h.status));
const channels = hotlineData.channels.filter((h) => isPublic(h.status));
const events = eventData.items
  .filter((e) => isPublic(e.status))
  .sort((a, b) => a.startDate.localeCompare(b.startDate));
const articles = articlesAll
  .filter((a) => a.visibility === 'public' && isPublic(a.status))
  .sort((a, b) => String(b.updated).localeCompare(String(a.updated)));

const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
const countyById = Object.fromEntries(counties.map((c) => [c.id, c]));
const categoryLabel = (id) => (id === 'guide' ? '使用指南' : catById[id]?.title || id);

// ---------------------------------------------------------------------------
// 圖示與共用片段
// ---------------------------------------------------------------------------
const iconCache = {};
for (const file of await readdir(path.join(ROOT, 'src/icons'))) {
  if (file.endsWith('.svg')) {
    iconCache[file.replace(/\.svg$/, '')] = (await readFile(path.join(ROOT, 'src/icons', file), 'utf8')).trim();
  }
}
function icon(name, cls = 'icon') {
  const svg = iconCache[name];
  if (!svg) throw new Error(`找不到圖示 ${name}`);
  return svg.replace('<svg ', `<svg class="${cls}" aria-hidden="true" focusable="false" `);
}

const AREAS = ['北部', '中部', '南部', '東部', '離島'];
const statusBadge = (status) => {
  const map = { 已確認: ['badge-ok', '已確認'], 待確認: ['badge-pending', '待查核'], 需要修正: ['badge-fix', '需要修正'] };
  const [cls, label] = map[status] || ['', status];
  return `<span class="badge ${cls}">${label}</span>`;
};
const extLink = (href, label, cls = '') =>
  `<a href="${esc(href)}" class="ext ${cls}" rel="noopener noreferrer">${label}<span class="visually-hidden">（外部網站）</span></a>`;

function regionLabel(regions) {
  return regions.map((g) => (g === 'national' ? '全國' : countyById[g]?.name || g)).join('、');
}

function resourceCard(r, { anchor = true } = {}) {
  const cat = catById[r.categories[0]];
  const iconName = cat ? cat.icon : 'support';
  const tone = cat ? `tone-${cat.tone}` : 'tone-green';
  const phones = r.phones
    .map((p) => `<a class="tel" href="tel:${esc(p.number)}">撥打 ${esc(p.number)}</a>`)
    .join('');
  const phoneInfo = r.phones.length
    ? `<dt>電話</dt><dd>${r.phones.map((p) => `${esc(p.label)}（服務時間：${esc(p.hours)}）`).join('<br>')}</dd>`
    : '';
  return `<article class="res-card"${anchor ? ` id="res-${esc(r.id)}"` : ''} data-res data-regions="${esc(r.regions.join(' '))}" data-types="${esc(r.serviceTypes.join('|'))}">
  <div class="res-head">${icon(iconName, `res-icon ${tone}`)}<div><h3>${esc(r.name)}</h3><div class="meta">${statusBadge(r.status)}<span>最後查核：${r.checkedAt ? esc(r.checkedAt) : '尚未查核'}</span></div></div></div>
  <ul class="tags">${r.serviceTypes.map((s) => `<li class="tag">${esc(s)}</li>`).join('')}</ul>
  <p>${esc(r.summary)}</p>
  <dl class="res-dl"><dt>對象</dt><dd>${esc(r.audience)}</dd><dt>地區</dt><dd>${esc(regionLabel(r.regions))}</dd>${phoneInfo}<dt>來源</dt><dd>${r.sources.map((s) => esc(s.title)).join('、')}</dd></dl>
  <div class="res-actions">${extLink(r.url, '前往官方網站')}${phones}</div>
</article>`;
}

function articleCard(a, prefix) {
  return `<article class="article-card">
  <div class="meta"><span class="tag">${esc(categoryLabel(a.category))}</span><span>更新：${esc(a.updated)}</span></div>
  <h3><a href="${prefix}articles/${esc(a.slug)}.html">${esc(a.title)}</a></h3>
  <p>${esc(a.summary)}</p>
</article>`;
}

function emptyBox(text) {
  return `<div class="empty"><p>${text}</p></div>`;
}

// ---------------------------------------------------------------------------
// 版面
// ---------------------------------------------------------------------------
function layout({ title, description, active = '', body, scripts = [], prefix = '', absolute = false }) {
  const base = absolute ? site.basePath : prefix;
  const fullTitle = title ? `${title}｜${site.name}` : `${site.name}｜${site.tagline}`;
  const navItems = site.nav
    .map((n) => `<li><a href="${base}${n.href}"${n.id === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`)
    .join('');
  const robots = IS_PREVIEW ? '<meta name="robots" content="noindex, nofollow">\n' : '';
  const previewBar = IS_PREVIEW
    ? `<div class="preview-bar" role="note">預覽版本｜內容查核中，尚未正式公開。標示「待查核」的資料請以官方網站為準。</div>`
    : '';
  const noticeBar = site.maintenanceNotice
    ? `<div class="notice-bar" role="note">${esc(site.maintenanceNotice)}</div>`
    : '';
  return `<!doctype html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'">
<meta name="referrer" content="no-referrer">
${robots}<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.description)}">
<meta name="theme-color" content="#FAF7EF">
<link rel="icon" href="${base}assets/icons/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}assets/css/main.css">
<script src="${base}assets/js/main.js"></script>
${scripts.map((s) => `<script src="${base}${s}" defer></script>`).join('\n')}
</head>
<body>
<a class="skip-link" href="#main">跳到主要內容</a>
${previewBar}${noticeBar}
<header class="site-header">
  <div class="wrap header-top">
    <a class="brand" href="${base}index.html">${icon('logo', 'brand-mark')}<span class="brand-text"><span class="brand-name">${esc(site.name)}</span><span class="brand-sub">${esc(site.englishName)}</span></span></a>
    <div class="header-actions">
      <a class="hdr-btn hide-sm" href="${base}search.html">${icon('search')}<span>搜尋</span></a>
      <a class="hdr-btn hide-sm" href="${base}support.html"${active === 'support' ? ' aria-current="page"' : ''}>${icon('leaf')}<span>支援資源</span></a>
      <button class="hdr-btn menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">${icon('menu', 'icon icon-menu')}${icon('close', 'icon icon-close')}<span class="label">選單</span></button>
      <a class="hdr-btn switch-screen" href="${esc(site.switchScreenUrl)}" rel="noreferrer noopener" data-switch-screen title="立即切換到 Google 首頁（不會清除瀏覽紀錄）">${icon('switch')}<span>切換畫面</span></a>
    </div>
  </div>
  <nav id="site-nav" class="site-nav" aria-label="主要導覽">
    <div class="wrap"><ul>${navItems}<li class="nav-extra nav-sep" aria-hidden="true"></li><li class="nav-extra"><a href="${base}search.html">搜尋全站</a></li><li class="nav-extra"><a href="${base}support.html">支援資源與求助專線</a></li></ul></div>
  </nav>
</header>
<main id="main" tabindex="-1">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <h2>${esc(site.name)}</h2>
        <p>免費、非營利的台灣女性生活資訊導航。本站整理公開資訊與官方入口，不承接個案，也不提供法律、醫療或心理專業服務。</p>
      </div>
      <div>
        <h2>關於本站</h2>
        <ul>
          <li><a href="${base}about.html">關於晨光生活誌</a></li>
          <li><a href="${base}verification.html">查核與更新說明</a></li>
          <li><a href="${base}disclaimer.html">網站免責聲明</a></li>
          <li><a href="${base}privacy.html">隱私宣告</a></li>
        </ul>
      </div>
      <div>
        <h2>快速前往</h2>
        <ul>
          <li><a href="${base}search.html">搜尋全站</a></li>
          <li><a href="${base}city.html">依縣市查詢資源</a></li>
          <li><a href="${base}support.html">支援資源與求助專線</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-legal">
      <p>提供外部機構連結，不代表本站與該機構有正式合作、授權或從屬關係。實際辦理請以主管機關或服務單位最新公告為準。</p>
      <p>本站不具報案或緊急救援功能。如有立即危險，請撥打 <a href="tel:110">110</a> 或 <a href="tel:119">119</a>。</p>
      <p>本站未使用訪客追蹤或分析工具。網站最後建置：${today}${IS_PREVIEW ? '（預覽版本）' : ''}</p>
    </div>
  </div>
</footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// 頁面
// ---------------------------------------------------------------------------
const pages = []; // { file, html }
const searchIndex = [];
let order = 0;
const addIndex = (type, title, text, url, keywords = '') =>
  searchIndex.push({ type, title, text, url, keywords, order: order++ });

function resourcesFor(predicate) {
  return resources.filter(predicate);
}

// ---------- 首頁 ----------
{
  const featuredIds = ['taiwanjobs', 'sfaa', 'laf', 'mohw-domhaoh', 'mol', 'edu'];
  const featured = featuredIds.map((id) => resources.find((r) => r.id === id)).filter(Boolean);
  const featuredArticles = articles.filter((a) => a.featured === true).slice(0, 3);
  const needs = categories.flatMap((c) => c.needs.map((n) => ({ ...n, cat: c }))).slice(0, 9);
  const learning = catById.learning;

  const body = `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="fade-in">
      <p class="hero-issue"><span>Morning Light</span><span>Issue 01</span><span>${today.slice(0, 4)}</span></p>
      <h1><span class="line">生活有很多選擇，</span><br><span class="line">也有很多值得理解的事。</span></h1>
      <p class="hero-lead">關於生活、工作、健康與關係，從你想了解的地方開始。</p>
      <div class="btn-row">
        <a class="btn" href="#topics">瀏覽生活主題</a>
        <a class="btn btn-ghost" href="city.html">依縣市查詢資源</a>
      </div>
    </div>
    <figure class="hero-art fade-in delay"><img src="assets/img/hero-morning.svg" width="560" height="500" alt="清晨的太陽從窗外升起，窗台上有盆栽、一杯熱茶與一本書。"></figure>
  </div>
</section>

<section class="section" id="topics" aria-labelledby="topics-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Six Topics</span><h2 id="topics-title">六個生活主題</h2><p>依照生活中常見的需要分類，每個主題都整理了官方制度與正式服務的入口。</p></div>
    <div class="cat-grid">
      ${categories
        .map(
          (c) => `<a class="cat-card tone-${c.tone}" href="${c.slug}">
        ${icon(c.icon, 'cat-icon')}
        <span class="cat-no">No.${c.no} · ${esc(c.kicker)}</span>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.short)}</p>
        <span class="cat-more">進入主題 →</span>
      </a>`,
        )
        .join('\n')}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="needs-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Start Here</span><h2 id="needs-title">從你想了解的事開始</h2></div>
    <ul class="need-list three">
      ${needs
        .map(
          (n) => `<li><a href="${n.cat.slug}#${n.topic === 'finder' ? 'finder' : n.topic}">${icon(n.cat.icon)}<span>${esc(n.text)}<small>${esc(n.cat.title)}</small></span></a></li>`,
        )
        .join('\n')}
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="articles-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Reading</span><h2 id="articles-title">實用文章精選</h2><p>簡短、實用的導讀，每篇都標示參考來源與最後更新時間。</p></div>
    ${
      featuredArticles.length
        ? `<div class="article-grid three">${featuredArticles.map((a) => articleCard(a, '')).join('\n')}</div>`
        : emptyBox('導讀文章正在撰寫與查核中，完成後會陸續上架。')
    }
    <p class="note" role="note">各主題的制度導讀文章將於資料查核完成後陸續上架（第二階段）。</p>
  </div>
</section>

<section class="section" aria-labelledby="res-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Official Resources</span><h2 id="res-title">官方資源推薦</h2><p>點擊後會直接前往原始機構網站。</p></div>
    ${featured.length ? `<div class="res-grid">${featured.map((r) => resourceCard(r, { anchor: false })).join('\n')}</div>` : emptyBox('官方資源正在查核中，完成後會陸續公開。')}
  </div>
</section>

<section class="section" aria-labelledby="city-title">
  <div class="wrap">
    <div class="band tone-blue">
      <div class="band-grid">
        <div>
          <span class="kicker">City Index</span>
          <h2 id="city-title">城市資源入口</h2>
          <p>選擇你所在的縣市，查詢婦女、家庭、就業與心理衛生等正式服務。不使用定位，也不保存你的選擇。</p>
          <a class="btn" href="city.html">開啟城市資源索引</a>
        </div>
        <div class="county-areas">
          ${AREAS.map(
            (area) => `<div class="county-area"><h3>${area}</h3>${counties
              .filter((c) => c.area === area)
              .map((c) => `<a class="county-chip" href="city.html#county=${c.id}">${esc(c.name)}</a>`)
              .join('')}</div>`,
          ).join('\n')}
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="learn-title">
  <div class="wrap">
    <div class="band tone-gold">
      <div class="band-grid">
        <div>
          <span class="kicker">Learning</span>
          <h2 id="learn-title">課程與學習活動</h2>
          <p>${esc(learning.intro)}</p>
          <a class="btn" href="learning.html">看看學習與活動</a>
        </div>
        <ul class="need-list">
          ${learning.topics
            .slice(0, 6)
            .map((t) => `<li><a href="learning.html#${t.id}">${icon('learning')}<span>${esc(t.title)}</span></a></li>`)
            .join('\n')}
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="about-title">
  <div class="wrap about-strip">
    <div>
      <span class="kicker">About</span>
      <h2 id="about-title">關於晨光生活誌</h2>
      <p>晨光生活誌是免費、非營利的資訊入口。我們整理已經存在的公共資訊、官方說明與專業機構，讓你更容易找到需要的資源。</p>
      <p>本站不設會員與留言，不接收個案資料，也不提供法律、醫療或心理專業服務；專業服務由各正式機構提供。</p>
      <div class="btn-row"><a class="btn btn-ghost" href="about.html">認識本站</a><a class="btn btn-ghost" href="verification.html">查核與更新說明</a></div>
    </div>
    <div class="note">
      <p><strong>需要支援時</strong></p>
      <p>如果你正面臨危險或需要協助，可以前往「<a href="support.html">支援資源</a>」頁，查看可直接撥打的正式專線。每頁右上角的「切換畫面」可快速切換到其他網站，但不會清除瀏覽紀錄。</p>
    </div>
  </div>
</section>`;
  pages.push({ file: 'index.html', html: layout({ title: '', active: 'home', body }) });
  addIndex('頁面', '首頁', site.description, 'index.html', '晨光生活誌 首頁');
}

// ---------- 六大分類頁 ----------
for (const c of categories) {
  if (c.id === 'city' || c.id === 'learning') continue; // 這兩頁有專屬版面
  const catResources = resourcesFor((r) => r.categories.includes(c.id));
  const catArticles = articles.filter((a) => a.category === c.id);
  const body = `
${categoryHero(c)}
<section class="section" aria-labelledby="need-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Start Here</span><h2 id="need-title">從需求開始</h2></div>
    <ul class="need-list three">${c.needs
      .map((n) => `<li><a href="#${n.topic}">${icon(c.icon)}<span>${esc(n.text)}</span></a></li>`)
      .join('')}</ul>
  </div>
</section>
${topicsSection(c)}
<section class="section" aria-labelledby="res-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Official Resources</span><h2 id="res-title">官方與正式機構入口</h2><p>點擊「前往官方網站」會直接進入原始機構網站。服務內容、資格與時間請以各機構公告為準。</p></div>
    ${catResources.length ? `<div class="res-grid">${catResources.map((r) => resourceCard(r)).join('\n')}</div>` : emptyBox('此主題的官方資源正在查核中，完成後會陸續公開。')}
  </div>
</section>
${articlesSection(catArticles)}`;
  pages.push({ file: c.slug, html: layout({ title: c.title, description: c.short, active: c.id, body }) });
}

function categoryHero(c) {
  return `<section class="page-hero tone-${c.tone}">
  <div class="wrap page-hero-inner">
    ${icon(c.icon, 'big-icon')}
    <div>
      <span class="kicker">No.${c.no} · ${esc(c.kicker)}</span>
      <h1>${esc(c.title)}</h1>
      <p class="lead">${esc(c.intro)}</p>
    </div>
  </div>
  <div class="wrap"><p class="note" role="note">${esc(c.notice)}</p></div>
</section>`;
}

function topicsSection(c) {
  return `<section class="section" aria-labelledby="topics-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Topics</span><h2 id="topics-title">主題索引</h2></div>
    <div class="topic-grid">
      ${c.topics
        .map((t) => {
          const related = resources.filter((r) => r.topics.includes(t.id));
          const list = related.length
            ? `<ul>${related.map((r) => `<li><a href="#res-${esc(r.id)}">${esc(r.name)}</a></li>`).join('')}</ul>`
            : `<p class="pending">官方入口整理與查核中。</p>`;
          return `<section class="topic" id="${esc(t.id)}"><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>${list}</section>`;
        })
        .join('\n')}
    </div>
  </div>
</section>`;
}

function articlesSection(list) {
  return `<section class="section" aria-labelledby="art-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Reading</span><h2 id="art-title">導讀文章</h2></div>
    ${list.length ? `<div class="article-grid">${list.map((a) => articleCard(a, '')).join('\n')}</div>` : emptyBox('此主題的導讀文章正在撰寫與查核中，完成後會陸續上架。')}
  </div>
</section>`;
}

// ---------- 城市與福利 ----------
{
  const c = catById.city;
  const body = `
${categoryHero(c)}
<section class="section" aria-labelledby="finder-title" id="finder">
  <div class="wrap">
    <div class="section-head"><span class="kicker">City Index</span><h2 id="finder-title">城市生活資源索引</h2><p>先選擇縣市，再依服務類型篩選。全台 22 個縣市都可以選擇；尚未完成查核的縣市，會先顯示全國性資源。</p></div>
    <div class="finder" data-finder>
      <div class="finder-js" hidden>
        <div class="finder-controls">
          <div class="field">
            <label for="county">縣市</label>
            <select id="county">
              <option value="">請選擇縣市</option>
              ${AREAS.map(
                (area) => `<optgroup label="${area}">${counties
                  .filter((x) => x.area === area)
                  .map((x) => `<option value="${x.id}">${esc(x.name)}</option>`)
                  .join('')}</optgroup>`,
              ).join('')}
            </select>
          </div>
          <div class="field">
            <label for="service-type">服務類型</label>
            <select id="service-type">
              <option value="">全部服務類型</option>
              ${resourceData.serviceTypes.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="county-areas" role="group" aria-label="快速選擇縣市">
          ${AREAS.map(
            (area) => `<div class="county-area"><h3>${area}</h3>${counties
              .filter((x) => x.area === area)
              .map((x) => `<button type="button" class="county-chip" data-county="${x.id}" aria-pressed="false">${esc(x.name)}</button>`)
              .join('')}</div>`,
          ).join('\n')}
        </div>
        <p class="finder-status" id="finder-status" role="status" aria-live="polite"></p>
      </div>
      <noscript><p>你的瀏覽器未啟用 JavaScript，因此無法使用縣市篩選。以下列出所有資源，你仍可以直接瀏覽。</p></noscript>
    </div>

    <div class="results-block">
      <h3 id="local-title">在地服務</h3>
      <div class="empty" id="local-empty" hidden><p></p></div>
      <div class="res-grid" id="local-results"></div>
    </div>
    <div class="results-block">
      <h3>全國性資源</h3>
      <div class="empty" id="national-empty" hidden><p>這個服務類型目前沒有已收錄的全國性資源。</p></div>
      <div class="res-grid" id="national-results">
        ${resources.map((r) => resourceCard(r)).join('\n')}
      </div>
    </div>
  </div>
</section>
${topicsSection(c)}`;
  pages.push({ file: c.slug, html: layout({ title: c.title, description: c.short, active: 'city', body, scripts: ['assets/js/city.js'] }) });
}

// ---------- 學習與活動 ----------
{
  const c = catById.learning;
  const catResources = resourcesFor((r) => r.categories.includes('learning'));
  const eventCards = events
    .map(
      (e) => `<article class="article-card" data-event-end="${esc(e.endDate)}">
  <div class="meta">${statusBadge(e.status)}<span>${esc(e.startDate)} – ${esc(e.endDate)}</span></div>
  <h3>${esc(e.title)}</h3>
  <dl class="res-dl"><dt>主辦</dt><dd>${esc(e.organizer)}</dd><dt>地區</dt><dd>${esc(regionLabel([e.region]))}</dd><dt>報名條件</dt><dd>${esc(e.eligibility)}</dd><dt>費用</dt><dd>${esc(e.fee)}</dd></dl>
  <div class="res-actions">${extLink(e.url, '官方活動頁面')}</div>
</article>`,
    )
    .join('\n');
  const body = `
${categoryHero(c)}
<section class="section" aria-labelledby="events-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Upcoming</span><h2 id="events-title">近期活動</h2><p>名額與報名狀態以主辦機構公告為準。活動結束後會自動從這裡隱藏，但不代表活動已取消。</p></div>
    <div class="article-grid">${eventCards}</div>
    <div class="empty" id="events-empty"${events.length ? ' hidden' : ''}><p>目前沒有已查核的近期活動。活動經常變動，建議直接查看下方的官方活動列表入口。</p></div>
  </div>
</section>
${topicsSection(c)}
<section class="section" aria-labelledby="res-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Official Lists</span><h2 id="res-title">官方課程與活動列表入口</h2></div>
    ${catResources.length ? `<div class="res-grid">${catResources.map((r) => resourceCard(r)).join('\n')}</div>` : emptyBox('官方活動列表入口正在查核中。')}
  </div>
</section>`;
  pages.push({ file: c.slug, html: layout({ title: c.title, description: c.short, active: 'learning', body, scripts: ['assets/js/events.js'] }) });
}

for (const c of categories) {
  addIndex('生活主題', c.title, c.short, c.slug, [c.kicker, c.intro, ...c.needs.map((n) => n.text)].join(' '));
  for (const t of c.topics) addIndex(`${c.title}・主題`, t.title, t.text, `${c.slug}#${t.id}`);
}

// ---------- 支援資源（緊急求助） ----------
{
  const supportResources = resources.filter((r) => ['npa', 'mohw-113', 'siarc', 'mohw-domhaoh', '1980', 'laf'].includes(r.id));
  const body = `
<section class="page-hero tone-green">
  <div class="wrap page-hero-inner">
    ${icon('support', 'big-icon')}
    <div>
      <span class="kicker">Support</span>
      <h1>支援資源與求助專線</h1>
      <p class="lead">需要協助的時候，可以直接聯繫下列正式服務。點擊號碼即可撥打。</p>
    </div>
  </div>
  <div class="wrap"><p class="note" role="note">本站不具報案、通報或緊急救援功能，也不接收任何求助訊息。點擊本頁按鈕不代表已完成報案或求助。如有立即危險，請直接撥打 110 或 119。</p></div>
</section>

<section class="section" aria-labelledby="hot-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Hotlines</span><h2 id="hot-title">可直接撥打的專線</h2><p>服務時間與內容以各主管機關公告為準${IS_PREVIEW ? '；標示「待查核」者尚未完成官方來源核對' : ''}。</p></div>
    ${
      hotlines.length
        ? `<div class="hotline-grid">${hotlines
            .map(
              (h) => `<article class="hotline">
        <div class="meta">${statusBadge(h.status)}</div>
        <span class="num" aria-hidden="true">${esc(h.number)}</span>
        <h3>${esc(h.number)} ${esc(h.title)}</h3>
        <p>${esc(h.purpose)}</p>
        <p>服務時間：${esc(h.hours)}</p>
        ${h.source ? `<p>來源：${extLink(h.source.url, esc(h.source.title))}</p>` : ''}
        <a class="call" href="tel:${esc(h.tel)}">撥打 ${esc(h.number)}</a>
      </article>`,
            )
            .join('\n')}</div>`
        : emptyBox('專線資訊正在依官方來源查核中。如有立即危險，請直接撥打 <a href="tel:110">110</a> 或 <a href="tel:119">119</a>。')
    }
  </div>
</section>

<section class="section" aria-labelledby="ch-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Other Channels</span><h2 id="ch-title">不方便通話時</h2></div>
    ${channels.length ? `<div class="res-grid">${channels
      .map(
        (ch) => `<article class="res-card"><div class="res-head">${icon('page', 'res-icon tone-blue')}<div><h3>${esc(ch.title)}</h3><div class="meta">${statusBadge(ch.status)}</div></div></div><p>${esc(ch.text)}</p><div class="res-actions">${extLink(ch.url, esc(ch.linkLabel))}</div></article>`,
      )
      .join('\n')}</div>` : emptyBox('簡訊與視訊報案資訊正在依官方來源查核中。')}
  </div>
</section>

<section class="section" aria-labelledby="safe-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Browsing Safely</span><h2 id="safe-title">基本的數位隱私與瀏覽安全</h2><p>以下為一般性提醒，無法保證完全隱藏裝置上的使用活動。</p></div>
    <ul class="tips">
      <li><strong>切換畫面</strong>每頁右上角的「切換畫面」會在原分頁直接前往 Google 首頁，並盡量讓「上一頁」不會回到本站。它不會刪除瀏覽紀錄。</li>
      <li><strong>無痕或私密瀏覽</strong>使用瀏覽器的無痕（私密）模式，關閉視窗後通常不會留下本機瀏覽紀錄，但網路服務商或裝置管理者仍可能看到連線活動。</li>
      <li><strong>清除瀏覽紀錄</strong>若在共用裝置上瀏覽，可以依瀏覽器說明清除特定網站的紀錄。全部清除可能反而引人注意，請依自身情況判斷。</li>
      <li><strong>留意共用帳號與裝置</strong>同一個 Google、Apple 帳號可能在多台裝置同步瀏覽紀錄；也可檢查手機的位置分享與帳號登入裝置清單。</li>
    </ul>
  </div>
</section>

<section class="section" aria-labelledby="org-title">
  <div class="wrap">
    <div class="section-head"><span class="kicker">Organizations</span><h2 id="org-title">相關正式機構</h2></div>
    ${supportResources.length ? `<div class="res-grid">${supportResources.map((r) => resourceCard(r)).join('\n')}</div>` : emptyBox('相關機構資訊正在查核中。')}
  </div>
</section>`;
  pages.push({ file: 'support.html', html: layout({ title: '支援資源與求助專線', description: '110、119、113、1925 等正式求助專線與數位隱私基本資訊。', active: 'support', body }) });
  addIndex('頁面', '支援資源與求助專線', '可直接撥打的正式專線、簡訊報案資訊與數位隱私提醒。', 'support.html', '緊急 求助 報案 專線 安全 ' + hotlines.map((h) => `${h.number} ${h.title}`).join(' '));
  for (const h of hotlines) addIndex('求助專線', `${h.number} ${h.title}`, h.purpose, 'support.html', '電話 專線');
}

// ---------- 說明頁（Markdown） ----------
const linkResolver = (prefix) => (href) => {
  if (/^(https?:|mailto:)/.test(href)) return { href, external: /^https?:/.test(href) };
  if (/^(#|tel:)/.test(href)) return { href, external: false };
  return { href: prefix + href.replace(/^\//, ''), external: false };
};

for (const p of pagesAll) {
  const body = `
<section class="page-hero plain">
  <div class="wrap page-hero-inner"><div>
    <span class="kicker">${esc(p.kicker || '')}</span>
    <h1>${esc(p.title)}</h1>
    <p class="lead">${esc(p.description || '')}</p>
    <p class="article-meta"><span>最後更新：${esc(p.updated)}</span></p>
  </div></div>
</section>
<section class="section"><div class="wrap prose">${renderMarkdown(p.body, { link: linkResolver('') })}</div></section>`;
  pages.push({ file: `${p.name}.html`, html: layout({ title: p.title, description: p.description, body }) });
  addIndex('關於本站', p.title, p.description || '', `${p.name}.html`);
}

// ---------- 文章 ----------
for (const a of articles) {
  const prefix = '../';
  const sources = [].concat(a.source || []).map((s) => {
    const [title, url] = String(s).split('|').map((x) => x.trim());
    const target = linkResolver(prefix)(url || '');
    return url
      ? `<li><a href="${esc(target.href)}"${target.external ? ' class="ext" rel="noopener noreferrer"' : ''}>${esc(title)}</a></li>`
      : `<li>${esc(title)}</li>`;
  });
  const backHref = a.category === 'guide' ? `${prefix}index.html` : `${prefix}${catById[a.category].slug}`;
  const body = `
<section class="page-hero plain">
  <div class="wrap page-hero-inner"><div>
    <nav class="breadcrumb" aria-label="頁面位置"><ol><li><a href="${prefix}index.html">首頁</a></li><li><a href="${backHref}">${esc(categoryLabel(a.category))}</a></li><li aria-current="page">文章</li></ol></nav>
    <h1>${esc(a.title)}</h1>
    <p class="lead">${esc(a.summary)}</p>
    <p class="article-meta"><span>發布：${esc(a.published)}</span><span>最後實質更新：${esc(a.updated)}</span>${statusBadge(a.status)}</p>
  </div></div>
</section>
<section class="section"><article class="wrap prose">
${renderMarkdown(a.body, { link: linkResolver(prefix) })}
<div class="sources"><h2>參考來源</h2><ul>${sources.join('')}</ul><p>本文為一般性資訊整理，實際辦理請以主管機關或服務單位最新公告為準。</p></div>
</article></section>`;
  pages.push({ file: `articles/${a.slug}.html`, html: layout({ title: a.title, description: a.summary, body, prefix }) });
  addIndex('文章', a.title, a.summary, `articles/${a.slug}.html`, categoryLabel(a.category));
}

// ---------- 資源與縣市索引 ----------
for (const r of resources) {
  const cat = catById[r.categories[0]];
  const url = cat && cat.id !== 'city' ? `${cat.slug}#res-${r.id}` : r.categories.length ? `city.html#res-${r.id}` : 'support.html';
  addIndex('機構與資源', r.name, r.summary, url, [r.serviceTypes.join(' '), regionLabel(r.regions), r.audience, r.phones.map((p) => p.number).join(' ')].join(' '));
}
for (const c of counties) {
  addIndex('縣市資源', `${c.name}的生活資源`, `依縣市查詢${c.name}可使用的正式服務據點。`, `city.html#county=${c.id}`, c.area);
}

// ---------- 搜尋頁 ----------
{
  const body = `
<section class="page-hero plain">
  <div class="wrap page-hero-inner"><div>
    <span class="kicker">Search</span>
    <h1>搜尋全站</h1>
    <p class="lead">可以搜尋主題、文章名稱、機構名稱、服務類型或縣市。搜尋只在你的瀏覽器中進行，不會保存或傳送你輸入的文字。</p>
  </div></div>
</section>
<section class="section">
  <div class="wrap">
    <div class="search-box search-js" hidden>
      <form id="search-form" role="search">
        <div class="field">
          <label for="q">想找什麼？</label>
          <input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="例如：育兒、法律扶助、臺中、心理">
        </div>
      </form>
      <p id="search-status" role="status" aria-live="polite"></p>
    </div>
    <noscript><p class="note">搜尋功能需要啟用 JavaScript。你也可以從下方的分類開始瀏覽。</p></noscript>
    <ul class="search-results" id="search-results"></ul>
    <div id="search-empty" hidden>
      <p>試試看換個詞，或從這些分類開始：</p>
    </div>
    <ul class="need-list three" aria-label="分類入口">
      ${categories.map((c) => `<li><a href="${c.slug}">${icon(c.icon)}<span>${esc(c.title)}<small>${esc(c.short)}</small></span></a></li>`).join('\n')}
    </ul>
  </div>
</section>`;
  pages.push({ file: 'search.html', html: layout({ title: '搜尋全站', body, scripts: ['assets/data/search-index.js', 'assets/js/search.js'] }) });
}

// ---------- 404 ----------
{
  const base = site.basePath;
  const body = `
<section class="notfound">
  <div class="wrap">
    ${icon('page', 'big-icon')}
    <h1>這一頁暫時找不到</h1>
    <p>頁面可能已經移動或撤下。可以回到首頁，或從生活主題重新開始。</p>
    <div class="btn-row"><a class="btn" href="${base}index.html">回到首頁</a><a class="btn btn-ghost" href="${base}search.html">搜尋全站</a></div>
  </div>
</section>`;
  pages.push({ file: '404.html', html: layout({ title: '找不到頁面', body, absolute: true }) });
}

// ---------------------------------------------------------------------------
// 輸出
// ---------------------------------------------------------------------------
async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from)) {
    const src = path.join(from, entry);
    const dst = path.join(to, entry);
    if ((await stat(src)).isDirectory()) await copyDir(src, dst);
    else await copyFile(src, dst);
  }
}

await rm(OUT, { recursive: true, force: true });
await mkdir(path.join(OUT, 'articles'), { recursive: true });
await copyDir(path.join(ROOT, 'src/assets'), path.join(OUT, 'assets'));
await copyDir(path.join(ROOT, 'src/icons'), path.join(OUT, 'assets/icons'));
await mkdir(path.join(OUT, 'assets/data'), { recursive: true });
await writeFile(
  path.join(OUT, 'assets/data/search-index.js'),
  `window.MLM_SEARCH_INDEX = ${JSON.stringify(searchIndex)};\n`,
);
for (const p of pages) await writeFile(path.join(OUT, p.file), p.html);
await writeFile(path.join(OUT, '.nojekyll'), '');
await writeFile(
  path.join(OUT, 'robots.txt'),
  IS_PREVIEW ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${site.productionUrl}sitemap.xml\n`,
);
if (!IS_PREVIEW) {
  const urls = pages.filter((p) => p.file !== '404.html').map((p) => `<url><loc>${site.productionUrl}${p.file}</loc></url>`);
  await writeFile(
    path.join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`,
  );
}

const pending = resourceData.items.filter((r) => r.status !== '已確認' && r.status !== '已撤下').length;
console.log(`建置完成（${MODE}）：${pages.length} 個頁面 → ${path.relative(ROOT, OUT) || '.'}`);
console.log(`資源：公開 ${resources.length} 筆／全部 ${resourceData.items.length} 筆（待查核 ${pending} 筆）；文章 ${articles.length} 篇；活動 ${events.length} 筆`);
