#!/usr/bin/env node
// 由己 SELF-AUTHORED 靜態網站產生器（無外部相依套件）
// 用法：node scripts/build.mjs [--mode=preview|production|qa] [--out=dist]
//   preview    ：顯示所有未撤下的資料，並以標籤標示查核狀態；頁面加上「預覽版本」提示與 noindex。
//   production ：機構／專線／圖片只輸出 AI 已核對且作者核准之特定版本；文章與活動維持原查核規則。
//   qa         ：加入 docs/ 內第二批、第三批尚未核准的候選資料，標示「未核准測試內容」。
//                QA 僅能依網站擁有人同意作為公開測試版；不得冒充正式內容或寫入正式發布核准。

import { readFile, writeFile, mkdir, rm, readdir, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml as esc, parseFrontMatter, renderMarkdown } from './lib/markdown.mjs';
import { approvedRecord, approvedPhotoMetadata, gitBlobSha } from './lib/release.mjs';
import { loadBatch2Resources, loadBatch2Articles } from './lib/qa-batch2.mjs';
import { loadBatch3OpenAccess } from './lib/qa-batch3.mjs';
import { loadBatch45Articles } from './lib/qa-batch45.mjs';
import { loadBatch6Articles } from './lib/qa-batch6.mjs';
import { loadQaActivities, loadQaNotices } from './lib/qa-activities.mjs';
import { resolveQaPortalRouting } from './lib/qa-portal-routing.mjs';
import { loadQaEnglishResources } from './lib/qa-english.mjs';
import { resolveTowardEditorial, TOWARD_READING_SLUGS } from './lib/toward-light-editorial.mjs';
import { loadQaExpansion } from './lib/qa-expansion.mjs';
import { loadQaPregnancyGuide } from './lib/qa-pregnancy-guide.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  }),
);
const MODE = ['production', 'qa'].includes(args.mode) ? args.mode : 'preview';
const IS_QA = MODE === 'qa';
const OUT = path.resolve(ROOT, args.out || (IS_QA ? 'dist-qa' : 'dist'));
// qa 是 preview 的延伸：與預覽版相同的顯示規則，再加上未核准的第二批候選內容
const IS_PREVIEW = MODE === 'preview' || IS_QA;
// 防呆：測試內容不得輸出到一般預覽或正式版資料夾
if (IS_QA && ['dist', 'dist-production'].includes(path.relative(ROOT, OUT))) {
  console.error('qa 模式不得輸出到 dist／dist-production，請使用 dist-qa。');
  process.exit(1);
}

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
const release = await readJson('content/release-approvals.json');
const approvals = release;

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

