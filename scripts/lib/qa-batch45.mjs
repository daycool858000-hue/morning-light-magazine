// 第四批 9 篇＋第五批 4 篇導讀的 QA 載入器（只在 build.mjs --mode=qa 使用）。
//
// 依據 GitHub Issue #2：站主同意這 13 篇放進「公開但未核准」的 QA 測試網站，不是正式發布核准。
// - 只讀下列三個 ChatGPT 原稿，不掃描 docs/ 其他草稿；正文逐行沿用原稿，不改寫。
// - 每篇只取標題、正文（含小標、清單、表格）與參考來源；分類行、`---` 分隔線、
//   來源清單之後的編輯備註（尚待核定、待核准、出版前注意…）與各檔最後的批次說明都不進前台。
// - 來源清單之後若出現不認得的段落，建置直接失敗，避免默默丟掉正文。
// - preview 與 production 建置完全不會呼叫本檔；正式版核准快照與發布門檻不受影響。
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const BATCH45_SOURCES = [
  {
    file: 'docs/BATCH4-ART-CULTURE-INSURANCE-CASHFLOW-DRAFTS-2026-10-16.md',
    stop: /^## 上 QA 前的批次驗收要求/m,
    slugs: {
      '01': ['batch4-npm-online-collection', 'learning'],
      '02': ['batch4-insurance-basics', 'life-family'],
      '03': ['batch4-business-cashflow', 'career'],
    },
  },
  {
    file: 'docs/BATCH4-SIX-GUIDES-ART-FINANCE-BUSINESS-2026-10-16.md',
    stop: /^## 本次六篇的資料管理和測試要求/m,
    slugs: {
      '04': ['batch4-art-museum-first-visit', 'learning'],
      '05': ['batch4-library-digital-resources', 'learning'],
      '06': ['batch4-savings-emergency-fund', 'life-family'],
      '07': ['batch4-labor-insurance-pension', 'life-family'],
      '08': ['batch4-business-registration', 'career'],
      '09': ['batch4-startup-support', 'career'],
    },
  },
  {
    file: 'docs/BATCH5-FOUR-ARTICLES-RIGHTS-HEALTH-SAFETY-LEARNING-2026-10-16.md',
    stop: /^## 統整｜本檔四篇的 QA／發布界線/m,
    slugs: {
      '01': ['batch5-harassment-three-laws', 'law'],
      '02': ['batch5-preventive-health-screening', 'health'],
      '03': ['batch5-phone-emergency-sos', 'law'],
      '04': ['batch5-open-courses-moocs', 'learning'],
    },
  },
];

export const BATCH45_COUNT = 13;
export const BATCH45_CHECKED_ON = '2026-10-16';

// 每篇開頭的分類行（三種寫法），整行不進正文
// 第六批寫成 **分類**：城市與福利（冒號在粗體外）
const CATEGORY_LINE = /^\*\*(?:分類：\*\*\s*|分類\*\*：|建議分類：)(.+)$/;
// 參考來源標題行，例如 **官方參考來源（2026-10-16 核對公開頁）：**、**官方來源：**、**正式來源（…）：**
const SOURCE_HEADER = /^\*\*[^*]*來源[^*]*：\*\*$/;
const SOURCE_ITEM = /^-\s+\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*(.*)$/;
// 來源清單之後只允許這些給站主的編輯備註，全部不公開
const EDITOR_NOTE = /^\*\*(尚待核定|編輯說明|待核准事項|待核准|避免混同|正式上稿前必查|更新方式|刊登前限制|出版前注意|公開前網址驗收|有效性提醒|維護策略)：\*\*/;
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function firstSentence(text) {
  const plain = text.replace(LINK, '$1').replace(/\*\*/g, '');
  const end = plain.indexOf('。');
  const s = end > 0 && end < 90 ? plain.slice(0, end + 1) : plain.slice(0, 80) + '…';
  return s.trim();
}

/** 把來源說明的「— 說明」或「（說明）」與連結標題分開保留 */
function sourceNote(rest) {
  return rest.replace(/^[—–-]\s*/, '').trim();
}

