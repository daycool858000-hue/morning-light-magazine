// 六大主題擴充（PR #11）的 QA 分批匯入載入器（只在 build.mjs --mode=qa 使用）。
//
// - 唯一入口是匯入佇列 docs/QA-EXPANSION-IMPORT-QUEUE.json；佇列逐筆列出候選文章與官方資源，
//   只有 importToQa: true 且 sourceCheck: "source-checked"（含查核日期與查核紀錄檔）的項目才會進 QA，
//   其他項目一律略過，所以可以只開一篇或一小批，不會一次把 22 篇全部匯入。
// - 文章正文只讀佇列指定的 docs/ 原稿與編號（# 01｜標題），正文逐行沿用原稿；
//   分類行、`---`、檔尾的批次查核清單都不進前台，來源清單之後若有不認得的段落直接建置失敗。
// - 官方資源依站主規則：網址與既有卡片完全相同 → 不建新卡，只在原卡補一段文字；
//   網址不同、全國性 → 在所屬主題頁以簡潔文字入口呈現；只服務特定縣市 → 進城市頁縣市篩選。
//   網址與長期官方查詢入口或活動公告相同時先擋下，交由編輯決定，不默默重複。
// - 所有匯入內容固定為「待確認／not-approved」，不寫入 content/、不碰 release-approvals.json；
//   preview 與 production 建置完全不會呼叫本檔。
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { QA_ENGLISH_FILE } from './qa-english.mjs';
import { ACTIVITIES_FILE, NOTICES_FILE } from './qa-activities.mjs';

export const QA_EXPANSION_QUEUE = 'docs/QA-EXPANSION-IMPORT-QUEUE.json';
export const SOURCE_CHECKED = 'source-checked';
export const DIRECTORIES = ['none', 'readli', 'toward'];

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isHttps = (v) => typeof v === 'string' && /^https:\/\/[^\s<>"']+$/.test(v);
const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
// 每篇開頭的分類行：**建議分類：生活與家庭｜家庭理財｜草稿…**、**分類**：城市與福利、**分類：**生活與家庭
const CATEGORY_LINE = /^\*\*(?:建議分類：|分類：\*\*\s*|分類\*\*：)(.+?)(?:\*\*)?$/;
// 來源清單標題（下一行起為「- [名稱](網址) 說明」）：**官方來源：** 或 ### 官方來源與延伸閱讀
const SOURCE_HEADER = /^(?:\*\*[^*]*(?:來源|入口)[^*]*：\*\*|#{2,3}\s+[^#]*(?:來源|入口)[^#]*)$/;
// 原稿給編輯看的對應說明（例如 **編輯對應：向光／…** 、**建議閱讀入口：…**），不進正文
const INTERNAL_LINE = /^\*\*(?:編輯對應|建議閱讀入口)：.*\*\*$/;
// 單行來源：**正式來源**：[名稱](網址)；[名稱](網址)。補充說明
const SOURCE_INLINE = /^\*\*[^*]*(?:來源|入口)[^*]*\*\*：(.+)$/;
const SOURCE_ITEM = /^-\s+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*(.*)$/;
// 來源之後只允許給站主看的編輯備註，全部不公開
const EDITOR_NOTE = /^\*\*(尚待核定|編輯說明|待核准事項|待核准|待查核|查核備註|發布前再確認|出版前注意)：?\*\*/;

function firstSentence(text) {
  const plain = text.replace(LINK, '$1').replace(/\*\*/g, '');
  const end = plain.indexOf('。');
  return (end > 0 && end < 90 ? plain.slice(0, end + 1) : plain.slice(0, 80) + '…').trim();
}

/** 把一篇原稿拆成正文、來源與分類行；兩種來源寫法（清單、單行）都支援。 */
export function parseExpansionArticle(label, raw) {
  const problems = [];
  const lines = raw.split('\n');
  const body = [];
  const sources = [];
  let categoryLine = '';
  let i = 0;
  let inlineNote = '';
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    let m;
    if (t === '---') continue;
    if (!categoryLine && (m = CATEGORY_LINE.exec(t))) { categoryLine = m[1].trim(); continue; }
    if (INTERNAL_LINE.test(t)) continue;
    if (SOURCE_HEADER.test(t)) {
      for (i++; i < lines.length; i++) {
        const s = lines[i].trim();
        if (!s) continue;
        if ((m = SOURCE_ITEM.exec(s))) { sources.push({ title: m[1], url: m[2], note: m[3].replace(/^[—–-]\s*/, '').trim() }); continue; }
        break;
      }
      break;
    }
    if ((m = SOURCE_INLINE.exec(t))) {
      for (const x of m[1].matchAll(LINK)) sources.push({ title: x[1], url: x[2], note: '' });
      // 連結以外的文字（例如「本站不收取個人資料」）是給讀者的說明，保留為正文最後一段，不默默丟棄
      inlineNote = m[1].replace(LINK, '').replace(/^[\s；;、，。]+/, '').trim();
      i++;
      break;
    }
    body.push(lines[i]);
  }
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t === '---') continue;
    if (!EDITOR_NOTE.test(t)) problems.push(`${label} 來源之後有無法辨識的段落（不可默默丟棄）：${t.slice(0, 40)}`);
  }
  if (!sources.length) problems.push(`${label} 找不到參考來源`);
  let text = body.join('\n').trim();
  if (inlineNote) text += `\n\n${inlineNote}`;
  const firstPara = text.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith('#') && !p.trim().startsWith('|')) || '';
  return { categoryLine, sources, body: text, summary: firstSentence(firstPara.replace(/\n/g, '')), problems };
}