const qaResources = IS_QA ? await loadBatch2Resources(ROOT) : [];
const qaArticles = IS_QA ? await loadBatch2Articles(ROOT, categories) : [];
const qaBatch3 = IS_QA ? await loadBatch3OpenAccess(ROOT) : { resources: [], articles: [] };
const qaBatch45 = IS_QA ? await loadBatch45Articles(ROOT, categories) : [];
const qaBatch6 = IS_QA ? await loadBatch6Articles(ROOT, categories) : [];
const qaActivities = IS_QA ? await loadQaActivities(ROOT) : null;
const qaNotices = IS_QA ? await loadQaNotices(ROOT) : null;
// 六大主題擴充（PR #11）：只匯入佇列中已完成來源查核、且明確開啟的單篇或小批內容。
// QA_EXPANSION_QUEUE 只供自動化測試指定範例佇列；QA 部署工作流程不設定，固定讀 docs/QA-EXPANSION-IMPORT-QUEUE.json。
const qaExpansion = IS_QA ? await loadQaExpansion(ROOT, {
  categories, counties, serviceTypes: resourceData.serviceTypes,
  existingResources: [...resourceData.items, ...qaResources, ...qaBatch3.resources],
  existingArticles: [...articlesAll, ...qaArticles, ...qaBatch3.articles, ...qaBatch45, ...qaBatch6],
  queueFile: process.env.QA_EXPANSION_QUEUE,
}) : { articles: [], entries: [], cityResources: [], supplements: new Map() };
// 暫存模擬佇列（stagingOnly）只能輸出到獨立資料夾，不可進入公開 QA 部署所用的 dist-qa
if (qaExpansion.stagingOnly && path.basename(OUT) === 'dist-qa') {
  throw new Error(`${qaExpansion.queueFile} 是暫存模擬佇列，不可建置到 dist-qa；請用 --out 指定獨立資料夾`);
}
const seen = new Set();
const seenUrls = new Map();
for (const r of [...resourceData.items, ...qaResources, ...qaBatch3.resources]) {
  const where = `${r.qa ? '第二批候選' : 'resources.json'} → ${r.id || '(缺少 id)'}`;
  if (seenUrls.has(r.url)) errors.push(`${where}：網址與 ${seenUrls.get(r.url)} 重複`);
  seenUrls.set(r.url, r.id);
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

const baseResources = [...resourceData.items.filter((r) => IS_PREVIEW
  ? isPublic(r.status, r.published)
  : approvedRecord(r, approvals.resources, 'official-entry')), ...qaResources, ...qaBatch3.resources, ...qaExpansion.cityResources];
const resources = IS_QA ? await loadQaEnglishResources(ROOT, baseResources) : baseResources;
const qaPortalRouting = IS_QA ? resolveQaPortalRouting(qaActivities.items, resources) : { primary: [], reused: [] };
// QA-only：生活與家庭 01「懷孕與生育相關福利」的四段導覽（未核准，不進 preview／production）
const qaPregnancyGuide = IS_QA ? await loadQaPregnancyGuide(ROOT, resources) : null;
const hotlines = hotlineData.items.filter((h) => IS_PREVIEW
  ? isPublic(h.status)
  : approvedRecord(h, approvals.hotlines, 'hotline-purpose-hours'));
const channels = hotlineData.channels.filter((h) => IS_PREVIEW
  ? isPublic(h.status)
  : approvedRecord(h, approvals.channels, 'official-channel'));
const events = eventData.items
  .filter((e) => isPublic(e.status))
  .sort((a, b) => a.startDate.localeCompare(b.startDate));
const articles = [...articlesAll.filter((a) => a.visibility === 'public' && isPublic(a.status)), ...qaArticles, ...qaBatch3.articles, ...qaBatch45, ...qaBatch6, ...qaExpansion.articles]
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
// QA 全站小日曆的圖示：直接內嵌，不新增 src/icons 檔案，避免正式版與一般預覽的資產改變。
const CALENDAR_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path class="act-cal-dot" d="M8 13.5h2.5v2.5H8z" fill="currentColor" stroke="none"/></svg>';
const qaBadge = (x) => (x?.qa ? '<span class="badge badge-qa">未核准測試內容</span>' : '');
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

// ---------------------------------------------------------------------------
// 攝影素材
// ---------------------------------------------------------------------------
const photoData = await readJson('content/photos.json');
const photoById = Object.fromEntries(photoData.items.map((p) => [p.id, p]));
// PHOTO_OUT 可指定其他素材輸出資料夾（自動化測試使用）
const PHOTO_DIR = path.resolve(ROOT, process.env.PHOTO_OUT || 'src/assets/photos');
const generatedPath = path.join(PHOTO_DIR, 'generated.json');
const generated = existsSync(generatedPath) ? JSON.parse(await readFile(generatedPath, 'utf8')) : {};
// 核准的圖片同時鎖定原始 PNG、裁切設定與全部正式輸出檔的 Git blob 指紋。
// 任何檔案被替換或重新處理，舊核准不自動延伸到新內容。
const approvedPhotoIds = new Set();
const approvedPhotoAssetNames = new Set();
if (!IS_PREVIEW) {
  for (const photoItem of photoData.items) {
    if (!approvedPhotoMetadata(photoItem, approvals.photos, generated)) continue;
    const entry = approvals.photos[photoItem.id];
    const original = path.join(ROOT, 'content/photos/originals', `${photoItem.id}.png`);
    if (!existsSync(original) || gitBlobSha(await readFile(original)) !== entry.originalGitBlobSha) continue;
    const filenames = Object.keys(entry.assets);
    let valid = filenames.length > 0;
    for (const filename of filenames) {
      if (!filename.startsWith(`${photoItem.id}-`) || !/\.(webp|jpg)$/.test(filename)) { valid = false; break; }
      const asset = path.join(PHOTO_DIR, filename);
      if (!existsSync(asset) || gitBlobSha(await readFile(asset)) !== entry.assets[filename]) { valid = false; break; }
    }
    if (!valid) continue;
    approvedPhotoIds.add(photoItem.id);
    for (const filename of filenames) approvedPhotoAssetNames.add(filename);
  }
}
const photoErrors = [];
for (const p of photoData.items) {
  if (!['待補', '待檢查', '已檢查'].includes(p.status)) photoErrors.push(`photos.json → ${p.id}：status 不正確`);
  if (p.status === '已檢查' && (!p.license || !p.source || !isDate(p.checkedAt))) {
    photoErrors.push(`photos.json → ${p.id}：「已檢查」的素材必須填寫 source、license 與 checkedAt`);
  }
}
if (photoErrors.length) {
  console.error('素材檢查失敗：\n- ' + photoErrors.join('\n- '));
  process.exit(1);
}
const ASPECT_CLASS = (aspect) => `ar-${aspect.replace(':', 'x')}`;

/** 素材是否可以顯示：已產生檔案，且（預覽版）或（正式版匹配已核准版本） */
function photoReady(id, crop) {
  const p = photoById[id];
  if (!p || !generated[id]?.[crop]) return false;
  return IS_PREVIEW || approvedPhotoIds.has(id);
}

/**
 * 輸出 <picture>。素材尚未提供時：預覽版顯示「攝影素材待補」框，正式版顯示無文字的色塊。
 * @param {string} id
 * @param {string} crop 預設裁切
 * @param {{prefix?: string, sizes?: string, eager?: boolean, cls?: string, art?: {crop: string, media: string}[]}} opts
 */
function photo(id, crop, { prefix = '', sizes = '100vw', eager = false, cls = '', art = [] } = {}) {
  const p = photoById[id];
  if (!p) throw new Error(`photos.json 沒有 ${id}`);
  const aspect = p.crops[crop].aspect;
  if (!photoReady(id, crop)) {
    const label = IS_PREVIEW
      ? `<span class="ph-label"><strong>攝影素材待補</strong>${esc(p.title)}<small>${esc(id)} · ${[crop, ...art.map((a) => a.crop)].map((c) => p.crops[c].aspect).join(' / ')}</small></span>`
      : '';
    const artCls = art.map((a) => `ph-${a.crop}-${ASPECT_CLASS(p.crops[a.crop].aspect)}`).join(' ');
    return `<div class="photo photo-ph ${ASPECT_CLASS(aspect)} ${artCls} ${cls}"${IS_PREVIEW ? ` role="img" aria-label="攝影素材待補：${esc(p.title)}"` : ' aria-hidden="true"'}>${label}</div>`;
  }
  const srcset = (c) => generated[id][c].widths.map((w) => `${prefix}assets/photos/${id}-${c}-${w}.webp ${w}w`).join(', ');
  const g = generated[id][crop];
  const [aw, ah] = aspect.split(':').map(Number);
  const w = g.fallback;
  const h = Math.round((w * ah) / aw);
  const sources = art
    .filter((a) => photoReady(id, a.crop))
    .map((a) => `<source media="${a.media}" type="image/webp" srcset="${srcset(a.crop)}" sizes="100vw">`)
    .join('');
  return `<picture class="photo ${ASPECT_CLASS(aspect)} ${cls}">${sources}<source type="image/webp" srcset="${srcset(crop)}" sizes="${sizes}"><img src="${prefix}assets/photos/${id}-${crop}-${w}.jpg" width="${w}" height="${h}" alt="${esc(p.alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></picture>`;
}

// ---------------------------------------------------------------------------
// 共用卡片
// ---------------------------------------------------------------------------
function resourceCard(r, { anchor = true } = {}) {
  const cat = catById[r.categories[0]];
  const iconName = cat ? cat.icon : 'support';
  // 基本入口核准僅含機構與服務入口資訊，不連帶核准個人適用資格及詳細通話時段。
  const basicOnly = !IS_PREVIEW && r.review?.level === 'official-entry';
  const phones = basicOnly ? '' : r.phones
    .map((p) => `<a class="tel" href="tel:${esc(p.number)}">撥打 ${esc(p.number)}</a>`)
    .join('');
  const phoneInfo = basicOnly ? '' : r.phones.length
    ? `<dt>電話</dt><dd>${r.phones.map((p) => `${esc(p.label)}（服務時間：${esc(p.hours)}）`).join('<br>')}</dd>`
    : '';
  const englishName = r.nameEn ? `<p class="res-title-en" lang="en">${esc(r.nameEn)}</p>` : '';
  const englishSummary = (r.summaryEn ? `<p class="res-summary-en" lang="en">${esc(r.summaryEn)}</p>` : '') + expansionSupplement(r);
  const englishLink = r.officialEnglishUrl && r.officialEnglishUrl !== r.url ? extLink(r.officialEnglishUrl, 'English official information', 'res-english-link') : '';
  return `<article class="res-card"${anchor ? ` id="res-${esc(r.id)}"` : ''} data-res data-regions="${esc(r.regions.join(' '))}" data-types="${esc(r.serviceTypes.join('|'))}">
  <header class="res-head">
    ${icon(iconName, 'res-icon')}
    <div class="res-title">
      <h3>${esc(r.name)}</h3>
      ${englishName}
      <p class="res-types">${r.serviceTypes.map(esc).join('・')}</p>
    </div>
  </header>
  <p class="res-summary">${esc(r.summary)}${IS_QA && r.id === 'open-culture-events' ? ' 也能從此入口查詢展演、講座、導覽預約與活動報名，費用及資格依主辦公告。' : ''}</p>
  ${englishSummary}
  <dl class="res-dl">${basicOnly ? '' : `<dt>對象</dt><dd>${esc(r.audience)}</dd>`}<dt>地區</dt><dd>${esc(regionLabel(r.regions))}</dd>${r.entryType ? `<dt>入口類型</dt><dd>${esc(r.entryType)}</dd>` : ''}${r.usage ? `<dt>使用方式</dt><dd class="res-usage">${esc(r.usage)}</dd>` : ''}${phoneInfo}<dt>來源</dt><dd>${r.sources.map((s) => esc(s.title)).join('、')}</dd></dl>
  <footer class="res-foot">
    <div class="meta">${basicOnly ? `<span class="badge badge-ok">官方入口已核對（AI 協助）</span><span>核對：${esc(r.review.date)}｜僅入口與基本簡介</span>` : `${qaBadge(r)}${statusBadge(r.status)}<span>最後查核：${r.checkedAt ? esc(r.checkedAt) : '尚未查核'}</span>`}</div>
    <div class="res-actions">${extLink(r.url, '前往官方網站')}${englishLink}${phones}</div>
  </footer>
</article>`;
}

// 擴充佇列中與這張卡片同網址的官方資源：不建第二張卡，只在原卡補一段用途說明。
function expansionSupplement(r) {
  const notes = IS_QA ? qaExpansion.supplements.get(r.id) : null;
  if (!notes?.length) return '';
  return notes.map((n) => `<p class="res-summary-qa" data-expansion="${esc(n.id)}">補充：${esc(n.text)} <span class="badge badge-qa">未核准測試內容</span></p>`).join('');
}

// 擴充佇列中網址不同的全國性官方入口：在所屬主題頁以簡潔文字列呈現，不新增大型機構卡。
function expansionEntries(categoryId) {
  const items = IS_QA ? qaExpansion.entries.filter((x) => x.category === categoryId) : [];
  if (!items.length) return '';
  return `<div class="qa-x-links">
      <h3 id="qa-x-${esc(categoryId)}-title">更多官方入口</h3>
      <ul class="qa-x-list">${items.map((x) => `<li id="qa-x-${esc(x.id)}">
        ${extLink(x.url, esc(x.name), 'qa-x-name')}
        <p>${esc(x.purpose)}</p>
        <small>${esc(regionLabel(x.regions))}${x.languages.length ? `｜語言：${esc(x.languages.join('、'))}` : ''}${x.caution ? `｜${esc(x.caution)}` : ''}｜來源查核：${esc(x.checkedOn)} ${qaBadge(x)}</small>
      </li>`).join('')}</ul>
    </div>`;
}

function articleImageId(a) {
  const id = `article-${a.slug}`;
  // 選用素材尚未提供時，文章維持純文字版面，不顯示待補框
  return photoById[id] && (generated[id] || photoById[id].required) ? id : null;
}

function articleCard(a, prefix, { withImage = true, readli = false } = {}) {
  const imgId = withImage ? articleImageId(a) : null;
  const href = `${prefix}articles/${esc(a.slug)}.html`;
  const label = `<span class="pill">${esc(categoryLabel(a.category))}</span>${qaBadge(a)}`;
  if (imgId) {
    return `<article class="story">
  <a class="story-media" href="${href}" tabindex="-1" aria-hidden="true">${photo(imgId, 'card', { prefix, sizes: '(min-width: 1000px) 380px, (min-width: 700px) 50vw, 100vw' })}${label}</a>
  <div class="story-body">
    ${readli ? `<span class="readli-inline-kind">${esc(categoryLabel(a.category))}</span>` : ''}
    <h3><a href="${href}">${esc(a.title)}</a></h3>
    <p>${esc(a.summary)}</p>
    <p class="story-date">更新：${esc(a.updated)}</p>
  </div>
</article>`;
  }
  return `<article class="story story-text">
  <div class="story-body">
    ${label}
    <h3><a href="${href}">${esc(a.title)}</a></h3>
    <p>${esc(a.summary)}</p>
    <p class="story-date">更新：${esc(a.updated)}</p>
  </div>
</article>`;
}

function emptyBox(text) {
  return `<div class="empty"><p>${text}</p></div>`;
}

function sectionHead(kicker, id, title, text = '', extra = '') {
  return `<div class="section-head"><div><span class="kicker">${kicker}</span><h2 id="${id}">${title}</h2>${text ? `<p>${text}</p>` : ''}</div>${extra}</div>`;
}

function searchBox({ id, placeholder, limit = 50 }) {
  return `<div class="search-box" data-search data-search-limit="${limit}">
  <form class="search-form" role="search" data-search-form>
    <label class="visually-hidden" for="${id}">搜尋全站</label>
    ${icon('search', 'icon search-icon')}
    <input id="${id}" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(placeholder)}" data-search-input>
    <button type="button" class="search-clear" data-search-clear aria-label="清除搜尋文字" title="清除搜尋文字" hidden>×</button>
    <button type="submit" class="search-submit">搜尋</button>
  </form>
  <p class="search-status" role="status" aria-live="polite" data-search-status></p>
  <ul class="search-results" data-search-results></ul>
  <div class="search-empty" data-search-empty hidden><p>找不到相符的內容。試試看換個詞，或從生活主題開始瀏覽。</p></div>
</div>`;
}

// ---------------------------------------------------------------------------
// 版面
// ---------------------------------------------------------------------------
/** 品牌標誌：葉枝圖形＋「由己」＋ SELF-AUTHORED 與主題說明，作為一組完整標誌 */
function brandLockup() {
  return `${icon('logo', 'brand-mark')}<span class="brand-name">${esc(site.name)}</span><span class="brand-meta"><span class="brand-en">${esc(site.englishName)}</span><span class="brand-sub">${esc(site.tagline)}</span></span>`;
}
// ---------------------------------------------------------------------------
function layout({ title, description, active = '', body, scripts = [], prefix = '', absolute = false, bodyClass = '' }) {
  const base = absolute ? site.basePath : prefix;
  const brandFull = `${site.name} ${site.englishName}`;
  const fullTitle = title ? `${title}｜${brandFull}` : `${brandFull}｜${site.tagline}`;
  const navItems = site.nav
    .map((n) => `<li><a href="${base}${n.href}"${n.id === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`)
    .join('');
  // 頁首兩個主要目錄：中文＋英文一起呈現
  const dirLinks = site.directories
    .map((d) => `<a class="dir-link" href="${base}${d.href}"${d.id === active ? ' aria-current="page"' : ''}><span class="dir-zh">${esc(d.zh)}</span><span class="dir-en">${esc(d.en)}</span></a>`)
    .join('');
  const robots = IS_PREVIEW ? '<meta name="robots" content="noindex, nofollow">\n' : '';
  const previewBar = IS_QA
    ? `<div class="preview-bar qa-bar" role="note">未核准測試內容｜第二批 23 筆地方入口與 12 篇導讀、第三批 9 筆自主學習／生活資訊入口與 5 篇原創導讀、第四及第五批 13 篇導讀、第六批 6 篇城市福利導讀、最新擴充 9 篇生活／學習文章與 11 筆不同網址的長期官方查詢入口，均供公開測試，尚未核准正式發布；部分外站報名另有條件。</div>`
    : IS_PREVIEW
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
<meta name="application-name" content="${esc(brandFull)}">
<meta property="og:site_name" content="${esc(brandFull)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta name="theme-color" content="#FAF6EF">
<link rel="icon" href="${base}assets/icons/logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}assets/css/main.css?v=20261015search-clear-v2">
<script src="${base}assets/js/main.js"></script>
${IS_QA ? `<script src="${base}assets/js/qa-calendar.js"></script>
` : ''}${scripts.map((s) => `<script src="${base}${s}${s === 'assets/js/search.js' ? '?v=20261015search-clear-v2' : ''}" defer></script>`).join('\n')}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
<a class="skip-link" href="#main">跳到主要內容</a>
${previewBar}${noticeBar}
<header class="site-header">
  <div class="wrap header-top">
    <a class="brand" href="${base}index.html" aria-label="${esc(brandFull)}：回到首頁">${brandLockup()}</a>
    <nav class="dir-nav" aria-label="主要目錄">${dirLinks}</nav>
    <div class="header-actions">
      <a class="hdr-btn hide-sm" href="${base}search.html">${icon('search')}<span>搜尋</span></a>
      <button class="hdr-btn menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">${icon('menu', 'icon icon-menu')}${icon('close', 'icon icon-close')}<span class="label">選單</span></button>
      <a class="hdr-btn switch-screen" href="${esc(site.switchScreenUrl)}" rel="noreferrer noopener" data-switch-screen title="立即切換到 Google 首頁（不會清除瀏覽紀錄）">${icon('switch')}<span>切換畫面</span></a>
    </div>
  </div>
  <nav id="site-nav" class="site-nav" aria-label="主要導覽">
    <div class="wrap"><ul>${navItems}<li class="nav-extra nav-sep" aria-hidden="true"></li><li class="nav-extra"><a href="${base}search.html">搜尋全站</a></li></ul></div>
  </nav>
</header>
<main id="main" tabindex="-1">
${body}
</main>
<footer class="site-footer${IS_QA ? ' has-cal' : ''}">
  <div class="wrap">
    <p class="footer-name">${brandLockup()}</p>
    <div class="footer-legal">
      <p>本站整理公開資訊與官方入口，不提供法律、醫療、心理專業服務或緊急救援；外部連結不代表合作關係。如有立即危險，請撥打 <a href="tel:110">110</a> 或 <a href="tel:119">119</a>。完整說明見<a href="${base}about.html">關於由己</a>。</p>
      <p>本站照片風格圖片皆為 AI 生成的示意圖像，非實地拍攝。</p>
    </div>
  </div>
</footer>
${IS_QA ? `${activitiesEntry(base, active)}\n` : ''}</body>
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

function needList(items) {
  return `<ol class="need-list">${items
    .map(
      (n, i) => `<li><a href="${n.href}"><span class="need-no">${String(i + 1).padStart(2, '0')}</span><span class="need-text">${esc(n.text)}${n.cat ? `<small>${esc(n.cat)}</small>` : ''}</span><span class="need-arrow" aria-hidden="true">→</span></a></li>`,
    )
    .join('')}</ol>`;
}

function countyChips(asLinks) {
  return AREAS.map(
    (area) => `<div class="county-area"><h3>${area}</h3><div class="chips">${counties
      .filter((c) => c.area === area)
      .map((c) =>
        asLinks
          ? `<a class="county-chip" href="city.html#county=${c.id}">${esc(c.name)}</a>`
          : `<button type="button" class="county-chip" data-county="${c.id}" aria-pressed="false">${esc(c.name)}</button>`,
      )
      .join('')}</div></div>`,
  ).join('\n');
}

// ---------- 首頁（入口型：主視覺、六大主題、四個快捷入口） ----------
const FEATURED_RESOURCE_IDS = ['taiwanjobs', 'sfaa', 'laf', 'mohw-domhaoh'];
const dirById = Object.fromEntries(site.directories.map((d) => [d.id, d]));
// QA 版目錄頁首文案（docs/DIRECTORY-INTRO-COPY-ONE-PASS-QA-SPEC-2026-10-16.md，編輯分支）。
// config/site.json 為正式版與一般預覽共用，故只在 QA 覆寫，不改共用設定。
const QA_DIRECTORY_COPY = {
  'quiet-power': {
    lead: '從家庭、職場、身心健康到法律與權益，整理生活中值得了解的知識、制度與公共資源。',
    tip: '可以依主題閱讀文章，也能直接搜尋想了解的問題；需要申辦或使用服務時，再前往正式來源確認。',
  },
  'toward-light': {
    lead: '從學習、藝文、創業到生活技能與各種活動，循著興趣探索不同主題，閱讀文章並認識更多可能的學習機會。',
  },
};
const dirFor = (id) => (IS_QA && QA_DIRECTORY_COPY[id] ? { ...dirById[id], lead: QA_DIRECTORY_COPY[id].lead } : dirById[id]);

/** 兩個目錄頁共用：放在頁面最前面的「支援資源」入口（連往同一個既有支援資源頁） */
function supportEntry(prefix = '') {
  return `<a class="support-entry" href="${prefix}support.html">${icon('muscle', 'support-entry-icon')}<span class="support-entry-text"><strong>支援資源</strong><small>查看正式求助專線與相關機構</small></span><span class="support-entry-arrow" aria-hidden="true">→</span></a>`;
}

{
  const quick = [
    `<li><a class="quick quick-urgent" href="tel:110">${icon('flashlight', 'quick-icon icon-flashlight')}<span class="quick-zh">有急事</span><span class="visually-hidden">（撥打 110）</span></a></li>`,
    ...['quiet-power', 'toward-light'].map((id) => `<li><a class="quick" href="${dirById[id].href}"><span class="quick-zh">${esc(dirById[id].zh)}</span><span class="quick-en">${esc(dirById[id].en)}</span></a></li>`),
    `<li><a class="quick" href="about.html"><span class="quick-zh">關於由己</span><span class="quick-en">ABOUT</span></a></li>`,
  ];
  const body = `
<section class="hero" aria-labelledby="hero-title">
  <div class="hero-media">
    ${photo('home-hero', 'wide', { eager: true, cls: 'hero-photo', art: [{ crop: 'portrait', media: '(max-width: 699px)' }] })}
  </div>
  <div class="wrap hero-inner">
    <div class="hero-copy fade-in">
      <p class="hero-kicker">${esc(site.tagline)}</p>
      <h1 id="hero-title"><span class="line">生活有很多選擇，</span><span class="line">也有很多值得理解的事。</span></h1>
      <p class="hero-lead">${esc(site.slogan)}</p>
      ${searchBox({ id: 'home-q', placeholder: '搜尋主題、機構或縣市，例如：育兒、法律扶助', limit: 6 })}
    </div>
  </div>
</section>

<section class="section cats" id="topics" aria-labelledby="topics-title">
  <div class="wrap">
    ${sectionHead('Six Topics', 'topics-title', '六個生活主題')}
    <ul class="cat-row">
      ${categories
        .map(
          (c) => `<li><a class="cat-card" href="${c.slug}">
        ${photo(c.photo, 'card', { sizes: '(min-width: 1100px) 190px, (min-width: 700px) 33vw, 50vw' })}
        <span class="cat-body">
          <span class="cat-title">${icon(c.icon, 'cat-icon')}<span>${esc(c.title)}</span></span>
          <span class="cat-tag">${esc(c.tagline)}</span>
        </span>
      </a></li>`,
        )
        .join('\n')}
    </ul>
  </div>
</section>

<section class="section quick-section" aria-labelledby="quick-title">
  <div class="wrap">
    <h2 id="quick-title" class="visually-hidden">快捷入口</h2>
    <ul class="quick-grid">${quick.join('')}</ul>
  </div>
</section>`;
  pages.push({ file: 'index.html', html: layout({ title: '', active: 'home', body, bodyClass: 'home', scripts: ['assets/data/search-index.js', 'assets/js/search.js'] }) });
  addIndex('頁面', '首頁', site.description, 'index.html', `${site.name} ${site.englishName} 首頁`);
}

// ---------- 近期活動與講座（QA）：全站小日曆＋已公布活動消息頁 ----------
// 小日曆由 layout() 放進每一個 QA 頁面（正式版、一般預覽沒有）。首次進站約 3 秒後浮現、之後同一分頁跨頁常駐，
// 由 src/qa-assets/js/qa-calendar.js 控制；沒有 JavaScript 時直接顯示。
function activitiesEntry(base = '', active = '') {
  return `<a class="act-entry" href="${base}activities.html" aria-label="近期活動與講座：查看已公布的活動消息"${active === 'activities' ? ' aria-current="page"' : ''}><span class="act-entry-icon">${CALENDAR_SVG}</span><span class="act-entry-label">近期活動</span></a>`;
}
const zhDate = (d) => { const [y, m, day] = d.split('-').map(Number); return `${y} 年 ${m} 月 ${day} 日`; };
const noticeHtml = (n) => `<li class="notice" id="${esc(n.id)}" data-act-until="${esc(n.visibleUntil)}">
        <p class="notice-meta"><span class="notice-type${n.announcementType === 'plan' ? ' is-plan' : ''}">${esc(n.typeLabel)}</span><span class="notice-cat">${esc(n.category)}</span></p>
        <h3 class="notice-title">${esc(n.title)}</h3>
        <dl class="notice-facts">
          <div><dt>日期</dt><dd>${n.startDate ? `<time datetime="${esc(n.startDate)}">${esc(n.dateLabel)}</time>` : esc(n.dateLabel)}</dd></div>
          <div><dt>地區</dt><dd>${esc(n.region)}</dd></div>
          <div><dt>主辦</dt><dd>${esc(n.organizer)}</dd></div>${n.publishedAt ? `
          <div><dt>公告</dt><dd><time datetime="${esc(n.publishedAt)}">${zhDate(n.publishedAt)}</time>官方公布</dd></div>` : ''}
        </dl>
        <p class="notice-summary">${esc(n.summary)}</p>
        <p class="notice-caution">${esc(n.eligibilityCaution)}</p>
        <a class="notice-link" href="${esc(n.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看官方公告<span class="visually-hidden">：${esc(n.title)}（外部網站，另開新分頁）</span><span class="act-ext" aria-hidden="true">↗</span></a>
      </li>`;

if (IS_QA) {
  const { groups, items, checkedOn } = qaActivities;
  const notices = qaNotices.items;
  const gid = (g) => `act-group-${groups.indexOf(g) + 1}`;
  const itemHtml = (it) => `<li class="act-item" id="${esc(it.id)}">
        <a class="act-name" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${esc(it.name)}<span class="visually-hidden">（外部網站，另開新分頁）</span><span class="act-ext" aria-hidden="true">↗</span></a>
        <p class="act-org">${esc(it.org)}｜${esc(it.region)}</p>
        <p class="act-purpose">${esc(it.purpose)}</p>
        <p class="act-caution">${esc(it.caution)}</p>
      </li>`;
  const lead = '2026 年 11 月至 2027 年底，政府、公立場館與正式機構已公布的活動、講座、展覽與課程消息。';
  const body = `
<section class="page-head act-head" aria-labelledby="page-title">
  <div class="wrap">
    <nav class="breadcrumb" aria-label="頁面位置"><ol><li><a href="index.html">首頁</a></li><li aria-current="page">近期活動與講座</li></ol></nav>
    <h1 id="page-title">近期活動與講座</h1>
    <p class="lead">${lead}</p>
    <p class="act-intro">每一則都附官方公告連結。日期、費用、參加方式與資格以主辦單位最新公告為準；官方還沒公布的細節會標「詳情待公告」。《由己》不代為報名，也不蒐集任何資料。已結束的活動會在你瀏覽時自動隱藏。</p>
    <p class="act-intro"><span class="badge badge-qa">未核准測試內容</span> 來源核對：${esc(qaNotices.checkedAt)}（AI 編輯查核，尚未經網站擁有人核准）</p>
  </div>
</section>
<section class="section act-list" aria-labelledby="notices-title">
  <div class="wrap">
    <h2 id="notices-title" class="notices-title">已公布的活動消息</h2>
    <ol class="notice-list" data-act-list>
      ${notices.map(noticeHtml).join('\n      ')}
    </ol>
    <p class="notice-empty" id="notices-empty"${notices.length ? ' hidden' : ''}>目前沒有尚未結束的已公布活動；查到新的官方公告後會再加入。</p>
    <p class="notice-more">其他月份目前查無正式公告，所以先不列出，也不會預先猜測日期。</p>
  </div>
</section>
<section class="section act-list act-portals" aria-labelledby="portals-title">
  <div class="wrap">
    <h2 id="portals-title">想自己查更多：長期官方查詢入口</h2>
    <p class="act-intro">以下是政府與公共機構持續更新的課程、講座與活動查詢網站，不是特定場次；來源核對：${esc(checkedOn)}。</p>
    <nav class="act-groups" aria-label="查詢入口主題"><ul>${groups.map((g) => `<li><a href="#${gid(g)}">${esc(g)}</a></li>`).join('')}</ul></nav>
    ${groups.map((g) => `<section class="act-group" aria-labelledby="${gid(g)}">
      <h3 id="${gid(g)}">${esc(g)}</h3>
      <ul class="act-items">${items.filter((it) => it.group === g).map(itemHtml).join('')}</ul>
    </section>`).join('\n    ')}
    <p class="act-back"><a href="index.html">← 回到首頁</a></p>
  </div>
</section>`;
  pages.push({ file: 'activities.html', html: layout({ title: '近期活動與講座', description: lead, active: 'activities', body, bodyClass: 'activities', scripts: ['assets/js/qa-activities.js'] }) });
  addIndex('頁面', '近期活動與講座', lead, 'activities.html', '活動 講座 課程 研習 展覽 書展 科學節 日曆 activities events lectures workshops courses exhibitions calendar finance career health arts culture library family learning');
  for (const n of notices) searchIndex.push({ type: '活動消息', title: n.title, text: `${n.dateLabel}｜${n.organizer}｜${n.region}`, url: `activities.html#${n.id}`, keywords: `${n.category} ${n.typeLabel} 活動 講座 展覽`, until: n.visibleUntil, order: order++ });
  for (const it of items) {
    const reused = qaPortalRouting.reused.find((r) => r.id === it.id);
    const category = qaPortalRouting.primary.find((r) => r.id === it.id)?.category;
    const dest = reused ? `learning.html#res-${reused.existingResourceId}` : `${catById[category].slug}#portal-${it.id}`;
    addIndex('活動與講座', it.name, `${it.org}｜${it.purpose}`, dest, `${it.group} 官方查詢入口 ${it.region} ${it.keywordsEn || ''}`);
  }
}

// extra：放在支援資源入口正下方的額外內容（目前只有 QA 讀利專欄的「從你想了解的事開始」跳轉）
function dirHead(d, tip = '', extra = '') {
  return `<section class="page-head dir-head" aria-labelledby="page-title">
  <div class="wrap">
    <nav class="breadcrumb" aria-label="頁面位置"><ol><li><a href="index.html">首頁</a></li><li aria-current="page">${esc(d.zh)}</li></ol></nav>
    <h1 id="page-title" class="dir-title"><span class="dir-title-zh">${esc(d.zh)}</span><span class="dir-title-en">${esc(d.en)}</span></h1>
    <p class="lead">${esc(d.lead)}</p>
    ${tip ? `<p class="dir-tip">${esc(tip)}</p>` : ''}
    ${supportEntry()}${extra}
  </div>
</section>`;
}

// ---------- 讀利專欄｜THE CONSIDERED PAGE（文章、常見需求、各主題閱讀方向） ----------
// 讀利／向光分別展示不同文章，既有六大分類和搜尋仍連到同一原始文章。
// 讀利優先呈現福利、法律、安全、健康及個人財務，避免以「同一天更新」決定閱讀重要性。
const READLI_PRIORITY = [
  'batch6-welfare-overview',
  'batch5-harassment-three-laws',
  'batch5-phone-emergency-sos',
  'batch5-preventive-health-screening',
  'batch6-income-support-emergency-aid',
  'batch4-labor-insurance-pension',
  'batch2-08',
  'batch2-02',
];
const readliPriority = new Map(READLI_PRIORITY.map((slug, i) => [slug, i]));
const towardReadingSet = new Set(TOWARD_READING_SLUGS);
// 擴充文章不自動進讀利／向光：只有佇列 directory 明確指定時才接在原有清單之後，原 36 篇順序不變。
const directoryArticles = articles.filter(a => !a.expansion);
const readliBase = IS_QA ? directoryArticles.filter(a => !towardReadingSet.has(a.slug)).sort((a, b) =>
  (readliPriority.get(a.slug) ?? Infinity) - (readliPriority.get(b.slug) ?? Infinity)
) : articles;
const readliArticles = [...readliBase, ...qaExpansion.articles.filter(a => a.directory === 'readli')];
const towardExtra = qaExpansion.articles.filter(a => a.directory === 'toward');
if (IS_QA && (directoryArticles.length !== readliBase.length + towardReadingSet.size ||
  TOWARD_READING_SLUGS.some(slug => !articles.some(a => a.slug === slug)) ||
  READLI_PRIORITY.some(slug => towardReadingSet.has(slug)))) {
  throw new Error('讀利／向光分流出現缺篇、重複或跨目錄混入');
}
if (IS_QA && READLI_PRIORITY.some((slug) => !articles.some((a) => a.slug === slug))) {
  throw new Error('讀利優先文章有不存在的 slug');
}
{
  const d = dirFor('quiet-power');
  const needs = categories.flatMap((c) => c.needs.map((n) => ({ text: n.text, cat: c.title, href: `${c.slug}#${n.topic === 'finder' ? 'finder' : n.topic}` })));
  const body = `
${dirHead(d, IS_QA ? QA_DIRECTORY_COPY['quiet-power'].tip : '依照自己的需要選擇生活主題，也可以直接搜尋關鍵字。找到相關資源後，點選連結前往官方網站。', IS_QA ? `
    <p class="dir-jump"><a href="#needs-title">從你想了解的事開始<span aria-hidden="true">&nbsp;↓</span></a></p>` : '')}
${articles.length ? `<section class="section" aria-labelledby="articles-title">
  <div class="wrap">
    ${sectionHead('Reading', 'articles-title', '導讀文章')}
    <div class="story-grid">${readliArticles.map((a) => articleCard(a, '', { readli: IS_QA })).join('\n')}</div>
  </div>
</section>` : ''}
<section class="section needs" aria-labelledby="needs-title">
  <div class="wrap needs-grid">
    <div class="needs-intro">
      <span class="kicker">Start Here</span>
      <h2 id="needs-title">從你想了解的事開始</h2>
      <p>不必先知道機關名稱。選一件你想了解的事，就能找到對應的主題與官方入口。</p>
    </div>
    ${needList(needs)}
  </div>
</section>
<section class="section" aria-labelledby="bytopic-title">
  <div class="wrap">
    ${sectionHead('By Topic', 'bytopic-title', '依主題閱讀')}
    <ul class="cat-list">
      ${categories.map((c) => `<li><a href="${c.slug}">${icon(c.icon, 'cat-icon')}<span><strong>${esc(c.title)}</strong><small>${esc(c.tagline)}</small></span></a></li>`).join('\n')}
    </ul>
  </div>
</section>`;
  pages.push({ file: d.href, html: layout({ title: `${d.zh}｜${d.en}`, description: d.lead, active: d.id, body, bodyClass: IS_QA ? 'dir-page readli-reading' : 'dir-page' }) });
  addIndex('目錄', `${d.zh}｜${d.en}`, d.lead, d.href, '讀利 專欄 文章 閱讀 知識 常見需求 支援資源');
}

// ---------- 向光｜TOWARD OPEN SKIES ----------
// 八索引固定兩欄四排：每排兩個入口後面接該排的文章清單（預設收起）。用核取方塊＋label 切換，不需 JavaScript；
// 打開時清單出現在該排正下方、橫跨兩欄，八個入口的位置不會互換或單獨落到上一排。
function towardRows(topics) {
  const rows = [];
  for (let i = 0; i < topics.length; i += 2) {
    const pair = topics.slice(i, i + 2);
    rows.push(pair.map((t) => `<input type="checkbox" class="toward-toggle" id="toward-toggle-${esc(t.id)}" aria-controls="toward-${esc(t.id)}"><label class="toward-entry" for="toward-toggle-${esc(t.id)}"><span class="toward-topic-title">${esc(t.title)}</span><span class="toward-topic-arrow" aria-hidden="true">→</span></label>`).join('')
      + pair.map((t) => `<div class="toward-panel" id="toward-${esc(t.id)}" data-topic="${esc(t.id)}"><p class="toward-panel-title">${esc(t.title)}</p><ul class="toward-story-links">${t.stories.map((a) => `<li><a href="articles/${esc(a.slug)}.html">${esc(a.title)}<span class="visually-hidden">，閱讀文章</span></a></li>`).join('')}</ul></div>`).join(''));
  }
  return rows.join('\n      ');
}
// QA 以編輯式閱讀入口連到既有同一篇文章；正式／一般預覽保留原頁，避免未核准變更滲出。
{
  const d = dirFor('toward-light');
  const learning = catById.learning;
  const editorial = IS_QA ? resolveTowardEditorial(articles, resources) : null;
  const featured = FEATURED_RESOURCE_IDS.map((id) => resources.find((r) => r.id === id)).filter(Boolean);
  const body = IS_QA ? `
${dirHead(d)}
<section class="section toward-index" aria-labelledby="toward-index-title">
  <div class="wrap">
    <span class="kicker">Explore</span>
    <h2 id="toward-index-title">依興趣找到文章</h2>
    <div class="toward-link-list">
      ${towardRows(editorial.topics)}
    </div>
  </div>
</section>
<section class="section toward-featured" aria-labelledby="toward-featured-title">
  <div class="wrap">
    ${sectionHead('Explore Reading', 'toward-featured-title', '探索文章', '藝文、公開學習、培訓及創業等文章都可以直接從下方打開閱讀。')}
    <div class="toward-reading-grid">${[...editorial.gallery, ...towardExtra].map((a) => `<article class="toward-reading-card">
      <a href="articles/${esc(a.slug)}.html"><span class="toward-reading-kind">${esc(categoryLabel(a.category))}</span><h3>${esc(a.title)}</h3><span class="toward-reading-go">閱讀文章 <span aria-hidden="true">→</span></span></a>
    </article>`).join('\n')}</div>
  </div>
</section>
<section class="section toward-more" aria-labelledby="toward-more-title">
  <div class="wrap">
    ${sectionHead('Continue Exploring', 'toward-more-title', '還想繼續探索？', '可以到六大生活主題查詢相關知識與服務，也可以從正式活動入口查閱當期安排。')}
    <div class="toward-more-grid">
      <a class="toward-compact-link" href="learning.html"><strong>學習與活動</strong><span>更多公開課程與正式學習資源 →</span></a>
      <a class="toward-compact-link" href="city.html"><strong>各縣市生活資源</strong><span>前往城市與福利，選擇縣市 →</span></a>
    </div>
  </div>
</section>
<section class="section toward-official" aria-labelledby="toward-official-title">
  <div class="wrap">
    ${sectionHead('Official Links', 'toward-official-title', '延伸官方入口', '活動日期、報名資格與費用請以主辦機構當期公告為準。')}
    <ul class="toward-official-links">${editorial.official.map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(r.name)}</span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul>
  </div>
</section>` : `
${dirHead(d)}
<section class="section feature reverse" aria-labelledby="learn-title">
  <div class="wrap feature-grid">
    <div class="feature-media">${photo('home-learning-band', 'band', { sizes: '(min-width: 900px) 50vw, 100vw' })}</div>
    <div class="feature-copy">
      <span class="kicker">Learning</span>
      <h2 id="learn-title">課程與學習活動</h2>
      <p>${esc(learning.intro)}</p>
      <ul class="link-list">
        ${learning.topics.map((t) => `<li><a href="learning.html#${t.id}">${esc(t.title)}</a></li>`).join('\n')}
      </ul>
      <div class="btn-row"><a class="btn btn-ghost" href="learning.html">前往學習與活動</a><a class="btn btn-ghost" href="learning.html#events-title">查看近期活動</a></div>
    </div>
  </div>
</section>
<section class="section feature" aria-labelledby="city-title">
  <div class="wrap feature-grid">
    <div class="feature-media">${photo('home-city-band', 'band', { sizes: '(min-width: 900px) 50vw, 100vw' })}</div>
    <div class="feature-copy">
      <span class="kicker">City Index</span>
      <h2 id="city-title">城市資源入口</h2>
      <p>選擇你所在的縣市，查詢可使用的正式服務；各縣市在地據點陸續整理中。不使用定位，也不保存你的選擇。</p>
      <div class="county-areas">${countyChips(true)}</div>
      <a class="btn" href="city.html">開啟城市資源索引</a>
    </div>
  </div>
</section>
<section class="section" aria-labelledby="res-title">
  <div class="wrap">
    ${sectionHead('Official Resources', 'res-title', '相關官方資源', '點擊後會直接前往原始機構網站。各主題的完整資源，請見六大生活主題頁。')}
    ${featured.length ? `<div class="res-grid">${featured.map((r) => resourceCard(r, { anchor: false })).join('\n')}</div>` : emptyBox('官方資源正在查核中，完成後會陸續公開。')}
  </div>
</section>`;
  pages.push({ file: d.href, html: layout({ title: `${d.zh}｜${d.en}`, description: d.lead, active: d.id, body, bodyClass: IS_QA ? 'dir-page toward-reading' : 'dir-page' }) });
  addIndex('目錄', `${d.zh}｜${d.en}`, d.lead, d.href, IS_QA ? '向光 學習 活動 課程 生活探索 文章 藝文 文化 創業 親職 婦女中心 就業培訓 家庭教育 生活技能 公開課程' : '向光 學習 活動 課程 生活探索 城市 縣市 官方資源 支援資源');
}

// ---------- 分類頁共用 ----------
function categoryHero(c) {
  return `<section class="cat-hero" aria-labelledby="page-title">
  <div class="cat-hero-media">${photo(c.photo, 'banner', { eager: true, art: [{ crop: 'card', media: '(max-width: 699px)' }] })}${photoById[c.photo]?.caption && photoReady(c.photo, 'banner') ? `<p class="photo-caption">${esc(photoById[c.photo].caption)}</p>` : ''}</div>
  <div class="wrap">
    <div class="cat-hero-panel">
      <nav class="breadcrumb" aria-label="頁面位置"><ol><li><a href="index.html">首頁</a></li><li aria-current="page">${esc(c.title)}</li></ol></nav>
      <p class="cat-hero-kicker">${icon(c.icon, 'cat-hero-icon')}<span>No.${c.no} · ${esc(c.kicker)}</span></p>
      <h1 id="page-title">${esc(c.title)}</h1>
      <p class="lead">${esc(c.intro)}</p>
      ${IS_QA && c.id !== 'city' ? `<p class="cat-hero-jump"><a href="${c.id === 'learning' ? '#topics-title' : '#need-title'}">${c.id === 'learning' ? '直接探索學習主題' : '從你想了解的事開始'}<span aria-hidden="true">&nbsp;↓</span></a></p>` : ''}
    </div>
    <p class="note" role="note">${esc(c.notice)}</p>
  </div>
</section>`;
}

function topicsSection(c) {
  return `<section class="section" aria-labelledby="topics-title">
  <div class="wrap">
    ${sectionHead('Topics', 'topics-title', '主題索引')}
    <ol class="topic-list">
      ${c.topics
        .map((t, i) => {
          const related = resources.filter((r) => r.topics.includes(t.id));
          const guide = qaPregnancyGuide && c.id === qaPregnancyGuide.category && t.id === qaPregnancyGuide.topic ? qaPregnancyGuide : null;
          if (guide) return `<li class="topic" id="${esc(t.id)}"><span class="topic-no">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(t.title)}</h3><p>${esc(guide.topicText)}</p><p class="topic-guide-link"><a href="#${esc(guide.anchor)}">${esc(guide.topicLinkText)}<span aria-hidden="true">&nbsp;→</span></a></p></div></li>`;
          const list = related.length
            ? `<ul class="topic-links">${related.map((r) => `<li><a href="#res-${esc(r.id)}">${esc(r.name)}</a></li>`).join('')}</ul>`
            : `<p class="pending">官方入口整理與查核中。</p>`;
          return `<li class="topic" id="${esc(t.id)}"><span class="topic-no">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>${list}</div></li>`;
        })
        .join('\n')}
    </ol>
  </div>
</section>`;
}

// QA-only：主題 01 的精簡閱讀區。四段文字＋原頁官方連結（附用途），不做資源卡、不收任何資料。
function pregnancyGuideSection(c) {
  const g = qaPregnancyGuide;
  if (!g || c.id !== g.category) return '';
  const ext = (l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.name)}<span aria-hidden="true">↗</span><span class="visually-hidden">（外部網站，另開新視窗）</span></a><p>${esc(l.purpose)}</p><small>${esc(l.org)}｜${esc(l.level)}</small></li>`;
  const inner = (l) => `<li><a href="${esc(l.href)}">${esc(l.text)}<span aria-hidden="true">&nbsp;→</span></a></li>`;
  return `<section class="section preg-guide" id="${esc(g.anchor)}" aria-labelledby="${esc(g.anchor)}-title">
  <div class="wrap">
    ${sectionHead('Pregnancy &amp; Birth', `${esc(g.anchor)}-title`, esc(g.title), esc(g.intro))}
    <p class="preg-guide-qa"><span class="badge badge-qa">未核准測試內容</span> 來源查核：${esc(g.checkedOn)}（AI 編輯查核，尚未經網站擁有人核准）</p>
    <ol class="preg-steps">
      ${g.steps
        .map((s) => `<li class="preg-step">
        ${[
          `<h3><span class="preg-no" aria-hidden="true">${esc(s.no)}</span>${esc(s.title)}</h3>`,
          s.body.map((p) => `<p>${esc(p)}</p>`).join(''),
          `<ul class="preg-links" aria-label="${esc(s.title)}｜官方原頁">${s.links.map(ext).join('')}</ul>`,
          s.afterLinks ? `<p class="preg-after">${esc(s.afterLinks)}</p>` : '',
          s.internal.length ? `<ul class="preg-inner" aria-label="${esc(s.title)}｜站內延伸">${s.internal.map(inner).join('')}</ul>` : '',
        ].filter(Boolean).join('\n        ')}
      </li>`)
        .join('\n      ')}
    </ol>
    <ul class="preg-inner preg-next" aria-label="同頁其他主題">${g.next.map(inner).join('')}<li><a href="#${esc(g.topic)}">回到主題索引<span aria-hidden="true">&nbsp;↑</span></a></li></ul>
    <p class="preg-closing">${esc(g.closing)}</p>
  </div>
</section>`;
}

function articlesSection(list) {
  return `<section class="section" aria-labelledby="art-title">
  <div class="wrap">
    ${sectionHead('Reading', 'art-title', '導讀文章')}
    ${list.length ? `<div class="story-grid">${list.map((a) => articleCard(a, '')).join('\n')}</div>` : emptyBox('此主題的導讀文章正在撰寫與查核中，完成後會陸續上架。')}
  </div>
</section>`;
}

// 12 筆官方查詢入口已由原始資料判斷相同 URL；同網址的 act-09 沿用既有卡片。
// 其餘僅提供輕量文字列，不新增與既有機構卡相同的格子。
function qaPortalSection(category) {
  if (!IS_QA) return '';
  const items = qaPortalRouting.primary.filter(it => it.category === category);
  if (!items.length) return '';
  return `<section class="section qa-portal-section" aria-labelledby="qa-portals-title">
  <div class="wrap">
    ${sectionHead('Official Learning Links', 'qa-portals-title', '更多官方查詢入口', '以下是可以查詢課程或公開活動的原始網站；是否免費、需預約及參加資格，以各主辦單位公告為準。')}
    <ul class="qa-portal-list">${items.map(it => `<li id="portal-${esc(it.id)}">
      <a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${esc(it.name)}<span aria-hidden="true">↗</span></a>
      <p>${esc(it.purpose)}</p>
      <small>${esc(it.region)}｜${esc(it.caution)}　<span class="badge badge-qa">未核准測試內容</span></small>
    </li>`).join('\n')}</ul>
  </div>
</section>`;
}

// ---------- 四個一般分類頁 ----------
for (const c of categories) {
  if (c.id === 'city' || c.id === 'learning') continue; // 這兩頁有專屬版面
  const catResources = resourcesFor((r) => r.categories.includes(c.id));
  const catArticles = articles.filter((a) => a.category === c.id);
  const body = `
${categoryHero(c)}
${IS_QA ? articlesSection(catArticles) : ''}
<section class="section needs" aria-labelledby="need-title">
  <div class="wrap needs-grid">
    <div class="needs-intro"><span class="kicker">Start Here</span><h2 id="need-title">從需求開始</h2></div>
    ${needList(c.needs.map((n) => ({ text: n.text, href: `#${n.topic}` })))}
  </div>
</section>
${topicsSection(c)}${pregnancyGuideSection(c) && `
${pregnancyGuideSection(c)}`}
<section class="section" aria-labelledby="res-title">
  <div class="wrap">
    ${sectionHead('Official Resources', 'res-title', '官方與正式機構入口', '點擊「前往官方網站」會直接進入原始機構網站。服務內容、資格與時間請以各機構公告為準。')}
    ${catResources.length ? `<div class="res-grid">${catResources.map((r) => resourceCard(r)).join('\n')}</div>` : emptyBox('此主題的官方資源正在查核中，完成後會陸續公開。')}${expansionEntries(c.id)}
  </div>
</section>
${IS_QA ? '' : articlesSection(catArticles)}
${qaPortalSection(c.id)}`;
  pages.push({ file: c.slug, html: layout({ title: c.title, description: c.short, active: c.id, body, bodyClass: `cat-${c.id}` }) });
}

// ---------- 城市與福利 ----------
{
  const c = catById.city;
  const body = `
${categoryHero(c)}
${qaBatch6.length ? `<section class="section benefits-intro" aria-labelledby="benefits-title" id="benefits">
  <div class="wrap">
    ${sectionHead('Benefits', 'benefits-title', '先了解有哪些福利', '先認識福利名稱、服務內容與常見條件差異，再到下方選擇縣市，開啟官方機構入口。文章只說明制度，不判定個人資格。')}
    <div class="story-grid">${qaBatch6.map((a) => articleCard(a, '')).join('\n')}</div>
    <p class="benefits-next"><a href="#finder">讀完後，往下選擇縣市與官方入口</a></p>
  </div>
</section>
` : ''}<section class="section" aria-labelledby="finder-title" id="finder">
  <div class="wrap">
    ${sectionHead('City Index', 'finder-title', '城市生活資源索引', '先選擇縣市，再依服務類型篩選。全台 22 個縣市都可以選擇；尚未完成查核的縣市，會先顯示全國性資源。')}
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
        <div class="county-areas" role="group" aria-label="快速選擇縣市">${countyChips(false)}</div>
        <p class="finder-status" id="finder-status" role="status" aria-live="polite"></p>
      </div>
      <noscript><p>你的瀏覽器未啟用 JavaScript，因此無法使用縣市篩選。以下列出所有資源，你仍可以直接瀏覽。</p></noscript>
    </div>

    <div class="results-block">
      <h3 id="local-title">在地服務</h3>
      <div class="empty" id="local-empty"><p>各縣市的在地服務據點正在整理與查核中，目前請先參考下方的全國性資源。</p></div>
      <div class="res-grid" id="local-results"></div>
    </div>
    <div class="results-block">
      <h3>全國性資源</h3>
      <div class="empty" id="national-empty" hidden><p>這個服務類型目前沒有已收錄的全國性資源。</p></div>
      <div class="res-grid" id="national-results">
        ${resources.map((r) => resourceCard(r)).join('\n')}
      </div>${expansionEntries('city')}
    </div>
  </div>
</section>
${topicsSection(c)}
${IS_QA ? articlesSection(articles.filter((a) => a.category === 'city' && !qaBatch6.some((x) => x.slug === a.slug))) : ''}`;
  pages.push({ file: c.slug, html: layout({ title: c.title, description: c.short, active: 'city', body, scripts: ['assets/js/city.js'], bodyClass: 'cat-city' }) });
}

// ---------- 學習與活動 ----------
{
  const c = catById.learning;
  const catResources = resourcesFor((r) => r.categories.includes('learning'));
  const catArticles = articles.filter((a) => a.category === 'learning');
  const eventCards = events
    .map(
      (e) => `<article class="event" data-event-end="${esc(e.endDate)}">
  <p class="event-date">${esc(e.startDate)} – ${esc(e.endDate)}</p>
  <h3>${esc(e.title)}</h3>
  <dl class="res-dl"><dt>主辦</dt><dd>${esc(e.organizer)}</dd><dt>地區</dt><dd>${esc(regionLabel([e.region]))}</dd><dt>報名條件</dt><dd>${esc(e.eligibility)}</dd><dt>費用</dt><dd>${esc(e.fee)}</dd></dl>
  <div class="meta">${statusBadge(e.status)}</div>
  <div class="res-actions">${extLink(e.url, '官方活動頁面')}</div>
</article>`,
    )
    .join('\n');
  const body = `
${categoryHero(c)}
${IS_QA && catArticles.length ? articlesSection(catArticles) : ''}
<section class="section" aria-labelledby="events-title">
  <div class="wrap">
    ${sectionHead('Upcoming', 'events-title', '近期活動', '名額與報名狀態以主辦機構公告為準。活動結束後會自動從這裡隱藏，但不代表活動已取消。')}
    ${IS_QA ? `<p class="act-intro">以下與全站小日曆共用同一批已公布公告。活動日期與參加方式請以原主辦單位為準；此區為未核准測試資訊，不代表本站提供報名。</p>
    <ol class="notice-list" data-act-list>${qaNotices.items.map(noticeHtml).join('\n')}</ol>
    <p class="notice-empty" id="notices-empty"${qaNotices.items.length ? ' hidden' : ''}>目前沒有尚未結束的已公布活動；新消息整理後會更新。</p>
    <p class="notice-more"><a href="activities.html">查看活動與講座完整資訊及長期官方查詢入口 →</a></p>`
      : `<div class="event-list">${eventCards}</div>
    <div class="empty" id="events-empty"${events.length ? ' hidden' : ''}><p>目前沒有已查核的近期活動。活動經常變動，建議直接查看下方的官方活動列表入口。</p></div>`}
  </div>
</section>
${topicsSection(c)}
<section class="section" aria-labelledby="res-title">
  <div class="wrap">
    ${sectionHead('Official Lists', 'res-title', '官方課程與活動列表入口')}
    ${catResources.length ? `<div class="res-grid">${catResources.map((r) => resourceCard(r)).join('\n')}</div>` : emptyBox('官方活動列表入口正在查核中。')}${expansionEntries(c.id)}
  </div>
</section>
${!IS_QA && catArticles.length ? articlesSection(catArticles) : ''}
${qaPortalSection(c.id)}`;
  pages.push({ file: c.slug, html: layout({ title: c.title, description: c.short, active: 'learning', body, scripts: [IS_QA ? 'assets/js/qa-activities.js' : 'assets/js/events.js'], bodyClass: 'cat-learning' }) });
}

for (const c of categories) {
  addIndex('生活主題', c.title, c.short, c.slug, [c.kicker, c.tagline, c.intro, ...c.needs.map((n) => n.text)].join(' '));
  for (const t of c.topics) addIndex(`${c.title}・主題`, t.title, t.text, `${c.slug}#${t.id}`);
}
if (qaPregnancyGuide) {
  const g = qaPregnancyGuide;
  addIndex('生活與家庭・整理', '孕期與生育資訊整理', g.topicText, `${catById[g.category].slug}#${g.anchor}`,
    ['懷孕 生育 孕婦 產檢 產前檢查 衛教 生育給付 生育補助 10萬 勞保 國保 產假 產檢假 陪產假 育嬰留停 出生登記 生育獎勵', ...g.steps.map((s) => s.title)].join(' '));
}

