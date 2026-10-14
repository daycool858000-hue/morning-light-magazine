#!/usr/bin/env node
// 批次核准回歸測試：故意修改資料與圖片，確保舊核准不會自動沿用。
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { approvedRecord, approvedPhotoMetadata, gitBlobSha } from '../scripts/lib/release.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const approvals=await readJson('content/release-approvals.json');
const r=(await readJson('content/resources.json')).items;
const h=await readJson('content/hotlines.json');
const p=(await readJson('content/photos.json')).items;
const g=await readJson('src/assets/photos/generated.json');
const copy=x=>JSON.parse(JSON.stringify(x));
const check=(condition,message)=>assert.ok(condition,message);
check(Object.keys(approvals.resources).length===16,'必須核准 16 筆入口');
check(Object.keys(approvals.hotlines).length===4,'必須核准四支專線');
check(Object.keys(approvals.channels).length===1,'只能核准一個 SMS 入口');
check(Object.keys(approvals.photos).length===9,'必須核准九張圖片');
for(const item of r){
 const approved=approvedRecord(item,approvals.resources,'official-entry');
 check(approved === !['mohw-sps','sfaa'].includes(item.id),'機構閘門 '+item.id);
 check(item.status==='待確認'&&item.checkedAt===null,'不能捏造人工查核 '+item.id);
 if(approved){const changed=copy(item);changed.summary+=' 已修改';check(!approvedRecord(changed,approvals.resources,'official-entry'),'修改簡介需重新核准 '+item.id);}
}
for(const item of h.items){
 check(approvedRecord(item,approvals.hotlines,'hotline-purpose-hours'),'專線閘門 '+item.id);
 const changed=copy(item);changed.hours+=' （已修改）';
 check(!approvedRecord(changed,approvals.hotlines,'hotline-purpose-hours'),'修改專線時段需重新核准 '+item.id);
}
for(const item of h.channels){
 check(approvedRecord(item,approvals.channels,'official-channel')===(item.id==='sms-110'),'通道閘門 '+item.id);
}
const allow=new Set(),fileNames=[];
for(const item of p){
 const ok=approvedPhotoMetadata(item,approvals.photos,g);
 check(ok === (item.required===true),'圖片核准閘門 '+item.id);
 if(!ok)continue;
 const e=approvals.photos[item.id];
 const original=await readFile(path.join(root,'content/photos/originals',item.id+'.png'));
 check(gitBlobSha(original)===e.originalGitBlobSha,'原圖版本錯誤 '+item.id);
 const changed=copy(item);changed.crops[Object.keys(changed.crops)[0]].focusX=0.101;
 check(!approvedPhotoMetadata(changed,approvals.photos,g),'裁切更改需重新核准 '+item.id);
 const genCopy=copy(g);genCopy[item.id].nativeWidth=999;
 check(!approvedPhotoMetadata(item,approvals.photos,genCopy),'處理結果變更需重新核准 '+item.id);
 for(const [name,sha] of Object.entries(e.assets)){
   check(gitBlobSha(await readFile(path.join(root,'src/assets/photos',name)))===sha,'輸出圖版本不符 '+name);
   allow.add(name);fileNames.push(name);
 }
}
check(allow.size===84,'只允許原先的 84 張響應式衍生圖片');
const dist=path.join(root,'dist-production');
const html=await readFile(path.join(dist,'city.html'),'utf8');
check((html.match(/ data-res /g)||[]).length===16,'正式城市目錄應有 16 筆');
check(!html.includes('最後查核：尚未查核'),'核准入口不能顯示尚未查核');
check(!html.includes('對象</dt>'),'僅基本入口不得公開未核准的對象細節');
const index=await readFile(path.join(dist,'assets/data/search-index.js'),'utf8');
check(!index.includes('求職者、轉職者與想參加職業訓練的民眾'),'正式搜尋索引不能洩漏未納入基本入口核准的適用對象');
const support=await readFile(path.join(dist,'support.html'),'utf8');
for(const n of ['110','119','113','1925'])check(support.includes('tel:'+n),'支援頁缺少專線 '+n);
check(support.includes('前往警政署簡訊報案號碼表'),'缺少官方 SMS 入口');
check(!support.includes('110 視訊報案 App'),'視訊 App 未核准');
const built=(await readdir(path.join(dist,'assets/photos'))).sort();
check(JSON.stringify(built)===JSON.stringify(fileNames.sort()),'正式圖片輸出不能包含未核准或額外檔案');
console.log('✔ 批次核准測試：16 入口、4 專線、1 SMS、9 圖片及 84 衍生檔；未核准資料排除，改動需重新核准。');
