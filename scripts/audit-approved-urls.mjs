#!/usr/bin/env node
// 只稽核已核准發布的官方外部網址是否可連線，不改動網站資料或核准紀錄。
// HTTP 狀態與機器人阻擋不能代替人工／AI 原文內容查核；本腳本只測試連線。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async name=>JSON.parse(await readFile(path.join(ROOT,name),'utf8'));
const approval=await read('content/release-approvals.json');
const resources=await read('content/resources.json');
const hotlines=await read('content/hotlines.json');
const entries=new Map();
const add=(url,label)=>{
 if(!url) return;
 if(!/^https:\/\//.test(url)) throw new Error('非 HTTPS 官方入口：'+label);
 if(!entries.has(url))entries.set(url,new Set());
 entries.get(url).add(label);
};
const targetResource=resources.items.filter(r=>approval.resources?.[r.id]?.snapshot&&JSON.stringify(r)===JSON.stringify(approval.resources[r.id].snapshot));
const targetHot=hotlines.items.filter(h=>approval.hotlines?.[h.id]?.snapshot&&JSON.stringify(h)===JSON.stringify(approval.hotlines[h.id].snapshot));
const targetChannels=hotlines.channels.filter(ch=>approval.channels?.[ch.id]?.snapshot&&JSON.stringify(ch)===JSON.stringify(approval.channels[ch.id].snapshot));
if(targetResource.length!==16||targetHot.length!==4||targetChannels.length!==1)throw Error('核准版本與資料不符，停止連結稽核');
for(const r of targetResource){add(r.url,'機構 '+r.id);for(const s of r.sources||[])add(s.url,'來源 '+r.id);}
for(const h of targetHot)add(h.source?.url,'專線 '+h.id);
for(const ch of targetChannels)add(ch.url,'管道 '+ch.id);
const list=[...entries].map(([url,from])=>({url,from:[...from]}));
const headers={'user-agent':'Mozilla/5.0 (compatible; SelfAuthoredLinkAudit/1.0)','accept-language':'zh-TW,zh;q=0.9'};
async function request(url,method){
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),12000);
 try{
  const res=await fetch(url,{method,redirect:'follow',signal:ctrl.signal,headers});
  await res.body?.cancel();
  return {status:res.status,finalUrl:res.url,redirected:res.redirected};
 }finally{clearTimeout(timer);}
}
async function probe(item){
 try{
  let output=await request(item.url,'HEAD');
  // 部分官方網站未實作 HEAD、拒絕 HEAD，或回傳與 GET 不一致的錯誤。
  if(output.status<200||output.status>=400)output=await request(item.url,'GET');
  const category=output.status>=200&&output.status<400?'可連線':([404,410].includes(output.status)?'疑似失效':'機器無法確認');
  return {...item,...output,category};
 }catch(e){
  return {...item,status:null,category:'機器無法確認',error:e.name==='AbortError'?'逾時':String(e.cause?.code||e.name).slice(0,70)};
 }
}
let index=0;const results=[];
await Promise.all(Array.from({length:Math.min(4,list.length)},async()=>{
 while(index<list.length){const i=index++;results[i]=await probe(list[i]);}
}));
const counts={可連線:0,疑似失效:0,機器無法確認:0};
for(const r of results)counts[r.category]++;
const when=new Date().toISOString();
const safe=(s)=>String(s??'').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ');
const report=[
 '# 《由己》已核准官方入口連線稽核',
 '',
 '檢查時間（UTC）：'+when,
 '版本：'+process.env.GITHUB_SHA,
 '範圍：16 筆機構入口與現有來源、4 支專線、110 SMS 官方入口；去重後 '+list.length+' 個網址。',
 '',
 '**只判斷網路連線，不代表官方原文證實所有欄位，也不變更作者核准。** 403、429、逾時屬機器無法確認，不視為證實網站失效；404／410 需人工複核。',
 '',
 '結果：可連線 '+counts['可連線']+'、疑似失效 '+counts['疑似失效']+'、機器無法確認 '+counts['機器無法確認']+'。',
 '',
 '| 分類 | HTTP | 使用位置 | 官方網址 / 導向 |',
 '|---|---:|---|---|',
 ...results.map(r=>`| ${r.category} | ${r.status??safe(r.error)} | ${safe(r.from.join('、'))} | ${safe(r.url)}${r.redirected?' → '+safe(r.finalUrl):''} |`),
 '',
 '不得將本次批次連線稽核冒充正式商標查核、個人逐頁查核或真實手機驗收。',
 ''
].join('\n');
const dest=process.env.LINK_AUDIT_OUTPUT||path.join(ROOT,'dist-link-audit','approved-url-check.md');
await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,report);
console.log(`官方已核准網址連線稽核：共 ${results.length} 個；可連線 ${counts['可連線']}、疑似失效 ${counts['疑似失效']}、機器無法確認 ${counts['機器無法確認']}`);
for(const r of results)if(r.category!=='可連線')console.log(`需複核：${r.category} HTTP=${r.status??r.error} ${r.from.join(',')} ${r.url}`);
console.log('報告已儲存：'+dest);
