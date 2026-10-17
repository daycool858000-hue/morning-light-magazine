#!/usr/bin/env node
// 《由己》公開QA的只讀全頁連結稽核，包含所有文章頁實際輸出的外部連結。
// 不修改站台、任何核准檔或發布狀態；GitHub CI的美國機房結果不能代替臺灣Safari體驗。
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import path from 'node:path';
const ROOT=path.resolve('dist-qa');
const site=JSON.parse(await readFile('config/site.json','utf8'));
const base=new URL(site.productionUrl);
const ownHosts=new Set([base.hostname]);
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const clean=s=>decode(s.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()).slice(0,150);
async function walk(dir,basePath=''){
 let out=[];
 for(const ent of await readdir(dir,{withFileTypes:true})){
  const loc=path.join(dir,ent.name),rel=basePath+ent.name;
  if(ent.isDirectory())out.push(...await walk(loc,rel+'/'));
  else if(ent.isFile()&&rel.endsWith('.html'))out.push(rel);
 }
 return out;
}
const pages=await walk(ROOT);
const files=new Map(await Promise.all(pages.map(async f=>[f,await readFile(path.join(ROOT,f),'utf8')])));
const brokenInternal=[],internal=[],externalMap=new Map(),other=[],targetless=[],newWindowRelProblems=[];
const hrefRe=/<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const attr=(attrs,key)=>{
 const r=new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i').exec(attrs);
 return r?decode(r[1]??r[2]??r[3]):null;
};
const fileFor=p=>{
 let x=decodeURIComponent(p);
 if(x.startsWith(base.pathname))x=x.slice(base.pathname.length);
 else return null;
 if(!x||x.endsWith('/'))x+='index.html';
 return x;
};
for(const [page,html] of files){
 const siteURL=new URL(page,base);
 let m;
 while((m=hrefRe.exec(html))){
  const attrs=m[1],href=attr(attrs,'href');
  const text=clean(m[2]);
  if(!href){targetless.push({page,text});continue}
  if(href.startsWith('tel:')||href.startsWith('sms:')||href.startsWith('mailto:')){
   other.push({page,href,text});continue;
  }
  let url;
  try{url=new URL(href,siteURL)}catch(e){brokenInternal.push({page,href,text,issue:'unparseable URL'});continue}
  if(url.protocol!=='https:'&&url.protocol!=='http:'){
   brokenInternal.push({page,href,text,issue:'unsafe or unsupported protocol'});continue;
  }
  if(!ownHosts.has(url.hostname)){
   const k=url.href.split('#')[0];
   if(!externalMap.has(k))externalMap.set(k,{url:k,uses:[]});
   externalMap.get(k).uses.push({page,text});
   if(attr(attrs,'target')==='_blank'&&!/(^|\s)noopener(\s|$)/.test(attr(attrs,'rel')||''))newWindowRelProblems.push({page,href});
   continue;
  }
  const file=fileFor(url.pathname);
  const missing=!file||!files.has(file);
  let idOK=true;
  if(!missing&&url.hash){
   const hash=decodeURIComponent(url.hash.slice(1));
   const dom=files.get(file);
   idOK=dom.includes('id="'+hash+'"')||dom.includes("id='"+hash+"'")||dom.includes('name="'+hash+'"');
  }
  const record={page,href,text,resolvedFile:file,missingFile:missing,missingAnchor:!idOK};
  internal.push(record);
  if(missing||!idOK)brokenInternal.push({...record,issue:missing?'missing HTML file':'missing target anchor'});
 }
}
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({locale:'zh-TW',acceptDownloads:true});
const targets=[...externalMap.values()];
let cursor=0,externalResults=[];
async function verify(){
 while(cursor<targets.length){
  const x=targets[cursor++],tab=await ctx.newPage();
  let status=null,title='',finalUrl=x.url,type='ok',error='';
  try{
   const res=await tab.goto(x.url,{waitUntil:'domcontentloaded',timeout:13000});
   status=res?.status()??null;finalUrl=tab.url();
   title=(await tab.title().catch(()=>'')).replace(/\s+/g,' ').slice(0,120);
   if(status===404||status===410)type='broken';
   else if([403,429,503].includes(status))type='blocked';
   else if(status&&status>=400)type='review';
   else if(/^(error|request rejected|just a moment|access denied)/i.test(title)||!title)type='review';
  }catch(e){
   error=String(e.message||e).slice(0,210);
   if(/Download is starting/i.test(error))type='download';
   else if(/ERR_NAME_NOT_RESOLVED|ERR_INVALID_URL/i.test(error))type='broken';
   else type='blocked';
  }finally{await tab.close().catch(()=>{})}
  externalResults.push({url:x.url,type,status,title,finalUrl,error,usedBy:x.uses.slice(0,12),useCount:x.uses.length});
  console.log(type.toUpperCase()+' '+String(status??'-')+' '+x.url+' '+(title||error));
 }
}
await Promise.all(Array.from({length:Math.min(6,targets.length)},verify));
await browser.close();
externalResults.sort((a,b)=>a.url.localeCompare(b.url));
const classifications=Object.fromEntries(['ok','blocked','review','download','broken'].map(k=>[k,externalResults.filter(x=>x.type===k).length]));
const data={generatedAt:new Date().toISOString(),website:site.productionUrl,build:'dist-qa (currently deployed 45-article QA branch)',checkedBy:'GitHub Actions US Chromium, not Taiwan iPhone Safari',counts:{htmlPages:pages.length,internalAnchors:internal.length,distinctExternalUrls:externalResults.length,externalTotalUses:externalResults.reduce((n,x)=>n+x.useCount,0),specialSchemes:other.length,missingHref:targetless.length,internalProblems:brokenInternal.length,newWindowMissingNoopener:newWindowRelProblems.length,externalClassifications:classifications},internalProblems:brokenInternal,missingHref:targetless,relProblems:newWindowRelProblems,externalResults};
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/public-qa-site-links-full-audit.json',JSON.stringify(data,null,2)+'\n');
console.log('全站QA連結查核總結 '+JSON.stringify(data.counts));
if(brokenInternal.length||classifications.broken)process.exitCode=1;