// ---------- 支援資源（緊急求助） ----------
{
  const supportResources = resources.filter((r) => ['npa', 'mohw-113', 'siarc', 'mohw-domhaoh', '1980', 'laf'].includes(r.id));
  const body = `
<section class="page-head support-head" aria-labelledby="page-title">
  <div class="wrap">
    <nav class="breadcrumb" aria-label="頁面位置"><ol><li><a href="index.html">首頁</a></li><li aria-current="page">支援資源</li></ol></nav>
    <p class="cat-hero-kicker">${icon('support', 'cat-hero-icon')}<span>Support</span></p>
    <h1 id="page-title">支援資源</h1>
    <p class="lead">需要協助的時候，可以直接聯繫下列正式服務。點擊號碼即可撥打。</p>
    <p class="note" role="note">本站不具報案、通報或緊急救援功能，也不接收任何求助訊息。點擊本頁按鈕不代表已完成報案或求助。如有立即危險，請直接撥打 110 或 119。</p>
  </div>
</section>

<section class="section" aria-labelledby="hot-title">
  <div class="wrap">
    ${sectionHead('Hotlines', 'hot-title', '可直接撥打的專線', `服務時間與內容以各主管機關公告為準${IS_PREVIEW ? '；標示「待查核」者尚未完成官方來源核對' : ''}。`)}
    ${
      hotlines.length
        ? `<div class="hotline-grid">${hotlines
            .map(
              (h) => `<article class="hotline">
        <span class="num" aria-hidden="true">${esc(h.number)}</span>
        <div class="hotline-body">
          <h3>${esc(h.number)} ${esc(h.title)}</h3>
          <p>${esc(h.purpose)}</p>
          <p class="hotline-meta">服務時間：${esc(h.hours)}${h.source ? `　來源：${extLink(h.source.url, esc(h.source.title))}` : ''}</p>
          <div class="meta">${IS_PREVIEW ? statusBadge(h.status) : `<span class="badge badge-ok">專線用途與時間已核對（AI 協助）</span><span>核對：${esc(h.review.date)}</span>`}</div>
        </div>
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
    ${sectionHead('Other Channels', 'ch-title', '不方便通話時')}
    ${channels.length ? `<div class="res-grid">${channels
      .map(
        (ch) => `<article class="res-card"><header class="res-head">${icon('page', 'res-icon')}<div class="res-title"><h3>${esc(ch.title)}</h3></div></header><p class="res-summary">${esc(ch.text)}</p><footer class="res-foot"><div class="meta">${IS_PREVIEW ? statusBadge(ch.status) : `<span class="badge badge-ok">官方入口已核對（AI 協助）</span><span>核對：${esc(ch.review.date)}</span>`}</div><div class="res-actions">${extLink(ch.url, esc(ch.linkLabel))}</div></footer></article>`,
      )
      .join('\n')}</div>` : emptyBox('簡訊與視訊報案資訊正在依官方來源查核中。')}
  </div>
</section>

<section class="section" aria-labelledby="safe-title">
  <div class="wrap">
    ${sectionHead('Browsing Safely', 'safe-title', '基本的數位隱私與瀏覽安全', '以下為一般性提醒，無法保證完全隱藏裝置上的使用活動。')}
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
    ${sectionHead('Organizations', 'org-title', '相關正式機構')}
    ${supportResources.length ? `<div class="res-grid">${supportResources.map((r) => resourceCard(r)).join('\n')}</div>` : emptyBox('相關機構資訊正在查核中。')}
  </div>
</section>`;
  pages.push({ file: 'support.html', html: layout({ title: '支援資源', description: '110、119、113、1925 等正式求助專線與數位隱私基本資訊。', active: 'support', body, bodyClass: 'support' }) });
  addIndex('頁面', '支援資源', '可直接撥打的正式專線、簡訊報案資訊與數位隱私提醒。', 'support.html', '緊急 求助 報案 專線 安全 ' + hotlines.map((h) => `${h.number} ${h.title}`).join(' '));
  for (const h of hotlines) addIndex('求助專線', `${h.number} ${h.title}`, h.purpose, 'support.html', '電話 專線');
}

// ---------- 說明頁（Markdown） ----------
const linkResolver = (prefix) => (href) => {
  if (/^(https?:|mailto:)/.test(href)) return { href, external: /^https?:/.test(href) };
  if (/^(#|tel:)/.test(href)) return { href, external: false };
  return { href: prefix + href.replace(/^\//, ''), external: false };
};

/** 「關於由己」整合入口：沿用既有的免責聲明、隱私宣告、查核與更新說明頁，不另行改寫 */
function aboutHub() {
  const items = ['disclaimer', 'privacy', 'verification'].map((n) => pagesAll.find((x) => x.name === n)).filter(Boolean);
  return `<section class="section section-tight" aria-labelledby="hub-title">
  <div class="wrap">
    <h2 id="hub-title" class="visually-hidden">網站說明與公告</h2>
    <ul class="cat-list about-hub">
      ${items.map((x) => `<li><a href="${x.name}.html">${icon('page', 'cat-icon')}<span><strong>${esc(x.title)}</strong><small>${esc(x.description || '')}</small></span></a></li>`).join('\n')}
    </ul>
  </div>
</section>`;
}

for (const p of pagesAll) {
  const body = `
<section class="page-head" aria-labelledby="page-title">
  <div class="wrap">
    <nav class="breadcrumb" aria-label="頁面位置"><ol><li><a href="index.html">首頁</a></li><li aria-current="page">${esc(p.title)}</li></ol></nav>
    <span class="kicker">${esc(p.kicker || '')}</span>
    <h1 id="page-title">${esc(p.title)}</h1>
    <p class="lead">${esc(p.description || '')}</p>
    <p class="article-meta"><span>最後更新：${esc(p.updated)}</span></p>
  </div>
</section>
${p.name === 'about' ? aboutHub() : ''}
<section class="section section-tight"><div class="wrap"><div class="prose">${renderMarkdown(p.body, { link: linkResolver('') })}</div></div></section>`;
  pages.push({ file: `${p.name}.html`, html: layout({ title: p.title, description: p.description, body, active: p.name === 'about' ? 'about' : '' }) });
  addIndex('關於本站', p.title, p.description || '', `${p.name}.html`);
}

// ---------- 文章 ----------
// 相關閱讀：只列確實存在的文章（目前僅第六批 QA 文章設定 related）
function relatedList(a, prefix) {
  const list = (a.related || []).map((slug) => articles.find((x) => x.slug === slug)).filter(Boolean);
  if (!list.length) return '';
  return `<div class="sources related"><h2>相關閱讀</h2><ul>${list.map((x) => `<li><a href="${prefix}articles/${esc(x.slug)}.html">${esc(x.title)}</a></li>`).join('')}</ul></div>`;
}
for (const a of articles) {
  const prefix = '../';
  const sources = (a.sourcesList ? a.sourcesList.map((x) => `${x.title} | ${x.url} | ${x.note || ''}`) : [].concat(a.source || [])).map((s) => {
    const [title, url, note] = String(s).split('|').map((x) => x.trim());
    const target = linkResolver(prefix)(url || '');
    // 第四、五批原稿在來源後附的用途說明（例如「歷史文章，只用作一般觀念」）照原文保留
    const noteHtml = note ? ` <span class="src-note">${note.startsWith('（') ? '' : '— '}${esc(note)}</span>` : '';
    return url
      ? `<li><a href="${esc(target.href)}"${target.external ? ' class="ext" rel="noopener noreferrer"' : ''}>${esc(title)}</a>${noteHtml}</li>`
      : `<li>${esc(title)}</li>`;
  });
  const backHref = a.category === 'guide' ? `${prefix}index.html` : `${prefix}${catById[a.category].slug}`;
  const imgId = articleImageId(a);
  const body = `
<article class="article">
  <header class="page-head article-head">
    <div class="wrap">
      <nav class="breadcrumb" aria-label="頁面位置"><ol><li><a href="${prefix}index.html">首頁</a></li><li><a href="${backHref}">${esc(categoryLabel(a.category))}</a></li><li aria-current="page">文章</li></ol></nav>
      <span class="pill">${esc(categoryLabel(a.category))}</span>
      <h1>${esc(a.title)}</h1>
      ${a.qa ? '' /* 第二批文章的摘要取自正文第一段，頁首不重複顯示 */ : `<p class="lead">${esc(a.summary)}</p>`}
      <p class="article-meta">${a.qa
        ? `<span>來源查核：${esc(a.checkedOn)}（AI 編輯查核，尚未經網站擁有人核准）</span>${qaBadge(a)}`
        : `<span>發布：${esc(a.published)}</span><span>最後實質更新：${esc(a.updated)}</span>${statusBadge(a.status)}`}</p>
    </div>
  </header>
  ${imgId ? `<div class="wrap article-cover">${photo(imgId, 'cover', { prefix, eager: true, sizes: '(min-width: 1200px) 1120px, 100vw' })}</div>` : ''}
  <div class="section section-tight"><div class="wrap"><div class="prose">
${renderMarkdown(a.body, { link: linkResolver(prefix) })}
${relatedList(a, prefix)}<div class="sources"><h2>參考來源</h2><ul>${sources.join('')}</ul><p>本文為一般性資訊整理，實際辦理請以主管機關或服務單位最新公告為準。</p></div>
  </div></div></div>
</article>`;
  pages.push({ file: `articles/${a.slug}.html`, html: layout({ title: a.title, description: a.summary, body, prefix }) });
  addIndex('文章', a.title, a.summary, `articles/${a.slug}.html`, categoryLabel(a.category));
}

// ---------- 資源與縣市索引 ----------
for (const r of resources) {
  const cat = catById[r.categories[0]];
  const url = cat && cat.id !== 'city' ? `${cat.slug}#res-${r.id}` : r.categories.length ? `city.html#res-${r.id}` : 'support.html';
  addIndex('機構與資源', r.name, [r.summary, r.nameEn || '', r.summaryEn || ''].join(' '), url, IS_PREVIEW ? [r.serviceTypes.join(' '), regionLabel(r.regions), r.audience, r.phones.map((p) => p.number).join(' '), (r.keywordsEn || []).join(' ')].join(' ') : [r.serviceTypes.join(' '), regionLabel(r.regions)].join(' '));
}
// 擴充佇列：簡潔文字入口連到主題頁對應列；同網址補充文字併入原卡的搜尋關鍵字。
for (const x of qaExpansion.entries) {
  addIndex('機構與資源', x.name, x.purpose, `${catById[x.category].slug}#qa-x-${x.id}`, [regionLabel(x.regions), x.languages.join(' '), '官方入口'].join(' '));
}
for (const [id, notes] of qaExpansion.supplements) {
  for (const entry of searchIndex.filter((e) => e.type === '機構與資源' && e.url.endsWith(`#res-${id}`))) entry.keywords += ` ${notes.map((n) => n.text).join(' ')}`;
}
for (const c of counties) {
  addIndex('縣市資源', `${c.name}的生活資源`, `依縣市查詢${c.name}可使用的正式服務據點。`, `city.html#county=${c.id}`, c.area);
}

// ---------- 搜尋頁 ----------
{
  const body = `
<section class="page-head" aria-labelledby="page-title">
  <div class="wrap">
    <span class="kicker">Search</span>
    <h1 id="page-title">搜尋全站</h1>
    <p class="lead">可以搜尋主題、文章名稱、機構名稱、服務類型或縣市。搜尋只在你的瀏覽器中進行，不會保存或傳送你輸入的文字。</p>
    <noscript><p class="note">搜尋功能需要啟用 JavaScript。你也可以從下方的分類開始瀏覽。</p></noscript>
    ${searchBox({ id: 'q', placeholder: '例如：育兒、法律扶助、臺中、心理' })}
  </div>
</section>
<section class="section section-tight" aria-labelledby="browse-title">
  <div class="wrap">
    ${sectionHead('Browse', 'browse-title', '或從生活主題開始')}
    <ul class="cat-list">
      ${categories.map((c) => `<li><a href="${c.slug}">${icon(c.icon, 'cat-icon')}<span><strong>${esc(c.title)}</strong><small>${esc(c.tagline)}</small></span></a></li>`).join('\n')}
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
    else if (entry !== 'generated.json') await copyFile(src, dst);
  }
}

await rm(OUT, { recursive: true, force: true });
await mkdir(path.join(OUT, 'articles'), { recursive: true });
await copyDir(path.join(ROOT, 'src/assets'), path.join(OUT, 'assets'));
await copyDir(path.join(ROOT, 'src/icons'), path.join(OUT, 'assets/icons'));
// QA 限定腳本（全站小日曆、活動消息依臺灣日期隱藏）：只複製到 dist-qa，正式版與一般預覽不會有這些檔案。
if (IS_QA) await copyDir(path.join(ROOT, 'src/qa-assets'), path.join(OUT, 'assets'));
if (existsSync(PHOTO_DIR)) await copyDir(PHOTO_DIR, path.join(OUT, 'assets/photos'));
if (!IS_PREVIEW) {
  // 只保留已核准且每一個輸出檔均與核准版本完全一致的圖片。
  for (const file of existsSync(path.join(OUT, 'assets/photos')) ? await readdir(path.join(OUT, 'assets/photos')) : []) {
    if (!approvedPhotoAssetNames.has(file)) await rm(path.join(OUT, 'assets/photos', file));
  }
}
// QA：搜尋索引載入時依臺灣日期剔除已結束的活動消息（有 until 欄位者），不必重新部署。
const QA_SEARCH_EXPIRY = "window.MLM_SEARCH_INDEX = window.MLM_SEARCH_INDEX.filter(function (x) { return !x.until || x.until >= new Date(Date.now() + 288e5).toISOString().slice(0, 10); });\n";
await mkdir(path.join(OUT, 'assets/data'), { recursive: true });
await writeFile(
  path.join(OUT, 'assets/data/search-index.js'),
  `window.MLM_SEARCH_INDEX = ${JSON.stringify(searchIndex)};\n${IS_QA ? QA_SEARCH_EXPIRY : ''}`,
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
const photoMissing = photoData.items.filter((p) => !generated[p.id]).length;
console.log(`建置完成（${MODE}）：${pages.length} 個頁面 → ${path.relative(ROOT, OUT) || '.'}`);
console.log(`資源：公開 ${resources.length} 筆／全部 ${resourceData.items.length} 筆${IS_QA ? `（含第二批未核准測試候選 ${qaResources.length} 筆）` : ""}（原人工查核狀態仍待確認 ${pending} 筆，AI 來源查核與作者發布核准另記）；文章 ${articles.length} 篇；活動 ${events.length} 筆`);
if (IS_QA) console.log(`六大主題擴充佇列（${qaExpansion.queueFile}）：匯入文章 ${qaExpansion.articles.length} 篇、主題頁官方入口 ${qaExpansion.entries.length} 筆、縣市入口 ${qaExpansion.cityResources.length} 筆、同網址補充 ${[...qaExpansion.supplements.values()].flat().length} 筆；未開啟或待查核 ${qaExpansion.pending} 筆不顯示`);
console.log(`攝影素材：已處理 ${photoData.items.length - photoMissing} 張／清單 ${photoData.items.length} 張（尚缺 ${photoMissing} 張，執行 npm run images 查看清單）`);
