// 第二批候選內容的「本機測試預覽」載入器（只在 build.mjs --mode=qa 使用）。
//
// - 直接讀取 docs/ 內 ChatGPT 整理的候選檔，不複製到 content/，不修改任何候選欄位：
//   23 筆地方官方入口仍是 published:false、status:待確認、checkedAt:null。
// - 12 篇文章只取正文：排除「編輯附錄」、每篇的「分類／狀態」行與「發布前再確認」編輯備註。
// - preview 與 production 建置完全不會呼叫本檔；正式版的核准快照與發布門檻不受影響。
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const BATCH2_RESOURCES = 'docs/BATCH2-23-RESOURCE-CANDIDATES-2026-10-15.json';
export const BATCH2_ARTICLES = 'docs/BATCH2-12-ARTICLES-EDITORIAL-2026-10-15.md';

// 入口層次（依 BATCH2-FINAL-OWNER-REVIEW 的 A／B／C 三類，由 id 後綴判斷，不改候選資料）
export function entryType(id) {
  if (id.endsWith('-service-center-roster')) return '中央（衛福部）公布的地方社福中心名錄';
  if (id.endsWith('-welfare-directory')) return '市府官方福利查詢目錄（非社會局／處獨立網站）';
  if (id.endsWith('-social-affairs')) return '縣市社福主管機關官方入口';
  return '';
}

export async function loadBatch2Resources(root) {
  const data = JSON.parse(await readFile(path.join(root, BATCH2_RESOURCES), 'utf8'));
  const problems = [];
  if (data.approvalStatus !== 'not-approved') problems.push(`approvalStatus 應為 not-approved，實際為 ${data.approvalStatus}`);
  for (const r of data.items) {
    // 保護：候選資料若被改成已發布／已確認，代表已走正式流程，不應再當成測試內容
    if (r.published !== false || r.status !== '待確認' || r.checkedAt !== null) problems.push(`${r.id} 的候選狀態被變更（published/status/checkedAt）`);
    if (!entryType(r.id)) problems.push(`${r.id} 無法判斷入口層次`);
  }
  if (problems.length) throw new Error(`第二批候選資料檢查失敗：\n- ${problems.join('\n- ')}`);
  return data.items.map((r) => ({ ...r, qa: true, entryType: entryType(r.id) }));
}

const SOURCE_LINE = /^\*\*官方來源[^*]*\*\*：(.*)$/;
const EDITOR_LINES = [/^\*\*分類\*\*：/, /^\*\*發布前再確認\*\*：/];
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function firstSentence(text) {
  const plain = text.replace(LINK, '$1').replace(/\*\*/g, '');
  const end = plain.indexOf('。');
  const s = end > 0 && end < 90 ? plain.slice(0, end + 1) : plain.slice(0, 80) + '…';
  return s.trim();
}

/** 把一篇文章的原稿拆成：正文（Markdown）、官方來源、分類名稱、查詢日 */
function parseArticle(no, title, raw) {
  const lines = raw.split('\n');
  const sources = [];
  let categoryName = '';
  let checkedOn = '';
  const body = [];
  let inSourceList = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    let m;
    if (t === '---') continue; // 原稿的分隔線不是正文
    if ((m = /^\*\*分類\*\*：([^｜]+)/.exec(t))) categoryName = m[1].trim();
    if ((m = /查詢日：(\d{4}-\d{2}-\d{2})/.exec(t))) checkedOn = m[1];
    if (EDITOR_LINES.some((re) => re.test(t))) continue;
    if ((m = SOURCE_LINE.exec(t))) {
      for (const [, label, href] of m[1].matchAll(LINK)) sources.push({ title: label, url: href });
      continue;
    }
    // 第 01 篇把來源寫成「### 官方參考來源」編號清單，網址在下一行
    if (/^###\s+官方參考來源/.test(t)) { inSourceList = true; continue; }
    if (inSourceList) {
      if ((m = /^\d+\.\s+(.*?)[：:]?\s*$/.exec(t))) {
        const url = (lines[i + 1] || '').trim();
        if (/^https:\/\//.test(url)) {
          sources.push({ title: m[1].replace(/\*\*/g, '').replace(/[：:]\s*$/, ''), url });
          i++;
        }
        continue;
      }
      if (!t) continue;
      inSourceList = false;
    }
    body.push(line);
  }
  const text = body.join('\n').trim();
  const firstPara = text.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith('#')) || '';
  return { no, title, categoryName, checkedOn, sources, body: text, summary: firstSentence(firstPara.replace(/\n/g, '')) };
}

export async function loadBatch2Articles(root, categories) {
  const text = await readFile(path.join(root, BATCH2_ARTICLES), 'utf8');
  const main = text.split(/^# 編輯附錄/m)[0];
  const docDate = (/（(\d{4}-\d{2}-\d{2})）/.exec(text.split('\n')[0]) || [])[1] || '';
  const parts = main.split(/^# (\d\d)｜(.+)$/m);
  const byTitle = Object.fromEntries(categories.map((c) => [c.title, c.id]));
  const out = [];
  const problems = [];
  for (let i = 1; i < parts.length; i += 3) {
    const a = parseArticle(parts[i], parts[i + 1].trim(), parts[i + 2]);
    // 第 01 篇原稿沒有「分類」行；依其主題（特殊境遇家庭扶助）列入生活與家庭，並在報告中註明
    const category = byTitle[a.categoryName] || (a.no === '01' ? 'life-family' : '');
    if (!category) problems.push(`第 ${a.no} 篇無法對應六大分類（${a.categoryName || '缺少分類'}）`);
    if (!a.sources.length) problems.push(`第 ${a.no} 篇沒有官方來源`);
    const checked = a.checkedOn || docDate;
    out.push({
      qa: true, no: a.no, slug: `batch2-${a.no}`, title: a.title, category, summary: a.summary,
      published: checked.slice(0, 7), updated: checked, status: '待確認', visibility: 'public',
      body: a.body, sourcesList: a.sources, checkedOn: checked,
    });
  }
  if (out.length !== 12) problems.push(`應有 12 篇文章，實際 ${out.length} 篇`);
  if (problems.length) throw new Error(`第二批文章檢查失敗：\n- ${problems.join('\n- ')}`);
  return out;
}
