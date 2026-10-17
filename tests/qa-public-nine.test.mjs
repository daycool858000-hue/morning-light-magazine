// 已授權公開QA的正向安全測試，與「尚未公開」歷史回歸檢查並行。
// 2026-10-17 站主撤下 exp-12（exp-compare-everyday-experiments）：公開QA改為八篇擴充、共 44 篇（讀利26／向光18）。
// 測試通過不等於站主正式內容核准。
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async(p)=>readFile(path.join(root,p),'utf8');
import { loadQaExpansion } from '../scripts/lib/qa-expansion.mjs';
const names=['exp-01','exp-08','exp-11','A1','A2','A4','B4','B5'];
const WITHDRAWN={id:'exp-12',slug:'exp-compare-everyday-experiments',title:'同一個生活實驗，換了條件，結果還能直接比較嗎？',record:'docs/QA-EXP-12-OWNER-WITHDRAWAL-2026-10-17.md'};
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
check('僅指定八篇經AI查核可供公開QA，exp-12 站主撤稿關閉，其他13篇與13筆多語資源全部關閉，正式核准維持否',
 queue.approvalStatus==='not-approved'&&queue.articles.length===22&&queue.resources.length===13&&
 actualIds.length===8&&names.every(id=>actualIds.includes(id))&&records&&
 queue.articles.filter(x=>!names.includes(x.id)&&x.id!==WITHDRAWN.id).every(x=>!x.importToQa&&x.sourceCheck==='pending')&&
 queue.resources.every(x=>!x.importToQa&&x.sourceCheck==='pending'));

// exp-12 站主撤稿：佇列留下編輯決定與歷史，載入器擋下重新匯入
const w=queue.articles.find(x=>x.id===WITHDRAWN.id);
const wRecord=existsSync(path.join(root,WITHDRAWN.record))?await read(WITHDRAWN.record):'';
check('exp-12 在匯入佇列停用並記錄為站主主動撤稿；原稿、AI 查核紀錄與曾上公開QA的歷史保留',
 w&&w.slug===WITHDRAWN.slug&&w.title===WITHDRAWN.title&&w.importToQa===false&&
 w.qaWithdrawal?.status==='withdrawn-by-owner'&&w.qaWithdrawal.decidedOn==='2026-10-17'&&w.qaWithdrawal.doNotReimport===true&&
 w.qaWithdrawal.previouslyOnPublicQa===true&&w.qaWithdrawal.record===WITHDRAWN.record&&
 wRecord.includes(WITHDRAWN.slug)&&wRecord.includes('站主')&&wRecord.includes('38995630481')&&
 existsSync(path.join(root,w.sourceFile))&&(await read(w.sourceFile)).includes('# 12｜'+WITHDRAWN.title)&&
 existsSync(path.join(root,w.sourceCheckRecord)));
{
 const categories=JSON.parse(await read('content/categories.json'));
 const counties=JSON.parse(await read('content/counties.json'));
 const resourceData=JSON.parse(await read('content/resources.json'));
 const ctx={categories,counties,serviceTypes:resourceData.serviceTypes,existingResources:resourceData.items,existingArticles:[],queueFile:'docs/QA-EXPANSION-IMPORT-QUEUE.json'};
 const attempt=async(mutate)=>{const q=structuredClone(queue);mutate(q.articles.find(x=>x.id===WITHDRAWN.id));
  try{await loadQaExpansion(root,{...ctx,queue:q});return '';}catch(e){return e.message;}};
 const reopen=await attempt(x=>{x.importToQa=true;});
 const noRecord=await attempt(x=>{x.qaWithdrawal.record='docs/missing.md';});
 const ok=await attempt(()=>{});
 check('日後自動匯入：exp-12 被改回 importToQa=true 或撤稿紀錄缺漏時，QA 建置直接失敗',
  /已由站主撤稿/.test(reopen)&&/qaWithdrawal/.test(noRecord)&&ok==='',[reopen,noRecord,ok].map(x=>x.slice(0,40)).join('｜'));
}

const same=names.every(id=>{
 const a=enabled.find(x=>x.id===id),s=staged.articles.find(x=>x.id===id);
 return a&&s&&['slug','title','category','directory','sourceFile','heading','sourceCheckedOn','sourceCheckRecord'].every(k=>JSON.stringify(a[k])===JSON.stringify(s[k]));
});
check('八篇公開QA正文版本、歸類與來源證據跟驗收用獨立暫存版相同',same&&staged.stagingOnly===true);

