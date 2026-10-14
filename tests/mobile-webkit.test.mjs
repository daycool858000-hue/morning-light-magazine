#!/usr/bin/env node
// WebKit 模擬 Safari 的輕量手機驗收。不是在真正 iPhone 上執行。
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { webkit }=require('playwright');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DIST=path.join(ROOT,'dist-production');
const base=(JSON.parse(await readFile(path.join(ROOT,'config/site.json'),'utf8'))).basePath;
const port=4369;
const origin=`http://127.0.0.1:${port}`;
const contentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,origin);
    if(!u.pathname.startsWith(base)){res.writeHead(404);res.end();return;}
    let rel=decodeURIComponent(u.pathname.slice(base.length))||'index.html';
    if(rel.endsWith('/'))rel+='index.html';
    const file=path.resolve(DIST,rel);
    if(!file.startsWith(DIST+path.sep)||!existsSync(file)||(await stat(file)).isDirectory()){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'content-type':contentTypes[path.extname(file)]||'application/octet-stream'});
    res.end(await readFile(file));
  }catch(e){res.writeHead(500);res.end(String(e));}
});
await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
let browser;
const checks=[];
const check=(name,ok,detail='')=>{
  checks.push({name,ok});
  console.log(`${ok?'✔':'✘'} ${name}${detail?' — '+detail:''}`);
};
try{
  browser=await webkit.launch({headless:true});
  const smokePages=['index.html','quiet-power.html','toward-light.html','city.html','support.html','search.html','life-family.html','career.html','health.html','law.html','learning.html'];
  for(const width of [320,390,768]){
    const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    const page=await context.newPage();
    const jsErrors=[];
    const external=[];
    page.on('pageerror',e=>jsErrors.push(e.message));
    page.on('request',request=>{if(!request.url().startsWith(origin) && !request.url().startsWith('data:'))external.push(request.url());});
    const bad=[];
    for(const file of smokePages){
      const response=await page.goto(`${origin}${base}${file}`,{waitUntil:'load'});
      if(response?.status()!==200)bad.push(file+' status='+response?.status());
      const stats=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-window.innerWidth,main:!!document.querySelector('main#main'),brand:document.title.includes('由己 SELF-AUTHORED')}));
      if(stats.overflow>1||!stats.main||!stats.brand){
        const detail=stats.overflow>1 ? await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth+2&&r.width>3&&!['hidden','collapse'].includes(getComputedStyle(el).visibility);}).slice(0,8).map(el=>({tag:el.tagName,cls:el.className?.baseVal||el.className,text:(el.textContent||'').trim().slice(0,28),right:Math.round(el.getBoundingClientRect().right)}))) : [];
        bad.push(file+' '+JSON.stringify({stats,overflowElements:detail}));
      }
    }
    check(`WebKit ${width}px 11 個主要頁面正常、無水平溢位`,bad.length===0,bad.slice(0,4).join('; '));
    check(`WebKit ${width}px 無 JS 例外及第三方請求`,jsErrors.length===0 && external.length===0,[...jsErrors,...external].slice(0,4).join('; '));
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage();
  await page.goto(`${origin}${base}index.html`);
  await page.locator('.menu-toggle').click();
  check('WebKit 手機選單可打開',await page.locator('.menu-toggle').getAttribute('aria-expanded')==='true'&&await page.locator('#site-nav').evaluate(e=>e.classList.contains('is-open')));
  await page.goto(`${origin}${base}search.html`);
  await page.locator('[data-search-input]').first().fill('警政署');
  await page.locator('[data-search-form]').first().evaluate(e=>e.requestSubmit());
  check('WebKit 搜尋可找到機構', (await page.locator('[data-search-results]').first().innerText()).includes('警政署'));
  await page.goto(`${origin}${base}city.html`);
  await page.locator('#county').selectOption({index:1});
  const cityStatus=await page.locator('#finder-status').innerText();
  check('WebKit 縣市選擇可更新篩選說明',cityStatus.includes('在地 0 筆')&&cityStatus.includes('全國性 16 筆'),cityStatus);
  await page.goto(`${origin}${base}support.html`);
  const hotlineButtons=await page.locator('.hotline-grid a.call').count();
  const smsLinks=await page.locator('a[href*="serno=d08673f4"]').count();
  check('WebKit 支援頁具 4 支專線及 SMS 官方入口',hotlineButtons===4&&smsLinks>0,'專線按鈕 '+hotlineButtons+'；SMS 官方連結 '+smsLinks);
  await page.goto(`${origin}${base}index.html`);
  check('WebKit 緊急入口仍僅直接撥打 110',await page.locator('a[href="tel:110"]').count()>0 && (await page.locator('a[href="tel:110"]').first().getAttribute('href'))==='tel:110');
  check('WebKit 切換畫面保留 Google 入口',await page.locator('[data-switch-screen]').first().getAttribute('href')==='https://www.google.com/');
  await context.close();
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
const failed=checks.filter(x=>!x.ok);
console.log(`WebKit 模擬測試：${checks.length} 項，通過 ${checks.length-failed.length}，失敗 ${failed.length}`);
if(failed.length)process.exit(1);
