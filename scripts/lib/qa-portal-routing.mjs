// QA-only：原始十二筆活動查詢入口的主題定位（不改原始來源，也不推定外站報名狀態）。
// 站主規則：URL 完全相同 → 不加一張卡，在現有卡補用途文字；URL 不同 → 獨立的精簡文字連結。
export const QA_PORTAL_CATEGORY = Object.freeze({
  'act-01': 'career',
  'act-02': 'career',
  'act-03': 'career',
  'act-04': 'life-family',
  'act-05': 'law',
  'act-06': 'health',
  'act-07': 'health',
  'act-08': 'life-family',
  'act-09': 'learning',
  'act-10': 'learning',
  'act-11': 'learning',
  'act-12': 'learning',
});

export function resolveQaPortalRouting(items, existingResources) {
  const available = new Map(existingResources.map(r => [r.url, r]));
  const seenIds = new Set();
  const primary = []; // 僅網址尚未存在於既有卡片的入口；用簡潔文字列呈現。
  const reused = [];  // 同網址直接使用現有卡片，不複製資料或增加第二張卡片。
  for (const item of items) {
    if (seenIds.has(item.id)) throw new Error('重複長期官方入口 ID：' + item.id);
    seenIds.add(item.id);
    const category = QA_PORTAL_CATEGORY[item.id];
    if (!category) throw new Error('長期官方入口未設定主題：' + item.id);
    if (!item.url?.startsWith('https://')) throw new Error('非 https 官方網址：' + item.id);
    const old = available.get(item.url);
    if (old) reused.push({ ...item, category, existingResourceId: old.id });
    else primary.push({ ...item, category });
  }
  if (items.length !== 12 || Object.keys(QA_PORTAL_CATEGORY).length !== items.length) {
    throw new Error('12 筆長期官方入口清單不完整，須先編輯確認');
  }
  if (reused.length !== 1 || reused[0].id !== 'act-09' || reused[0].existingResourceId !== 'open-culture-events') {
    throw new Error('同網址去重結果與目前來源不同，請先確認資料，不要新增重複卡片');
  }
  return { primary, reused };
}
