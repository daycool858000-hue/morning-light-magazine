// 第六批「城市與福利」六篇導讀的 QA 載入器（只在 build.mjs --mode=qa 使用）。
//
// 依據 GitHub Issue #3：站主同意這六篇放進「公開但未核准」的 QA 測試網站，不是正式發布核准。
// - 只讀 docs/BATCH6-CITY-WELFARE-BENEFIT-FIRST-GUIDES-2026-10-16.md，正文逐行沿用原稿（含福利情境表格），
//   解析規則與第四、五批共用（scripts/lib/qa-batch45.mjs）；檔頭說明與文末「編輯查核總結」不公開。
// - 六篇都屬既有「城市與福利」（city），不新增分類；城市頁以「先了解有哪些福利」區塊呈現。
// - related：Issue #3 要求與既有第二批育兒、特殊境遇等文章以相關閱讀交叉連結。
// - preview 與 production 建置完全不會呼叫本檔。
import { loadArticleDocs } from './qa-batch45.mjs';

export const BATCH6_FILE = 'docs/BATCH6-CITY-WELFARE-BENEFIT-FIRST-GUIDES-2026-10-16.md';
export const BATCH6_SOURCES = [
  {
    file: BATCH6_FILE,
    stop: /^## 編輯查核總結與未完成項目/m,
    slugs: {
      '01': ['batch6-welfare-overview', 'city'],
      '02': ['batch6-income-support-emergency-aid', 'city'],
      '03': ['batch6-rental-housing-support', 'city'],
      '04': ['batch6-long-term-care-services', 'city'],
      '05': ['batch6-disability-support', 'city'],
      '06': ['batch6-women-center-services', 'city'],
    },
  },
];

// 相關閱讀（只連既有 QA 文章；原稿正文已提到的篇目優先）
export const BATCH6_RELATED = {
  'batch6-welfare-overview': ['batch2-02', 'batch2-01', 'batch2-09'],
  'batch6-income-support-emergency-aid': ['batch6-welfare-overview', 'batch2-01'],
  'batch6-rental-housing-support': ['batch6-welfare-overview'],
  'batch6-long-term-care-services': ['batch6-disability-support'],
  'batch6-disability-support': ['batch6-long-term-care-services'],
  'batch6-women-center-services': ['batch2-10', 'batch2-12'],
};

export async function loadBatch6Articles(root, categories) {
  return loadArticleDocs(root, categories, { sources: BATCH6_SOURCES, count: 6, checkedOn: '2026-10-16', name: '第六批城市與福利', related: BATCH6_RELATED });
}
