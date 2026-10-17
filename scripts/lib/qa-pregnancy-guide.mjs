// 「生活與家庭」主題 01「懷孕與生育相關福利」的 QA-only 閱讀區資料載入器（只在 build.mjs --mode=qa 使用）。
// - 只讀 docs/QA-LIFE-FAMILY-PREGNANCY-GUIDE-2026-10-17.json（內容依 PR #11 編輯規劃，未經站主發布核准）。
// - 四段固定順序：產檢、生育給付、工作權益、出生登記與地方補助。
// - 官方連結必須是實際原頁（https、非機構總首頁），不可與既有資源卡同網址，也不可彼此重複。
// - 站內連結只允許既有主題錨點，育兒津貼／托育／產假詳細制度沿用原主題，不在此重複。
// - 不可出現「每人另領 10 萬元」等錯誤說法；preview 與 production 建置完全不會呼叫本檔。
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const PREGNANCY_GUIDE_FILE = 'docs/QA-LIFE-FAMILY-PREGNANCY-GUIDE-2026-10-17.json';
const STEP_TITLES = ['懷孕期間的產檢與健康照護', '生育給付：先分清楚自己的保險類型', '正在工作：產檢假、產假與育嬰留停', '孩子出生後：出生登記與地方生育獎勵'];
const INTERNAL = new Set(['law.html#parental-leave', 'law.html#pregnancy-protection', 'city.html', '#childcare', '#daycare']);
const WRONG_CLAIM = /每人(一律)?(再|另外|額外)?領\s*10\s*萬|各保別各領|一律再領/;

export async function loadQaPregnancyGuide(root, existingResources) {
  const data = JSON.parse(await readFile(path.join(root, PREGNANCY_GUIDE_FILE), 'utf8'));
  const problems = [];
  if (data.status !== 'candidate-not-approved' || data.ownerPublicationApproval !== false || data.productionApproved !== false) problems.push('孕期導覽資料的狀態被改成已核准');
  if (data.category !== 'life-family' || data.topic !== 'pregnancy' || data.anchor !== 'pregnancy-guide') problems.push('孕期導覽的分類、主題或錨點不是 life-family／pregnancy／pregnancy-guide');
  if (JSON.stringify(data.steps.map((s) => s.title)) !== JSON.stringify(STEP_TITLES)) problems.push('四段標題或順序與編輯規劃不同');
  const existing = new Set(existingResources.map((r) => r.url));
  const urls = new Set();
  const ids = new Set();
  for (const s of data.steps) {
    for (const l of s.links) {
      if (ids.has(l.id)) problems.push(`${l.id} 編號重複`);
      ids.add(l.id);
      if (!/^https:\/\/[^/]+\/.+/.test(l.url || '')) problems.push(`${l.id} 不是 https 原頁（不可只放機構總首頁）`);
      if (urls.has(l.url)) problems.push(`${l.id} 網址與本導覽其他連結重複`);
      urls.add(l.url);
      if (existing.has(l.url)) problems.push(`${l.id} 與既有資源卡同網址，應沿用原卡片`);
      for (const k of ['name', 'org', 'level', 'purpose']) if (!l[k]) problems.push(`${l.id} 缺少 ${k}`);
    }
    for (const i of s.internal) if (!INTERNAL.has(i.href)) problems.push(`站內連結 ${i.href} 不在允許的既有主題錨點中`);
  }
  for (const n of data.next) if (!INTERNAL.has(n.href)) problems.push(`站內連結 ${n.href} 不在允許的既有主題錨點中`);
  const records = new Map(data.sourceRecords.map((r) => [r.id, r]));
  for (const id of ids) if (!records.has(id)) problems.push(`${id} 缺少來源查核紀錄`);
  if (WRONG_CLAIM.test(JSON.stringify(data.steps))) problems.push('生育給付出現「每人另領 10 萬元」類錯誤說法');
  if (problems.length) throw new Error(`孕期與生育導覽資料檢查失敗：\n- ${problems.join('\n- ')}`);
  return data;
}
