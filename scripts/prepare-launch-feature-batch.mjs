#!/usr/bin/env node
// 《由己》正式上線功能／官方資源原始檔盤點：讀取已完成 QA 原稿，給出版本指紋。
// 僅產生 artifacts/ 的交接報告，完全不建立核准、不部署，也不改動原始資料。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotHash, approvedLaunchFeature } from './lib/launch-approval.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = p => path.join(root,p);
const readJson = async p => JSON.parse(await readFile(file(p),'utf8'));
const [approvals,portals,notices,pregnancy,topic54,county,open,english,scriptEvents,scriptCalendar] =
  await Promise.all([
    readJson('content/launch-approvals.json'),
    readJson('docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json'),
    readJson('docs/QA-ACTIVITIES-NOTICES-2026Q4-2027-2026-10-16.json'),
    readJson('docs/QA-LIFE-FAMILY-PREGNANCY-GUIDE-2026-10-17.json'),
    readJson('docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json'),
    readJson('docs/BATCH2-23-RESOURCE-CANDIDATES-2026-10-15.json'),
    readJson('docs/BATCH3-OPEN-ACCESS-CONTENT-2026-10-15.json'),
    readJson('docs/QA-ENGLISH-RESOURCE-DISCOVERY-2026-10-16.json'),
    readFile(file('src/qa-assets/js/qa-activities.js'),'utf8'),
    readFile(file('src/qa-assets/js/qa-calendar.js'),'utf8'),
  ]);
const groups = {
  activities:{portals,notices,script:scriptEvents},
  calendar:{script:scriptCalendar},
  pregnancy,
  topic54,
  resourceCatalog:{county,open,english},
};
if(portals.items?.length!==12 || notices.items?.length!==6 ||
   pregnancy.steps?.length!==4 || topic54.topics?.length!==54 ||
   county.items?.length!==23 || open.resources?.length!==9 ||
   english.resources?.length!==3 || Object.keys(english.overrides||{}).length!==8)
  throw new Error('既有 QA 原稿項目數量有變更，停止產生功能版本摘要：先確認來源，不自動放行');
if(!Object.values(groups).every(v=>v!=null))throw new Error('功能原稿遺失');
const features=Object.fromEntries(Object.entries(groups).map(([name,source])=>[name,{
  sha256:snapshotHash(source),
  currentlyApprovedForProduction:approvedLaunchFeature(name,source,approvals),
  sourceFiles: ({
    calendar:['src/qa-assets/js/qa-calendar.js'],
    activities:['docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json','docs/QA-ACTIVITIES-NOTICES-2026Q4-2027-2026-10-16.json','src/qa-assets/js/qa-activities.js'],
    pregnancy:['docs/QA-LIFE-FAMILY-PREGNANCY-GUIDE-2026-10-17.json'],
    topic54:['docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json'],
    resourceCatalog:['docs/BATCH2-23-RESOURCE-CANDIDATES-2026-10-15.json','docs/BATCH3-OPEN-ACCESS-CONTENT-2026-10-15.json','docs/QA-ENGLISH-RESOURCE-DISCOVERY-2026-10-16.json'],
  })[name],
}]));
const report={
  site:'由己 SELF-AUTHORED',
  note:'本站曾完成 QA 使用驗收與官方連結查核；本檔是把已存在原稿整理成待發布版本資料，不等於新的正式部署核准。不能寫進正式 approval 檔來冒充站主確認。',
  records:'新資源：地方入口23＋生活與自主學習9＋新住民多語3；英文輔助欄位8（僅既有卡片，不另增卡）。活動6／長期查詢12／孕產4段／主題54。',
  features,
};
const output=file('artifacts/launch-feature-batch.json');
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n','utf8');
console.log('正式上線功能快照清單：5組來源（小日曆、活動、孕產、54主題、35筆新增資源）；正式核准 '+Object.values(features).filter(f=>f.currentlyApprovedForProduction).length+' 組。未改公開網站。');
