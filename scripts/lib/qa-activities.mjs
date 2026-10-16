// 首頁「活動與講座」QA 測試頁的資料載入器（只在 build.mjs --mode=qa 使用）。
//
// - 只讀 docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json：正式機構的公告與查詢入口，不是本站的活動行事曆。
// - 不允許「報名中」「尚有名額」「即將截止」等需要每日更新的狀態文字。
// - type＝event 的具體場次必須有日期；結束日已過（依台灣日期）就不再顯示，避免推薦已結束的活動。
// - preview 與 production 建置完全不會呼叫本檔。
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const ACTIVITIES_FILE = 'docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json';
export const ACTIVITY_TYPES = {
  event: '已公布具體場次',
  announced: '已公告，尚未開放報名',
  plan: '2027 年年度計畫（非課程報名）',
  portal: '持續更新的官方查詢入口',
};
const VOLATILE = /報名中|尚有名額|即將截止|額滿|名額有限|倒數/;

/** 台灣日期 YYYY-MM-DD（可用 today 參數固定，供測試） */
export function taipeiToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export async function loadQaActivities(root, { today = taipeiToday() } = {}) {
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
    if (!ACTIVITY_TYPES[it.type]) problems.push(`${label} 類型「${it.type}」不正確`);
    if (!/^https:\/\//.test(it.url || '')) problems.push(`${label} 網址不是 https`);
    for (const k of ['name', 'org', 'purpose', 'caution', 'region']) if (!it[k]) problems.push(`${label} 缺少 ${k}`);
    if (VOLATILE.test([it.name, it.purpose, it.caution].join(''))) problems.push(`${label} 含需每日更新的報名狀態文字`);
    if (it.type === 'event' && !(/^\d{4}-\d{2}-\d{2}$/.test(it.startDate || '') && /^\d{4}-\d{2}-\d{2}$/.test(it.endDate || ''))) problems.push(`${label} 具體場次缺少起訖日期`);
  }
  if (problems.length) throw new Error(`活動與講座資料檢查失敗：\n- ${problems.join('\n- ')}`);
  const items = data.items.filter((it) => !(it.type === 'event' && it.endDate < today));
  return { groups: data.groups, items, checkedOn: data.checkedOn, hidden: data.items.length - items.length };
}
