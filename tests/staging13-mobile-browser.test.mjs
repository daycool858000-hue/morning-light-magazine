#!/usr/bin/env node
// 13篇隔離QA文章真實瀏覽器渲染：WebKit近似Safari + Chromium；不對外網發送資料，不部署
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {readFile,stat,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium,webkit}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=JSON.parse(await readFile(path.join(root,'config/site.json'),'utf8')).basePath;
const out=path.join(root,'dist-qa-staging13');
const queue=JSON.parse(await readFile(path.join(root,'docs/STAGING13-QA-IMPORT-QUEUE-2026-10-17.json'),'utf8'));
const articles=queue.articles.filter(x=>x.importToQa&&x.sourceFile.startsWith('docs/STAGING13-'));
assert.equal(articles.length,13);
const origin='http://127.0.0.1:4395';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,origin);
  if(!url.pathname.startsWith(base)){res.writeHead(404);res.end();return;}
  const rel=decodeURIComponent(url.pathname.slice(base.length))||'index.html';
  const full=path.resolve(out,rel);
  if(!full.startsWith(out+path.sep)||!existsSync(full)||(await stat(full)).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':mime[path.extname(full)]||'application/octet-stream','cache-control':'no-store'});
  res.end(await readFile(full));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(4395,'127.0.0.1',r));
let failures=[],checks=0;
try{
 await mkdir(path.join(root,'test-results/staging13'),{recursive:true});
 for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await browserType.launch({headless:true});
  try{
   for(const width of [320,390,1280]){
    const mobile=width<1000;
    const context=await browser.newContext({viewport:{width,height:mobile?760:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
     for(const art of articles){
      const rel='articles/'+art.slug+'.html';
      const resp=await page.goto(origin+base+rel,{waitUntil:'domcontentloaded'});
      await page.locator('.article h1').waitFor();
      const geom=await page.evaluate(()=>{
       const h=document.querySelector('.article h1'),p=document.querySelector('.article .prose'),header=document.querySelector('.site-header');
       const rect=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,width:r.width,height:r.height}};
       const links=[...document.querySelectorAll('.article .sources a[href]')];
       return{scrollOverflow:document.documentElement.scrollWidth-innerWidth,title:rect(h),prose:rect(p),header:header?rect(header):null,links:links.length,qa:document.body.textContent.includes('未核准測試內容')};
      });
      const ok=resp?.status()===200&&geom.scrollOverflow<=1&&geom.prose.width>0&&geom.prose.right<=width+2&&geom.title.left>=0&&geom.title.right<=width+2&&geom.links>=2&&geom.qa&&errors.length===0;
      checks++;
      if(!ok)failures.push({engine,width,slug:art.slug,response:resp?.status(),geom,jsErrors:errors.slice()});
      if(width===390&&['exp-consumer-dispute-records','exp-stalking-law-guide','exp-entrepreneur-story'].includes(art.slug)){
       await page.screenshot({path:path.join(root,'test-results/staging13',engine+'-'+art.id+'.png'),fullPage:false});
      }
     }
     for(const dir of ['quiet-power.html','toward-light.html']){
      const resp=await page.goto(origin+base+dir,{waitUntil:'domcontentloaded'});
      const over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      checks++;
      if(resp?.status()!==200||over>1)failures.push({engine,width,dir,resp:resp?.status(),overflow:over});
     }
    }finally{await context.close();}
   }
  }finally{await browser.close();}
 }
 console.log('13篇手機版瀏覽器檢查完成：'+checks+'項；錯誤'+failures.length+'項');
 if(failures.length){console.error(JSON.stringify(failures,null,2));process.exitCode=1;}
}finally{await new Promise(r=>server.close(r));}
