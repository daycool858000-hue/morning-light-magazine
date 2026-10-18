#!/usr/bin/env node
// 《由己》正式上線功能／官方資源原始檔盤點：讀取 62 篇預覽使用的原稿，給出版本指紋。
// 僅產生 artifacts/ 的交接報告，完全不建立核准、不部署，也不改動原始資料。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotHash, approvedLaunchFeature, launchQueueFile, LAUNCH_SCOPE, LAUNCH_FEATURES } from './lib/launch-approval.mjs';
import { loadLaunchFeatureInputs, LAUNCH_FEATURE_FILES } from './lib/launch-inputs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const approvals = JSON.parse(await readFile(path.join(root,'content/launch-approvals.json'),'utf8'));
const queueFile = launchQueueFile();
const inputs = await loadLaunchFeatureInputs(root, queueFile);
const { activities, pregnancy, topic54, resourceCatalog, cityServices } = inputs;
if(activities.portals.items?.length!==LAUNCH_SCOPE.portals || activities.notices.items?.length!==LAUNCH_SCOPE.noticesTotal ||
   pregnancy.steps?.length!==4 || topic54.topics?.length!==LAUNCH_SCOPE.topics ||
   resourceCatalog.county.items?.length!==23 || resourceCatalog.open.resources?.length!==9 ||
   resourceCatalog.english.resources?.length!==3 || Object.keys(resourceCatalog.english.overrides||{}).length!==8 ||
   cityServices.resources.length!==LAUNCH_SCOPE.cityServices ||
   new Set(cityServices.resources.map(x=>x.url)).size!==LAUNCH_SCOPE.cityServices)
  throw new Error('62 篇預覽的功能原稿項目數量有變更，停止產生功能版本摘要：先確認來源，不自動放行');
const features=Object.fromEntries(LAUNCH_FEATURES.map(name=>[name,{
  sha256:snapshotHash(inputs[name]),
  currentlyApprovedForProduction:approvedLaunchFeature(name,inputs[name],approvals),
  sourceFiles:LAUNCH_FEATURE_FILES[name],
}]));
const report={
  site:'由己 SELF-AUTHORED', queueFile,
  note:'本站曾完成 QA 使用驗收與官方連結查核；本檔是把 62 篇預覽已存在原稿整理成待發布版本資料，不等於新的正式部署核准。不能寫進正式 approval 檔來冒充站主確認。',
  records:`新資源：地方入口23＋生活與自主學習9＋新住民多語3；英文輔助欄位8（僅既有卡片，不另增卡）；六縣市直接服務入口${LAUNCH_SCOPE.cityServices}。活動公告${LAUNCH_SCOPE.noticesTotal}（建置時剔除已結束）／長期查詢${LAUNCH_SCOPE.portals}／孕產4段／主題${LAUNCH_SCOPE.topics}。`,
  features,
};
const output=path.join(root,'artifacts/launch-feature-batch.json');
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n','utf8');
console.log(`正式上線功能快照清單：${LAUNCH_FEATURES.length}組來源（小日曆、活動、孕產、54主題、35筆新增資源、六縣市15筆服務入口）；正式核准 `+Object.values(features).filter(f=>f.currentlyApprovedForProduction).length+' 組。未改公開網站。');
