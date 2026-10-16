// 首頁「活動與講座」QA 測試頁的資料載入器（只在 build.mjs --mode=qa 使用）。
//
// - 只讀 docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json：正式機構持續更新的官方查詢入口，不是本站的活動行事曆。
// - 只收 type＝portal（長期查詢入口）；單次場次、單一年度公告會過期，靜態網站不重新部署就會留著舊資訊，所以不收。
// - 不允許「報名中」「尚有名額」「即將截止」等需要每日更新的狀態文字。
// - preview 與 production 建置完全不會呼叫本檔。
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const ACTIVITIES_FILE = 'docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json';
const VOLATILE = /報名中|尚有名額|即將截止|額滿|名額有限|倒數/;

export async function loadQaActivities(root) {
  const data = JSON.parse(await readFile(path.join(root, ACTIVITIES_FILE), 'utf8'));
  const problems = [];
  if (data.status !== 'candidate-not-approved' || data.ownerPublicationApproval !== false) problems.push('活動資料的狀態被改成已核准');
  const ids = new Set();
  const urls = new Set();
  for (const it of data.items) {
    const label = it.id || '(缺 id)';
    if (!/^act-[a-z0-9-]+$/.test(it.id || '')) problems.push(`${label} id 格式錯誤`);
    if (ids.has(it.id)) problems.push(`${label} id 重複`);
    ids.add(it.id);
    if (urls.has(it.url)) problems.push(`${label} 網址與其他筆重複`);
    urls.add(it.url);
    if (!data.groups.includes(it.group)) problems.push(`${label} 分組「${it.group}」不在頁內標籤中`);
    if (it.type !== 'portal') problems.push(`${label} 類型「${it.type}」：只收長期官方查詢入口（portal），單次場次或年度公告請留在編輯研究文件`);
    if (it.startDate || it.endDate) problems.push(`${label} 不應有活動日期`);
    if (!/^https:\/\//.test(it.url || '')) problems.push(`${label} 網址不是 https`);
    for (const k of ['name', 'org', 'purpose', 'caution', 'region']) if (!it[k]) problems.push(`${label} 缺少 ${k}`);
    if (VOLATILE.test([it.name, it.purpose, it.caution].join(''))) problems.push(`${label} 含需每日更新的報名狀態文字`);
  }
  for (const g of data.groups) if (!data.items.some((it) => it.group === g)) problems.push(`主題「${g}」沒有任何入口`);
  if (problems.length) throw new Error(`活動與講座資料檢查失敗：\n- ${problems.join('\n- ')}`);
  return { groups: data.groups, items: data.items, checkedOn: data.checkedOn };
}
