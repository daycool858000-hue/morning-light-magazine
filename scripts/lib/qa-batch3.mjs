// 第三批「不用向《由己》提供個資、免登入閱讀／查詢」內容的 QA 專用載入器。
// 僅在 node scripts/build.mjs --mode=qa 時使用。正式模式絕不可匯入。
// 來源文章為本站原創，來源網站僅作外部引用；網站不代為註冊或報名。
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const BATCH3_OPEN_ACCESS = 'docs/BATCH3-OPEN-ACCESS-CONTENT-2026-10-15.json';

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
    return { ...item, qa: true, entryType: '公開資訊與自主學習入口' };
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
