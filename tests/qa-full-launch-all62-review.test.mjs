#!/usr/bin/env node
// 62篇完整首發的排版閱讀 QA：13篇保留 pending 來源狀態，原有44+5共49正常，未發布。
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const folder='dist-qa-all62-review';
const manifest='docs/QA-FULL-LAUNCH-ALL-62-REVIEW-2026-10-18.json';
const q=JSON.parse(await readFile(manifest,'utf8'));
assert.equal(q.stagingOnly,true);
assert.equal(q.reviewPendingDrafts,true);
const pending=q.articles.filter(x=>x.importToQa&&x.sourceCheck==='pending');
assert.equal(pending.length,13);
const active=q.articles.filter(x=>x.importToQa);
assert.equal(active.length,26,'8已上QA+5已準備+13待複核候選');
assert.ok(q.articles.some(x=>x.id==='exp-12'&&!x.importToQa&&x.qaWithdrawal?.doNotReimport===true));
const env={...process.env,QA_EXPANSION_QUEUE:manifest,QA_TOPIC_GUIDES_STAGING:'1',QA_PENDING_REVIEW_MODE:'1'};
execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out='+folder],{env,stdio:'inherit'});
const file=async name=>readFile(folder+'/'+name,'utf8');
const list=(await readdir(folder+'/articles')).filter(x=>x.endsWith('.html'));
assert.equal(list.length,62,'原44+候選13+校園2+市集1+健康2共62');
const readli=await file('quiet-power.html'),toward=await file('toward-light.html');
for(const x of pending){
 const h=await file('articles/'+x.slug+'.html');
 assert.ok(h.includes(x.title),x.id+' title');
 assert.ok(h.includes('編輯草稿：來源與資料尚待複核'),x.id+' pending clear label');
 assert.ok(h.includes('未核准測試內容')&&h.includes('noindex'),x.id+' SEO');
 assert.ok((await file(x.category+'.html')).includes('articles/'+x.slug+'.html'),x.id+' category');
 assert.ok((x.directory==='readli'?readli:toward).includes('articles/'+x.slug+'.html'),x.id+' reading directory');
}
assert.ok((await file('city.html')).includes('社會福利'),'city preserved');
assert.ok((await file('activities.html')).includes('notice-popupasia-2026'),'events preserved');
for(const slug of ['exp-campus-bullying-system-guide','exp-menstrual-changes-observation-guide','exp-creative-market-exhibitions-guide']){
 assert.ok((await file('assets/data/search-index.js')).includes(slug),'staged search index '+slug);
}
const base=await readFile('dist-qa/quiet-power.html','utf8');
for(const x of pending)assert.ok(!base.includes(x.slug),'pending must be absent from publicQA build');
console.log('✔ 62篇隔離閱讀版已輸出，13篇清楚標「編輯草稿／來源待複核」，54主題/活動/公開QA隔離維持');
