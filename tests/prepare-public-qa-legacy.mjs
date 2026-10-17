// 僅供測試：將曾同意公開 QA 的九篇（含 2026-10-17 站主撤稿的 exp-12），在隔離輸出中模擬回「尚未公開」狀態。
// 不會修改正式佇列、main、公開QA產物或正式核准資料。
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const live=JSON.parse(await readFile(path.join(root,'docs/QA-EXPANSION-IMPORT-QUEUE.json'),'utf8'));
// 曾上公開QA的九篇（歷史基線一律關閉）；目前公開QA只開其中八篇，exp-12 已由站主撤稿
const historical=['exp-01','exp-08','exp-11','exp-12','A1','A2','A4','B4','B5'];
const expected=historical.filter(id=>id!=='exp-12');
const enabled=live.articles.filter(a=>a.importToQa===true);
const withdrawn=live.articles.find(a=>a.id==='exp-12');
const eq=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
if (live.approvalStatus!=='not-approved'||live.articles.length!==22||live.resources.length!==13||
 !eq(enabled.map(x=>x.id),expected)||live.resources.some(r=>r.importToQa)||
 withdrawn?.importToQa!==false||withdrawn?.qaWithdrawal?.status!=='withdrawn-by-owner'||
 enabled.some(x=>x.sourceCheck!=='source-checked'||!x.sourceCheckedOn||!x.sourceCheckRecord)) {
  throw new Error('僅允許從已審核八篇（exp-12 站主撤稿）的公開QA佇列生成歷史暫存測試基線');
}
const closed=structuredClone(live);
for(const a of closed.articles) {
 if (historical.includes(a.id)) Object.assign(a,{importToQa:false,sourceCheck:'pending',sourceCheckedOn:null,sourceCheckRecord:null});
}
const fixture='docs/.qa-expansion-test-closed.generated.json';
await writeFile(path.join(root,fixture),JSON.stringify(closed,null,2)+'\n');
execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out=dist-qa-closed-legacy'],{
 cwd:root,env:{...process.env,QA_EXPANSION_QUEUE:fixture},stdio:'inherit'
});
console.log('歷史未公開基線測試產物已建立：dist-qa-closed-legacy（36篇）；正式佇列維持8篇公開QA（exp-12 站主撤稿）。');