const qapages=(await readdir(path.join(root,'dist-qa/articles'))).filter(x=>x.endsWith('.html'));
const oldpages=(await readdir(path.join(root,'dist-qa-closed-legacy/articles'))).filter(x=>x.endsWith('.html'));
const baseOnly=oldpages.every(x=>qapages.includes(x));
let changed=[];
for(const file of oldpages) if(await read('dist-qa/articles/'+file)!==await read('dist-qa-closed-legacy/articles/'+file)) changed.push(file);
check('公開QA 44篇（36＋8），歷史36篇文章頁逐位元組保持一致',qapages.length===44&&oldpages.length===36&&baseOnly&&changed.length===0,changed.slice(0,3).join('、'));

// 其餘八篇：文章本體（<article>…</article>，含標題、查核標示、正文與來源）與撤稿前的九篇暫存驗收版逐位元組相同
const articleBody=(h)=>{const i=h.indexOf('<article class="article">'),j=h.indexOf('</article>',i);return i<0||j<0?null:h.slice(i,j);};
const rewritten=[];
for(const a of enabled){
 const now=articleBody(await read('dist-qa/articles/'+a.slug+'.html'));
 const before=existsSync(path.join(root,'dist-qa-staging-nine/articles/'+a.slug+'.html'))?articleBody(await read('dist-qa-staging-nine/articles/'+a.slug+'.html')):null;
 if(!now||now!==before)rewritten.push(a.id);
}
check('撤下 exp-12 後，其餘八篇文章正文、標題與來源沒有被改寫（對照撤稿前 45 篇暫存版）',rewritten.length===0,rewritten.join('、'));

// exp-12 從公開QA建置完全消失：文章網址、搜尋、目錄、分類頁、相關連結、sitemap
async function walk(dir){const out=[];for(const e of await readdir(dir)){const f=path.join(dir,e);if((await stat(f)).isDirectory())out.push(...await walk(f));else out.push(f);}return out;}
const leaks=[];
for(const f of await walk(path.join(root,'dist-qa'))){
 if(!/\.(html|js|json|xml|txt)$/.test(f))continue;
 const t=await readFile(f,'utf8');
 if(t.includes(WITHDRAWN.slug)||t.includes(WITHDRAWN.title)||t.includes('生活實驗'))leaks.push(path.relative(root,f));
}
check('exp-12 文章網址不再產生，搜尋索引、讀利／向光目錄、六大分類頁、相關連結及任何頁面都不再出現；dist-qa 沒有 sitemap',
 !existsSync(path.join(root,'dist-qa/articles/'+WITHDRAWN.slug+'.html'))&&!existsSync(path.join(root,'dist-qa/sitemap.xml'))&&leaks.length===0,leaks.slice(0,5).join('、'));

const qaIndex=await read('dist-qa/assets/data/search-index.js');
const prodIndex=await read('dist-production/assets/data/search-index.js');
let invalid=[];
for(const a of enabled) {
 const loc='dist-qa/articles/'+a.slug+'.html', h=await read(loc);
 if(!h.includes('未核准測試內容')||!h.includes('noindex, nofollow')||!h.includes('來源查核：2026-10-17（AI 編輯查核，尚未經網站擁有人核准）')||
 !qaIndex.includes('articles/'+a.slug+'.html')||prodIndex.includes(a.slug)||existsSync(path.join(root,'dist-production/articles/'+a.slug+'.html')))invalid.push(a.id);
}
check('八篇皆有未核准、AI查核與noindex，能搜尋，且不進production',invalid.length===0,invalid.join('、'));

const qp=await read('dist-qa/quiet-power.html');
const toward=await read('dist-qa/toward-light.html');
const rl=[...qp.matchAll(/<h3><a href="articles\/([^"]+)\.html">/g)].map(m=>m[1]);
const tw=[...toward.matchAll(/<article class="toward-reading-card">\s*<a href="articles\/([^"]+)\.html">/g)].map(m=>m[1]);
const readliIds=['exp-01','exp-08','B4'];
check('讀利26、向光18、八索引不變，八篇無重複目錄歸屬',
 rl.length===26&&tw.length===18&&
 readliIds.every(id=>rl.includes(enabled.find(x=>x.id===id).slug))&&
 names.filter(id=>!readliIds.includes(id)).every(id=>tw.includes(enabled.find(x=>x.id===id).slug))&&
 (toward.match(/toward-panel"/g)||[]).length===8&&
 new Set([...rl,...tw]).size===44&&!tw.includes(WITHDRAWN.slug)&&!rl.includes(WITHDRAWN.slug));

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
check('八篇與撤稿的 exp-12 都未被寫入正式發布核准快照',names.every(id=>!approvalText.includes(enabled.find(x=>x.id===id).slug))&&!approvalText.includes(WITHDRAWN.slug));
console.log('公開QA／歷史模式雙驗收：'+count+'項，通過'+(count-failed)+'，失敗'+failed);
if(failed)process.exitCode=1;
