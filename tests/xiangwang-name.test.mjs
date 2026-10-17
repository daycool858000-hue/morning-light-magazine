#!/usr/bin/env node
// 品牌更名回歸驗收：僅檢查已建置的HTML與搜尋索引，不修改來源、核准檔或部署。
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile, readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site=JSON.parse(await readFile(path.join(root,'config/site.json'),'utf8'));
const dir=site.directories.find(d=>d.id==='toward-light');
assert.equal(dir.zh,'向望');
assert.equal(dir.en,'TOWARD OPEN SKIES');
assert.equal(dir.href,'toward-light.html');
assert.equal(site.directories.find(d=>d.id==='quiet-power')?.zh,'讀利專欄');
for(const out of ['dist','dist-qa','dist-production']){
  const read=async p=>readFile(path.join(root,out,p),'utf8');
  const home=await read('index.html');
  const col=await read('toward-light.html');
  const search=await read('assets/data/search-index.js');
  assert.ok(home.includes('向望') && home.includes('TOWARD OPEN SKIES'),out+'首頁未顯示新名稱');
  assert.ok(col.includes('向望') && col.includes('TOWARD OPEN SKIES'),out+'專欄頁未顯示新名稱');
  assert.ok(search.includes('向望') && search.includes('TOWARD OPEN SKIES'),out+'搜尋索引未更新');
  assert.ok(home.includes('href="toward-light.html"'),out+'原有入口URL改變');
  assert.ok(col.includes('href="learning.html"'),out+'既有學習與活動入口不見');
  assert.ok(!home.includes('>向光<') && !col.includes('>向光<'),out+'前台仍顯示舊專欄名稱');
  if(out==='dist-qa'){
    const qaArticles=(await readdir(path.join(root,out,'articles'))).filter(x=>x.endsWith('.html'));
    assert.equal(qaArticles.length,44,'原有44篇QA文章應完整保留');
    assert.equal((col.match(/class="toward-toggle"/g)||[]).length,8,'八個索引不能增刪');
    assert.equal((col.match(/class="toward-reading-card"/g)||[]).length,18,'原向望文章格18篇不能變動');
  }
  console.log('✔ '+out+'：向望／讀利雙語、導覽、搜尋、原URL'+(out==='dist-qa'?'、44篇文章、八索引與18篇專欄文章':'')+'驗收通過');
}