/** 從原稿取出指定編號的那一篇（# 01｜標題 到下一篇或檔尾說明之前）。 */
function extractSection(text, heading, stopAt) {
  const main = stopAt >= 0 ? text.slice(0, stopAt) : text;
  const parts = main.split(/^# (\d\d)｜(.+)$/m);
  const found = [];
  for (let i = 1; i < parts.length; i += 3) if (parts[i] === heading) found.push({ title: parts[i + 1].trim(), raw: parts[i + 2] });
  return found;
}

function collectUrls(value, out = []) {
  if (Array.isArray(value)) for (const v of value) collectUrls(v, out);
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (/url$/i.test(k) && typeof v === 'string') out.push(v);
      else collectUrls(v, out);
    }
  }
  return out;
}

/**
 * @param {string} root
 * @param {{ categories: any[], counties: any[], serviceTypes: string[], existingResources: any[], existingArticles: any[], queueFile?: string, queue?: object }} ctx
 *   queue：直接傳入佇列內容（僅供測試檢查錯誤情境），否則讀取 queueFile。
 */
export async function loadQaExpansion(root, ctx) {
  const queueFile = ctx.queueFile || QA_EXPANSION_QUEUE;
  if (!/^(docs|tests\/fixtures)\/[^\0]+\.json$/.test(queueFile)) throw new Error(`QA 匯入佇列只能放在 docs/ 或 tests/fixtures/：${queueFile}`);
  const queue = ctx.queue || JSON.parse(await readFile(path.join(root, queueFile), 'utf8'));
  // 正式佇列只能引用 docs/ 的原稿與查核紀錄；測試範例佇列只能引用 tests/fixtures/，兩者不混用
  const fileRoot = queueFile.startsWith('tests/fixtures/') ? 'tests/fixtures/' : 'docs/';
  const problems = [];
  const catTitle = Object.fromEntries(ctx.categories.map((c) => [c.id, c.title]));
  const countyIds = new Set(ctx.counties.map((c) => c.id));
  const serviceTypes = new Set(ctx.serviceTypes);
  if (queue.documentType !== 'qa-expansion-import-queue') problems.push(`${queueFile} documentType 必須是 qa-expansion-import-queue`);
  if (queue.approvalStatus !== 'not-approved') problems.push(`${queueFile} approvalStatus 必須維持 not-approved（QA 匯入不是正式發布核准）`);
  if (!Array.isArray(queue.articles) || !Array.isArray(queue.resources)) problems.push(`${queueFile} 需要 articles 與 resources 兩個陣列`);
  const sourceFiles = queue.sourceFiles || {};

  // 共用檢查：佇列中的每一筆（不論是否匯入）都要有唯一 id，且不能自行標成已核准
  const seenIds = new Set();
  for (const x of [...(queue.articles || []), ...(queue.resources || [])]) {
    if (!x.id || seenIds.has(x.id)) problems.push(`佇列 id 缺少或重複：${x.id}`);
    seenIds.add(x.id);
    if (x.ownerPublicationApproval === true || x.productionApproved === true) problems.push(`${x.id} 不可在 QA 佇列標成已核准；正式核准另走 release-approvals 流程`);
  }
  const ready = (x) => {
    if (x.importToQa !== true) return false;
    const where = `${x.id}`;
    if (x.sourceCheck !== SOURCE_CHECKED) { problems.push(`${where} 尚未完成來源查核（sourceCheck=${x.sourceCheck}），不可匯入 QA`); return false; }
    if (!isDate(x.sourceCheckedOn)) { problems.push(`${where} 缺少來源查核日期 sourceCheckedOn`); return false; }
    if (typeof x.sourceCheckRecord !== 'string' || !x.sourceCheckRecord.startsWith(fileRoot) || !existsSync(path.join(root, x.sourceCheckRecord))) {
      problems.push(`${where} 缺少可查的來源查核紀錄檔 sourceCheckRecord（${fileRoot} 內）`); return false;
    }
    return true;
  };

  // ---------- 文章 ----------
  const existingSlugs = new Set(ctx.existingArticles.map((a) => a.slug));
  const existingTitles = new Set(ctx.existingArticles.map((a) => a.title));
  const articles = [];
  const fileCache = new Map();
  for (const x of queue.articles || []) {
    if (!ready(x)) continue;
    const label = `${x.id}（${x.sourceFile} 第 ${x.heading} 篇）`;
    if (!/^exp-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug || '')) { problems.push(`${label} slug 必須是 exp- 開頭的小寫英數與 -`); continue; }
    if (existingSlugs.has(x.slug)) { problems.push(`${label} slug 與既有文章重複：${x.slug}`); continue; }
    if (!catTitle[x.category]) { problems.push(`${label} 分類 ${x.category} 不在六大分類中`); continue; }
    if (!DIRECTORIES.includes(x.directory)) { problems.push(`${label} directory 必須是 ${DIRECTORIES.join('／')}（讀利／向光是否收錄需明確指定）`); continue; }
    if (!/^\d\d$/.test(x.heading || '')) { problems.push(`${label} heading 必須是兩位數編號`); continue; }
    if (typeof x.sourceFile !== 'string' || !x.sourceFile.startsWith(fileRoot) || !existsSync(path.join(root, x.sourceFile))) { problems.push(`${label} 原稿不存在或不在 ${fileRoot}`); continue; }
    if (!fileCache.has(x.sourceFile)) fileCache.set(x.sourceFile, await readFile(path.join(root, x.sourceFile), 'utf8'));
    const text = fileCache.get(x.sourceFile);
    const stop = sourceFiles[x.sourceFile]?.stopAt;
    const stopAt = stop ? text.indexOf(stop) : -1;
    if (stop && stopAt < 0) { problems.push(`${x.sourceFile} 找不到 stopAt「${stop}」，無法確認正文結束位置`); continue; }
    const found = extractSection(text, x.heading, stopAt);
    if (found.length !== 1) { problems.push(`${label} 原稿中找到 ${found.length} 篇同編號文章`); continue; }
    const { title, raw } = found[0];
    if (x.title && x.title !== title) problems.push(`${label} 佇列標題與原稿不同：「${x.title}」≠「${title}」`);
    if (existingTitles.has(title)) problems.push(`${label} 標題與既有文章完全相同`);
    const a = parseExpansionArticle(label, raw);
    problems.push(...a.problems);
    // 原稿有分類行時必須與佇列一致；較早的原稿沒有分類行，則以佇列（編輯指定）為準
    if (a.categoryLine && !a.categoryLine.startsWith(catTitle[x.category])) problems.push(`${label} 原稿分類「${a.categoryLine}」與佇列分類「${catTitle[x.category]}」不一致`);
    for (const s of a.sources) if (!isHttps(s.url)) problems.push(`${label} 來源不是 https：${s.url}`);
    if (a.body.length < 400) problems.push(`${label} 正文過短，可能解析錯誤`);
    existingSlugs.add(x.slug);
    existingTitles.add(title);
    articles.push({
      qa: true, expansion: true, expansionId: x.id, directory: x.directory,
      slug: x.slug, title, category: x.category, summary: a.summary,
      published: x.sourceCheckedOn.slice(0, 7), updated: x.sourceCheckedOn, checkedOn: x.sourceCheckedOn,
      status: '待確認', visibility: 'public', publishApproval: 'not-approved', ownerApproved: false,
      body: a.body, sourcesList: a.sources, ...(x.related?.length ? { related: x.related } : {}),
    });
  }
  for (const a of articles) for (const slug of a.related || []) if (!existingSlugs.has(slug)) problems.push(`${a.expansionId} 相關閱讀找不到文章 ${slug}`);

  // ---------- 官方資源 ----------
  const english = JSON.parse(await readFile(path.join(root, QA_ENGLISH_FILE), 'utf8'));
  const resourceByUrl = new Map();
  for (const r of [...ctx.existingResources, ...english.resources]) resourceByUrl.set(r.url, r);
  const portalUrls = new Map();
  for (const file of [ACTIVITIES_FILE, NOTICES_FILE]) {
    const data = JSON.parse(await readFile(path.join(root, file), 'utf8'));
    for (const u of collectUrls(data)) portalUrls.set(u, file);
  }
  const entries = []; // 全國性、網址不同：主題頁簡潔文字入口
  const cityResources = []; // 只服務特定縣市：城市頁縣市篩選
  const supplements = new Map(); // 既有資源 id → 補充文字
  const queueUrls = new Set();
  for (const x of queue.resources || []) {
    if (!ready(x)) continue;
    const label = `${x.id}`;
    if (!/^[A-Za-z0-9-]+$/.test(x.id)) { problems.push(`${label} id 只能用英數與 -`); continue; }
    for (const k of ['name', 'purpose']) if (typeof x[k] !== 'string' || !x[k].trim()) problems.push(`${label} 缺少 ${k}`);
    if (!isHttps(x.url)) { problems.push(`${label} 官方網址必須是 https`); continue; }
    if (queueUrls.has(x.url)) { problems.push(`${label} 與佇列其他項目同網址，請合併成一筆`); continue; }
    queueUrls.add(x.url);
    if (!catTitle[x.category]) { problems.push(`${label} 分類 ${x.category} 不在六大分類中`); continue; }
    if (!Array.isArray(x.regions) || !x.regions.length || x.regions.some((g) => g !== 'national' && !countyIds.has(g)) ||
        (x.regions.includes('national') && x.regions.length > 1)) { problems.push(`${label} regions 必須是 ["national"] 或縣市 id 清單`); continue; }
    const text = [x.purpose, x.caution].filter(Boolean).join(' ').trim();
    const same = resourceByUrl.get(x.url);
    if (same) {
      // 同網址：沿用原卡，只補用途文字
      if (!supplements.has(same.id)) supplements.set(same.id, []);
      supplements.get(same.id).push({ id: x.id, text, checkedOn: x.sourceCheckedOn });
      continue;
    }
    if (portalUrls.has(x.url)) { problems.push(`${label} 與 ${portalUrls.get(x.url)} 的長期官方入口／活動公告同網址；請先由編輯決定沿用方式，不新增重複入口`); continue; }
    const base = { id: x.id, name: x.name, url: x.url, category: x.category, regions: x.regions, purpose: x.purpose, caution: x.caution || '', languages: x.languages || [], checkedOn: x.sourceCheckedOn, qa: true };
    if (x.regions[0] === 'national') { entries.push(base); continue; }
    if (!Array.isArray(x.serviceTypes) || !x.serviceTypes.length || x.serviceTypes.some((s) => !serviceTypes.has(s))) { problems.push(`${label} 縣市資源需要 serviceTypes（城市頁篩選用），且須是既有服務類型`); continue; }
    if (typeof x.entryType !== 'string' || !x.entryType.trim()) { problems.push(`${label} 縣市資源需要 entryType（入口層級，例如「縣市新住民服務專區」）`); continue; }
    cityResources.push({
      id: `qa-x-${x.id.toLowerCase()}`, name: x.name, url: x.url, categories: ['city'], topics: [], regions: x.regions,
      serviceTypes: x.serviceTypes, summary: x.purpose, audience: '依各服務單位公告', usage: x.caution || '', entryType: x.entryType,
      phones: [], sources: [{ title: x.name, url: x.url }], status: '待確認', published: false, checkedAt: null, qa: true, expansion: true,
    });
  }
  if (problems.length) throw new Error(`六大主題擴充 QA 匯入檢查失敗（${queueFile}）：\n- ${problems.join('\n- ')}`);
  const pending = (queue.articles || []).length + (queue.resources || []).length - articles.length - entries.length - cityResources.length - [...supplements.values()].flat().length;
  return { articles, entries, cityResources, supplements, pending, queueFile };
}
