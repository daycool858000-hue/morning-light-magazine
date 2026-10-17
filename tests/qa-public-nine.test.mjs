// 已授權公開QA的正向安全測試，與「尚未公開」歷史回歸檢查並行。
// 測試通過不等於站主正式內容核准。
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async(p)=>readFile(path.join(root,p),'utf8');
const names=['exp-01','exp-08','exp-11','exp-12','A1','A2','A4','B4','B5'];
const queue=JSON.parse(await read('docs/QA-EXPANSION-IMPORT-QUEUE.json'));
const staged=JSON.parse(await read('docs/QA-EXPANSION-STAGING-NINE-2026-10-17.json'));
let failed=0,count=0;
function check(label,ok,reason='') {
 count++;if(!ok)failed++;
 console.log((ok?'✔':'✘')+' '+label+(reason?' — '+reason:''));
}
const enabled=queue.articles.filter(x=>x.importToQa===true);
const actualIds=enabled.map(x=>x.id);
const records=enabled.every(x=>x.sourceCheck==='source-checked'&&x.sourceCheckedOn==='2026-10-17'&&
 typeof x.sourceCheckRecord==='string'&&x.sourceCheckRecord.startsWith('docs/')&&existsSync(path.join(root,x.sourceCheckRecord))&&
 x.ownerPublicationApproval!==true&&x.productionApproved!==true);
check('僅指定九篇經AI查核可供公開QA，其他13篇與13筆多語資源全部關閉，正式核准維持否',
 queue.approvalStatus==='not-approved'&&queue.articles.length===22&&queue.resources.length===13&&
 actualIds.length===9&&names.every(id=>actualIds.includes(id))&&records&&
 queue.articles.filter(x=>!names.includes(x.id)).every(x=>!x.importToQa&&x.sourceCheck==='pending')&&
 queue.resources.every(x=>!x.importToQa&&x.sourceCheck==='pending'));

const same=names.every(id=>{
 const a=enabled.find(x=>x.id===id),s=staged.articles.find(x=>x.id===id);
 return a&&s&&['slug','title','category','directory','sourceFile','heading','sourceCheckedOn','sourceCheckRecord'].every(k=>JSON.stringify(a[k])===JSON.stringify(s[k]));
});
check('九篇公開QA正文版本、歸類與來源證據跟驗收用獨立暫存版相同',same&&staged.stagingOnly===true);

const qapages=(await readdir(path.join(root,'dist-qa/articles'))).filter(x=>x.endsWith('.html'));
const oldpages=(await readdir(path.join(root,'dist-qa-closed-legacy/articles'))).filter(x=>x.endsWith('.html'));
const baseOnly=oldpages.every(x=>qapages.includes(x));
let changed=[];
for(const file of oldpages) if(await read('dist-qa/articles/'+file)!==await read('dist-qa-closed-legacy/articles/'+file)) changed.push(file);
check('公開QA 45篇與歷史36篇正文逐位元組保持一致',qapages.length===45&&oldpages.length===36&&baseOnly&&changed.length===0,changed.slice(0,3).join('、'));

const qaIndex=await read('dist-qa/assets/data/search-index.js');
const prodIndex=await read('dist-production/assets/data/search-index.js');
let invalid=[];
for(const a of enabled) {
 const loc='dist-qa/articles/'+a.slug+'.html', h=await read(loc);
 if(!h.includes('未核准測試內容')||!h.includes('noindex, nofollow')||!h.includes('來源查核：2026-10-17（AI 編輯查核，尚未經網站擁有人核准）')||
 !qaIndex.includes('articles/'+a.slug+'.html')||prodIndex.includes(a.slug)||existsSync(path.join(root,'dist-production/articles/'+a.slug+'.html')))invalid.push(a.id);
}
check('九篇皆有未核准、AI查核與noindex，能搜尋，且不進production',invalid.length===0,invalid.join('、'));

const qp=await read('dist-qa/quiet-power.html');
const toward=await read('dist-qa/toward-light.html');
const rl=[...qp.matchAll(/<h3><a href="articles\/([^"]+)\.html">/g)].map(m=>m[1]);
const tw=[...toward.matchAll(/<article class="toward-reading-card">\s*<a href="articles\/([^"]+)\.html">/g)].map(m=>m[1]);
const readliIds=['exp-01','exp-08','B4'];
check('讀利26、向光19、八索引不變，九篇無重複目錄歸屬',
 rl.length===26&&tw.length===19&&
 readliIds.every(id=>rl.includes(enabled.find(x=>x.id===id).slug))&&
 names.filter(id=>!readliIds.includes(id)).every(id=>tw.includes(enabled.find(x=>x.id===id).slug))&&
 (toward.match(/toward-panel"/g)||[]).length===8&&
 new Set([...rl,...tw]).size===45);

let portalCount=0;
for(const page of ['life-family','career','health','law','learning']) {
 const h=await read('dist-qa/'+page+'.html');
 portalCount+=(h.match(/id="portal-act-/g)||[]).length;
}
const learning=await read('dist-qa/learning.html');
check('11筆官方文字入口與文化部既有卡去重',portalCount===11&&learning.includes('res-open-culture-events')&&!learning.includes('id="portal-act-09"'));

const hOld=await read('dist-qa-closed-legacy/health.html'),hNew=await read('dist-qa/health.html');
check('身心健康頁差異是新增的合法 exp-08 文章，原支援頁保持不變',hOld!==hNew&&hNew.includes('exp-personal-boundaries')&&!hOld.includes('exp-personal-boundaries')&&
 (await read('dist-qa/support.html'))===(await read('dist-qa-closed-legacy/support.html')));

const approvalText=await read('content/release-approvals.json');
check('九篇未被寫入正式發布核准快照',names.every(id=>!approvalText.includes(enabled.find(x=>x.id===id).slug)));
console.log('公開QA／歷史模式雙驗收：'+count+'項，通過'+(count-failed)+'，失敗'+failed);
if(failed)process.exitCode=1;
