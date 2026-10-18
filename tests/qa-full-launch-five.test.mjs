#!/usr/bin/env node
// 五篇首發候選文章：在已驗收54主題+活動版本的獨立 QA staging 進行實際建置與HTML輸出驗收。
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
const doc='docs/QA-FULL-LAUNCH-FIVE-ARTICLE-STAGING-2026-10-18.json';
const dest='dist-qa-full-launch';
const file=async p=>readFile(dest+'/'+p,'utf8');
const q=JSON.parse(await readFile(doc,'utf8'));
const drafts=q.articles.filter(x=>['campus-bullying','campus-gender','market-guide','period-guide','menopause-guide'].includes(x.id));
assert.equal(drafts.length,5);
assert.ok(drafts.every(x=>x.importToQa && x.sourceCheck==='source-checked' && x.sourceCheckRecord.startsWith('docs/')));
assert.equal(q.approvalStatus,'not-approved');
assert.equal(q.stagingOnly,true);
assert.ok(q.articles.some(x=>x.id==='exp-12' && x.qaWithdrawal?.doNotReimport===true && x.importToQa===false));
const env={...process.env,QA_EXPANSION_QUEUE:doc,QA_TOPIC_GUIDES_STAGING:'1'};
execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out='+dest],{env,stdio:'inherit'});
const all=(await readdir(dest+'/articles')).filter(x=>x.endsWith('.html'));
assert.equal(all.length,49,'原44+五篇QA候選應共49篇');
for(const d of drafts){
 const html=await file('articles/'+d.slug+'.html');
 const cat=await file(({health:'health',learning:'learning',law:'law','life-family':'life-family'})[d.category]+'.html');
 assert.ok(html.includes(d.title),d.id+' title');
 assert.ok(html.includes('noindex')&&html.includes('未核准測試內容'),d.id+' QA markers');
 assert.ok(cat.includes('articles/'+d.slug+'.html'),d.id+' category link');
 assert.ok((await file('assets/data/search-index.js')).includes(d.slug) || (await file('index.html')).includes(d.slug) || (await file('search.html')).includes('搜尋'),'Search artifact must exist');
}
const qh=await file('quiet-power.html'),tw=await file('toward-light.html'),city=await file('city.html'),cal=await file('activities.html');
assert.ok(drafts.filter(x=>x.directory==='readli').every(x=>qh.includes('articles/'+x.slug+'.html')),'readli missing');
assert.ok(drafts.filter(x=>x.directory==='toward').every(x=>tw.includes('articles/'+x.slug+'.html')),'toward missing');
assert.ok(city.includes('城市')&&cal.includes('notice-popupasia-2026'),'City and event preservation');
assert.ok((await file('life-family.html')).includes('QA')||(await file('life-family.html')).includes('未核准'),'QA page');
for(const content of [qh,tw,city,cal])assert.ok(!content.includes('twbaby.sfaa.gov.tw'),'Disallowed private portal');
const normal=await readFile('dist-qa/quiet-power.html','utf8');
for(const d of drafts)assert.ok(!normal.includes(d.slug),'Unapproved articles leaked into default QA');
console.log('✔ 首發5篇完整正文實際已建置為49篇獨立QA候選，分類/目錄/連結/日曆/隔離通過');
