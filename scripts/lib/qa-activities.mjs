// 「近期活動與講座」QA 測試頁的資料載入器（只在 build.mjs --mode=qa 使用）。
// 本檔有兩組資料：下方 loadQaNotices() 是活動頁主要內容（官方已公告的具體活動）；
// loadQaActivities() 是 12 個長期官方查詢入口（研究紀錄，活動頁只作次要參考區）。
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

// ---------- 近期活動消息（小日曆點進去的主要內容）----------
// - 只讀 docs/QA-ACTIVITIES-NOTICES-2026Q4-2027-2026-10-16.json：官方已公告的具體活動、講座、展覽或計畫。
// - 每筆都要有官方 https 公告連結、主辦單位、地區、日期說明與 visibleUntil（訪客瀏覽時超過即隱藏）。
// - 日期只收官方公布的；未定就是 null＋datePrecision: planned，頁面只能寫「詳情待公告」，不可寫成可報名。
// - today（臺灣日期）之前就已結束的項目在建置時先剔除，作為瀏覽器端隱藏之外的第二層保護。
export const NOTICES_FILE = 'docs/QA-ACTIVITIES-NOTICES-2026Q4-2027-2026-10-16.json';
const NOTICE_TYPES = { event: '活動公告', series: '系列講座', 'continuing-exhibition': '持續展出', 'continuing-event': '持續進行', plan: '已公布計畫・詳情待公告' };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NOTICE_VOLATILE = /報名中|可報名|開放報名|尚有名額|即將截止|額滿|名額有限|倒數|剩餘/;
export const taipeiToday = (now = Date.now()) => new Date(now + 8 * 3600e3).toISOString().slice(0, 10);

export async function loadQaNotices(root, { today = taipeiToday() } = {}) {
  const data = JSON.parse(await readFile(path.join(root, NOTICES_FILE), 'utf8'));
  const problems = [];
  if (data.status !== 'candidate-not-approved' || data.ownerPublicationApproval !== false) problems.push('活動消息資料的狀態被改成已核准');
  const { from, to } = data.window || {};
  const ids = new Set();
  for (const it of data.items) {
    const label = it.id || '(缺 id)';
    if (!/^notice-[a-z0-9-]+$/.test(it.id || '')) problems.push(`${label} id 格式錯誤`);
    if (ids.has(it.id)) problems.push(`${label} id 重複`);
    ids.add(it.id);
    for (const k of ['title', 'organizer', 'region', 'dateLabel', 'summary', 'eligibilityCaution', 'category']) if (!it[k]) problems.push(`${label} 缺少 ${k}`);
    if (!/^https:\/\//.test(it.sourceUrl || '')) problems.push(`${label} 官方公告連結不是 https`);
    if (!NOTICE_TYPES[it.announcementType]) problems.push(`${label} 公告類型「${it.announcementType}」不明`);
    if (!DATE.test(it.visibleUntil || '')) problems.push(`${label} 缺 visibleUntil（自動隱藏日期）`);
    if (it.datePrecision === 'exact') {
      if (!DATE.test(it.startDate || '') || !DATE.test(it.endDate || '') || it.startDate > it.endDate) problems.push(`${label} 已定日期卻缺開始／結束日`);
      if (it.visibleUntil !== it.endDate) problems.push(`${label} visibleUntil 應等於結束日`);
    } else if (it.datePrecision === 'planned') {
      if (it.startDate || it.endDate) problems.push(`${label} 預定計畫不應填確定日期`);
      if (it.announcementType !== 'plan') problems.push(`${label} 預定計畫須標「已公布計畫・詳情待公告」`);
      if (!/^\d{4}-\d{2}$/.test(it.plannedMonth || '')) problems.push(`${label} 預定計畫缺 plannedMonth`);
    } else problems.push(`${label} datePrecision「${it.datePrecision}」不明`);
    if (it.publishedAt != null && !DATE.test(it.publishedAt)) problems.push(`${label} publishedAt 格式錯誤`);
    if (it.visibleUntil < from || (it.startDate || `${it.plannedMonth}-01`) > to) problems.push(`${label} 不在 ${from}～${to} 時間範圍內`);
    if (NOTICE_VOLATILE.test([it.title, it.summary, it.eligibilityCaution, it.dateLabel].join(''))) problems.push(`${label} 含報名狀態或名額等需每日更新的文字`);
  }
  if (problems.length) throw new Error(`近期活動消息資料檢查失敗：\n- ${problems.join('\n- ')}`);
  const sortKey = (it) => it.startDate || `${it.plannedMonth}-01`;
  const items = data.items
    .filter((it) => it.visibleUntil >= today)
    .map((it) => ({ ...it, typeLabel: NOTICE_TYPES[it.announcementType] }))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.visibleUntil.localeCompare(b.visibleUntil));
  return { items, all: data.items, checkedAt: data.checkedAt, window: data.window, expiredAtBuild: data.items.length - items.length };
}
