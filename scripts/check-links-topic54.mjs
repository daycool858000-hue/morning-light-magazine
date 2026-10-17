#!/usr/bin/env node
// 54主題候選入口：Chromium外部連結稽核。不等於臺灣Safari或站主完整人工查核。
// 逐筆分類開啟成功／下載／海外受阻／需內容重驗／確定失效。
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const data=JSON.parse(await readFile('docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json','utf8'));
const targets=new Map();
for(const t of data.topics){
 if(t.displayMode==='keep')continue;
 for(const l of t.links){
  if(!targets.has(l.url))targets.set(l.url,{url:l.url,agency:l.agency,label:l.name,topicIds:[]});
  targets.get(l.url).topicIds.push(t.id);
 }
}
const jobs=[...targets.values()];
const rows=[],brokenStatus=new Set([404,410]);
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({locale:'zh-TW',acceptDownloads:true});
let pos=0;
async function runner(){
 while(pos<jobs.length){
  const v=jobs[pos++];
  const page=await ctx.newPage();
  let type='ok',status=null,title='',finalUrl=v.url,reason='';
  try{
   const response=await page.goto(v.url,{waitUntil:'domcontentloaded',timeout:18000});
   status=response?.status()??null;finalUrl=page.url();
   title=(await page.title().catch(()=>'')).replace(/\s+/g,' ').slice(0,120);
   if(brokenStatus.has(status))type='broken';
   else if(status===403||status===429||status===503)type='blocked';
   else if(status&&status>=400)type='review';
   else if(/^(error|request rejected|just a moment)|access denied|404 not found/i.test(title))type='review';
   else if(!title)type='review';
  }catch(e){
   reason=String(e.message||e).slice(0,200);
   if(/Download is starting/i.test(reason)){type='download';reason='browser download';}
   else if(/ERR_NAME_NOT_RESOLVED|ERR_INVALID_URL/i.test(reason))type='broken';
   else type='blocked';
  }finally{await page.close().catch(()=>{})}
  rows.push({...v,type,status,title,finalUrl,reason});
  console.log(type.toUpperCase()+' '+String(status||'-')+' '+v.topicIds.join(',')+' '+v.url+' '+(title||reason));
 }
}
await Promise.all(Array.from({length:Math.min(5,jobs.length)},runner));
await browser.close();
rows.sort((a,b)=>a.url.localeCompare(b.url));
const stats=Object.fromEntries(['ok','download','blocked','review','broken'].map(k=>[k,rows.filter(r=>r.type===k).length]));
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/qa-topic54-link-results.json',JSON.stringify({date:new Date().toISOString(),source:'github-actions-us-chromium',stats,items:rows},null,2)+'\n');
console.log('改動入口原始網址共'+jobs.length+'筆 '+JSON.stringify(stats));
if(stats.broken)process.exitCode=1;
