// 只在隔離的 GitHub Actions checkout/本機工作目錄模擬一篇文章獲批。
// 測完必定還原 content/launch-approvals.json。此測試不代表站主真的已核准，也不部署網站。
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'content/launch-approvals.json');
const out = path.join(root, 'dist-launch-fixture');
const badOut = path.join(root, 'dist-launch-bad-snapshot');
const prior = await readFile(file, 'utf8');
const template = JSON.parse(prior);
const releaseCandidate = JSON.parse(await readFile(path.join(root, 'artifacts/launch-article-batch.json'), 'utf8'));
const chosen = releaseCandidate.articles.find(x => x.slug === 'batch2-01');
assert.ok(chosen?.sha256, '找不到第一篇文章的正式候選版本指紋');
assert.equal(releaseCandidate.articles.length, 44);
assert.deepEqual(template.approvedArticles, {}, '這份工程測試必須先從零核准狀態開始');

const sign = sha256 => ({
  decision: 'site-owner-approved-for-publication',
  approvedBy: 'site-owner',
  approvedOn: '2026-10-17',
  sourceReview: 'AI-source-checked-not-manual-owner-audit',
  sha256,
});

function build(output) {
  execFileSync(process.execPath, ['scripts/build.mjs', '--mode=production', '--out=' + path.basename(output)], {
    cwd: root, stdio: 'pipe',
  });
}

try {
  // 用單篇原稿的 sha256 建立測試簽核：只檢查程式會怎麼輸出，不是實際簽核。
  template.approvedArticles['batch2-01'] = sign(chosen.sha256);
  await writeFile(file, JSON.stringify(template,null,2)+'\n');
  build(out);
  assert.ok(existsSync(path.join(out, 'articles/batch2-01.html')), '有測試簽核的第一篇應能放進正式版');
  assert.ok(!existsSync(path.join(out, 'articles/batch2-02.html')), '沒有簽核的第二篇不可被帶進正式版');
  assert.equal((await readdir(path.join(out, 'articles'))).filter(x=>x.endsWith('.html')).length,1);
  const html = await readFile(path.join(out,'articles/batch2-01.html'),'utf8');
  const index = await readFile(path.join(out,'assets/data/search-index.js'),'utf8');
  assert.ok(html.includes('網站擁有人已同意公開此原稿版本'), '文章需有與審核來源相符的說明');
  assert.ok(!html.includes('未核准測試內容'), '不能把經明確測試簽核的版本仍顯示未核准');
  assert.ok(!html.includes('noindex, nofollow'), 'production 頁面需符合正式索引設定');
  assert.ok(index.includes('articles/batch2-01.html') && !index.includes('articles/batch2-02.html'), '搜尋只能找到已簽核的版本');
  assert.ok(!existsSync(path.join(out,'assets/js/qa-calendar.js')), '不可以順便把未核准日曆資產帶進正式版');

  // 故意把 sha256 改錯，證明舊批准不會套用在修改後的文章。
  template.approvedArticles['batch2-01'] = sign(chosen.sha256.slice(0,-1)+(chosen.sha256.endsWith('0')?'1':'0'));
  await writeFile(file, JSON.stringify(template,null,2)+'\n');
  build(badOut);
  assert.ok(!existsSync(path.join(badOut,'articles/batch2-01.html')), '內容指紋不符的文章不得輸出');
  const badIndex = await readFile(path.join(badOut,'assets/data/search-index.js'),'utf8');
  assert.ok(!badIndex.includes('articles/batch2-01.html'), '不符內容不可在搜尋中出現');
  console.log('正式版模擬完成：只輸出 1 篇假想已核准文章；其餘 43 篇隔離、日曆隔離、修改後舊核准失效。');
} finally {
  // 不論成功或失敗都先還原原核准檔；測試產物不部署，不寫回 git。
  await writeFile(file,prior);
  await Promise.all([rm(out,{recursive:true,force:true}),rm(badOut,{recursive:true,force:true})]);
}