export function parseArticle(label, raw) {
  const lines = raw.split('\n');
  const problems = [];
  let categoryLine = '';
  const body = [];
  const sources = [];
  let i = 0;
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    let m;
    if (t === '---') continue;
    if (SOURCE_HEADER.test(t)) break;
    if (!categoryLine && (m = CATEGORY_LINE.exec(t))) { categoryLine = m[1]; continue; }
    body.push(lines[i]);
  }
  if (i >= lines.length) problems.push(`${label} 找不到參考來源段落`);
  for (i++; i < lines.length; i++) {
    const t = lines[i].trim();
    let m;
    if (!t) continue;
    if ((m = SOURCE_ITEM.exec(t))) { sources.push({ title: m[1], url: m[2], note: sourceNote(m[3]) }); continue; }
    break;
  }
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t === '---') continue;
    if (!EDITOR_NOTE.test(t)) problems.push(`${label} 來源清單後有無法辨識的段落（不可默默丟棄）：${t.slice(0, 40)}`);
  }
  const text = body.join('\n').trim();
  const firstPara = text.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith('#') && !p.trim().startsWith('|')) || '';
  return { categoryLine, sources, body: text, summary: firstSentence(firstPara.replace(/\n/g, '')), problems };
}

export async function loadBatch45Articles(root, categories) {
  return loadArticleDocs(root, categories, { sources: BATCH45_SOURCES, count: BATCH45_COUNT, checkedOn: BATCH45_CHECKED_ON, name: '第四、五批' });
}

/**
 * 依指定原稿與 slug 對照表載入 QA 文章（第四、五批與第六批共用）。
 * @param {{ sources: typeof BATCH45_SOURCES, count: number, checkedOn: string, name: string, related?: Record<string, string[]> }} spec
 */
export async function loadArticleDocs(root, categories, spec) {
  const byId = Object.fromEntries(categories.map((c) => [c.id, c.title]));
  const out = [];
  const problems = [];
  for (const src of spec.sources) {
    const text = await readFile(path.join(root, src.file), 'utf8');
    const stopAt = text.search(src.stop);
    if (stopAt < 0) problems.push(`${src.file} 找不到批次說明段落，無法確認正文結束位置`);
    const main = stopAt < 0 ? text : text.slice(0, stopAt);
    const parts = main.split(/^# (\d\d)｜(.+)$/m);
    const seen = new Set();
    for (let i = 1; i < parts.length; i += 3) {
      const no = parts[i];
      const label = `${path.basename(src.file)} 第 ${no} 篇`;
      const map = src.slugs[no];
      if (!map) { problems.push(`${label} 不在 Issue #2 指定範圍`); continue; }
      seen.add(no);
      const [slug, category] = map;
      const a = parseArticle(label, parts[i + 2]);
      problems.push(...a.problems);
      if (!byId[category]) problems.push(`${label} 分類 ${category} 不在六大分類中`);
      else if (!a.categoryLine.startsWith(byId[category])) problems.push(`${label} 原稿分類「${a.categoryLine}」與對應分類「${byId[category]}」不一致`);
      if (!/^batch\d-[a-z0-9-]+$/.test(slug)) problems.push(`${label} slug 格式錯誤：${slug}`);
      if (!a.sources.length) problems.push(`${label} 沒有參考來源`);
      for (const s of a.sources) if (!s.url.startsWith('https://')) problems.push(`${label} 來源不是 https：${s.url}`);
      if (a.body.length < 400) problems.push(`${label} 正文過短，可能解析錯誤`);
      out.push({
        qa: true, slug, title: parts[i + 1].trim(), category, summary: a.summary,
        published: spec.checkedOn.slice(0, 7), updated: spec.checkedOn, checkedOn: spec.checkedOn,
        status: '待確認', visibility: 'public', publishApproval: 'not-approved', ownerApproved: false,
        body: a.body, sourcesList: a.sources, ...(spec.related?.[slug] ? { related: spec.related[slug] } : {}),
      });
    }
    for (const no of Object.keys(src.slugs)) if (!seen.has(no)) problems.push(`${src.file} 缺少第 ${no} 篇`);
  }
  if (out.length !== spec.count) problems.push(`應有 ${spec.count} 篇文章，實際 ${out.length} 篇`);
  if (new Set(out.map((a) => a.slug)).size !== out.length) problems.push('slug 重複');
  if (problems.length) throw new Error(`${spec.name}文章檢查失敗：\n- ${problems.join('\n- ')}`);
  return out;
}
