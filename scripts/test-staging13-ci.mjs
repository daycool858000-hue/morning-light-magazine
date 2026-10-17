#!/usr/bin/env node
// 《由己》13篇未上架文章的隔離 QA 建置與內容完整性比對（不部署、不改正式授權）
// 此程式僅供獨立 GitHub Actions workflow 運行；變更佇列僅發生在暫時 checkout，finally 會還原。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qaFile=path.join(root,'docs/QA-EXPANSION-IMPORT-QUEUE.json');
const stageFile=path.join(root,'docs/STAGING13-QA-IMPORT-QUEUE-2026-10-17.json');
const original=await readFile(qaFile,'utf8');
const staged=await readFile(stageFile,'utf8');
const originalDoc=JSON.parse(original),stage=JSON.parse(staged);
const baseArticles=originalDoc.articles.filter(x=>x.importToQa===true);
const pending=originalDoc.articles.filter(x=>x.importToQa!==true && !x.qaWithdrawal);
assert.equal(baseArticles.length,8,'原44篇中擴充已上 QA 應為8篇');
assert.equal(pending.length,13,'未上 QA 且未撤稿文章必須13篇');
assert.deepEqual(stage.articles.filter(x=>x.importToQa).map(x=>x.id).sort(),
  [...baseArticles,...pending].map(x=>x.id).sort(),'13篇暫存不得漏篇或另加不相關文章');
assert.ok(stage.articles.every(x=>!x.qaWithdrawal||x.importToQa===false),'撤稿篇目不得重新匯入');
assert.equal(stage.approvalStatus,'not-approved','模擬內容永不是真正核准');
const baseline='dist-qa-staging13-baseline';
const candidate='dist-qa-staging13';
const build=out=>execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out='+out],{cwd:root,stdio:'inherit'});
const read=(out,rel)=>readFile(path.join(root,out,rel),'utf8');
const articleFiles=async out=>(await readdir(path.join(root,out,'articles'))).filter(x=>x.endsWith('.html')).sort();
const prose=html=>{const a=html.indexOf('<div class="prose">');const b=html.indexOf('<div class="sources"><h2>參考來源</h2>',a);assert.ok(a>=0&&b>a,'未找到文章正文／參考來源');return html.slice(a,b);};
try{
  await rm(path.join(root,baseline),{recursive:true,force:true});
  await rm(path.join(root,candidate),{recursive:true,force:true});
  // 第1次不變更任何來源：44篇的既有QA
  build(baseline);
  const existing=await articleFiles(baseline);
  assert.equal(existing.length,44,'公開QA基準必須44篇');
  // 第2次只在隔離檢查程序內替換 13篇候選的佇列。正式QA佇列會在 finally 還原。
  await writeFile(qaFile,staged,'utf8');
  build(candidate);
  const combined=await articleFiles(candidate);
  assert.equal(combined.length,57,'隔離模擬文章需剛好57篇');
  for(const filename of existing){
    assert.ok(combined.includes(filename),'原有QA文章遺失：'+filename);
    assert.equal(prose(await read(baseline,'articles/'+filename)),
                 prose(await read(candidate,'articles/'+filename)),
                 '原有44篇正文變更：'+filename);
  }
  const newSlugs=pending.map(x=>x.slug);
  const expected=new Set(newSlugs.map(s=>s+'.html'));
  assert.equal(expected.size,13);
  for(const filename of expected){
    assert.ok(combined.includes(filename),'候選文章缺頁：'+filename);
    const html=await read(candidate,'articles/'+filename);
    assert.ok(html.includes('未核准測試內容'),'候選頁必須有QA顯著標示：'+filename);
    assert.ok(html.includes('參考來源'),'候選頁沒有來源：'+filename);
    assert.ok(!html.includes('正式核准發布'),'候選頁不可冒充正式文章：'+filename);
  }
  const removed='exp-compare-everyday-experiments';
  assert.ok(!combined.includes(removed+'.html'),'exp-12 站主撤稿不得匯入');
  const search=await read(candidate,'assets/data/search-index.js');
  for(const slug of newSlugs)assert.ok(search.includes('articles/'+slug+'.html'),'文章未進全站搜尋：'+slug);
  assert.ok(!search.includes(removed+'.html'),'撤稿篇目不得出現在搜尋');
  const catalog=await read(candidate,'quiet-power.html');
  const toward=await read(candidate,'toward-light.html');
  for(const p of pending){
    const index=stage.articles.find(x=>x.id===p.id);
    assert.ok((index.directory==='readli'?catalog:toward).includes('articles/'+p.slug+'.html'),
      '編輯指定目錄未包含候選：'+p.id);
  }
  console.log('✔ 隔離 QA 檢驗完成：原有44篇正文保持逐字一致；另增加13篇至57篇（讀利+8、向光+5）、搜尋、來源、撤稿保護與測試標示。沒有發布 Pages。');
} finally{
  await writeFile(qaFile,original,'utf8');
  // 僅保留 57 篇隔離輸出供CI附件；不把44篇基準輸出存附件。
  await rm(path.join(root,baseline),{recursive:true,force:true});
}
