// 第三批「不用向《由己》提供個資、免登入閱讀／查詢」內容的 QA 專用載入器。
// 僅在 node scripts/build.mjs --mode=qa 時使用。正式模式絕不可匯入。
// 來源文章為本站原創，來源網站僅作外部引用；網站不代為註冊或報名。
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const BATCH3_OPEN_ACCESS = 'docs/BATCH3-OPEN-ACCESS-CONTENT-2026-10-15.json';

// 每筆的「使用方式」小字：只依該筆 summary 與 review.notConfirmed 已寫明的公開服務範圍整理，
// 不替外站承諾免費、免報名或零門檻。新增或更換候選時必須在這裡逐筆補上，否則建置失敗。
export const USAGE_NOTES = {
  'open-mind-articles': '可直接閱讀',
  'open-mind-courses': '可免登入瀏覽課程目錄；紀錄學習進度需登入',
  'open-learn-directory': '可免登入查詢；報名與費用依開課單位公告',
  'open-culture-iculture': '可免登入瀏覽；活動報名與費用依主辦單位公告',
  'open-culture-events': '可免登入瀏覽；票價與預約依館所當期公告',
  'open-cpc-faq': '可直接閱讀；提出正式申訴需另提供個人資料',
  'open-cpc-antifraud': '可直接閱讀',
  'open-fire-home': '可直接閱讀',
  'open-police-selfdefense': '可直接觀看公開宣導影片；非實體課程',
};

export async function loadBatch3OpenAccess(root) {
  const source = JSON.parse(await readFile(path.join(root, BATCH3_OPEN_ACCESS), 'utf8'));
  const errors = [];
  if (source.status !== 'candidate-not-approved' || source.ownerPublicationApproval !== false) {
    errors.push('第三批不得已經被核准或發布');
  }
  if (!Array.isArray(source.resources) || !Array.isArray(source.articles)) errors.push('第三批資源或文章缺少');
  const resources = (source.resources || []).map((item) => {
    if (item.published !== false || item.status !== '待確認' || item.checkedAt !== null) {
      errors.push(`資源 ${item.id} 必須保持未核准、未發布狀態`);
    }
    if (!item.access?.reuse || !item.access?.personalData) errors.push(`資源 ${item.id} 缺乏資料與引用限制`);
    if (!item.url?.startsWith('https://')) errors.push(`資源 ${item.id} 不安全的來源`);
    if (!USAGE_NOTES[item.id]) errors.push(`資源 ${item.id} 缺少「使用方式」標示（scripts/lib/qa-batch3.mjs USAGE_NOTES）`);
    return { ...item, qa: true, entryType: '公開資訊與自主學習入口', usage: USAGE_NOTES[item.id] };
  });
  const articles = (source.articles || []).map((item) => {
    if (item.publishApproval !== 'not-approved' || item.qa !== true || item.status !== '待確認') {
      errors.push(`文章 ${item.slug} 不在 QA 待確認狀態`);
    }
    if (!/^batch3-[a-z0-9-]+$/.test(item.slug) || !item.sourcesList?.length || !item.body?.length) {
      errors.push(`文章 ${item.slug} 缺少可用正文或來源`);
    }
    return item;
  });
  if (resources.length !== 9 || articles.length !== 5) {
    errors.push(`第三批數量必須為 9 筆、5 篇；實際 ${resources.length}／${articles.length}`);
  }
  if (errors.length) throw new Error('第三批未核准候選資料檢查失敗：\\n- ' + errors.join('\\n- '));
  return { resources, articles };
}
