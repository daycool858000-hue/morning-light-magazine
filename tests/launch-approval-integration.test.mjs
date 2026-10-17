// 只在隔離的 GitHub Actions checkout/本機工作目錄模擬一篇文章獲批。
// 測完必定還原 content/launch-approvals.json。此測試不代表站主真的已核准，也不部署網站。
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotHash } from '../scripts/lib/launch-approval.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'content/launch-approvals.json');
const out = path.join(root, 'dist-launch-fixture');
const badOut = path.join(root, 'dist-launch-bad-snapshot');
const cityOut = path.join(root, 'dist-launch-city-fixture');
const fullOut = path.join(root, 'dist-launch-44-fixture');
const fullFeaturesOut = path.join(root, 'dist-launch-feature-fixture');
const qaParityOut = path.join(root, 'dist-qa-release-parity-fixture');
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
  const cityNoApproval = await readFile(path.join(out, 'city.html'),'utf8');
  assert.ok(!cityNoApproval.includes('id="benefits"'), '未核准的六篇城市福利卡片不可自行顯示在正式城市頁');
  assert.ok(!cityNoApproval.includes('articles/batch6-welfare-overview.html'), '城市頁不能偷帶未核准福利文章連結');

  // 額外在隔離資料內虛擬核准一篇城市福利，確保只出現已核准的一張卡，不會把其他五張一起輸出。
  const cityArticle = releaseCandidate.articles.find(x => x.slug === 'batch6-welfare-overview');
  assert.ok(cityArticle?.sha256);
  template.approvedArticles[cityArticle.slug] = sign(cityArticle.sha256);
  await writeFile(file, JSON.stringify(template,null,2)+'\n');
  build(cityOut);
  assert.equal((await readdir(path.join(cityOut,'articles'))).filter(x=>x.endsWith('.html')).length,2);
  const cityOneApproved = await readFile(path.join(cityOut,'city.html'),'utf8');
  assert.ok(cityOneApproved.includes('articles/batch6-welfare-overview.html'));
  assert.ok(!cityOneApproved.includes('articles/batch6-long-term-care-services.html'));
  assert.ok(!cityOneApproved.includes('articles/batch6-income-support-emergency-aid.html'));
  delete template.approvedArticles[cityArticle.slug];

  // 全44篇已簽核時，真正的 production 必須沿用 QA 已驗收的讀利26／向光18版面，不把44篇全部塞在讀利。
  template.approvedArticles = Object.fromEntries(releaseCandidate.articles.map(a => [a.slug, sign(a.sha256)]));
  await writeFile(file,JSON.stringify(template,null,2)+'\n');
  build(fullOut);
  // 原稿完全同一份：驗證 QA 44 篇的正文、引用來源與正式版逐字一致，避免轉版時遺失段落。
  execFileSync(process.execPath, ['scripts/build.mjs','--mode=qa','--out='+path.basename(qaParityOut)], {
    cwd:root,stdio:'pipe',
  });
  const articleContent=(html)=>{
    const start=html.indexOf('<div class="section section-tight"><div class="wrap"><div class="prose">');
    assert.ok(start>=0,'文章正文容器不存在');
    const end=html.indexOf('</div></div></div>\n</article>',start);
    assert.ok(end>start,'文章正文結尾不存在');
    return html.slice(start,end);
  };
  for(const a of releaseCandidate.articles) {
    const fileName='articles/'+a.slug+'.html';
    const qa=await readFile(path.join(qaParityOut,fileName),'utf8');
    const prod=await readFile(path.join(fullOut,fileName),'utf8');
    assert.equal(articleContent(prod),articleContent(qa),'同一原稿正式版正文／引用遭到改寫：'+a.slug);
  }
  const files44 = (await readdir(path.join(fullOut,'articles'))).filter(x=>x.endsWith('.html'));
  assert.equal(files44.length,44, '全44篇都有相符指紋，應全數輸出');
  const readli44 = await readFile(path.join(fullOut,'quiet-power.html'),'utf8');
  const toward44 = await readFile(path.join(fullOut,'toward-light.html'),'utf8');
  const sitemap44 = await readFile(path.join(fullOut,'sitemap.xml'),'utf8');
  assert.equal((readli44.match(/<h3><a href="articles\//g)||[]).length,26,'正式版讀利需保留26篇');
  assert.equal((toward44.match(/class="toward-reading-card"/g)||[]).length,18,'正式版向光需保留18篇');
  assert.equal((toward44.match(/class="toward-toggle"/g)||[]).length,8,'正式版向光需保留八個分類入口');
  assert.ok(!toward44.includes('undefined'),'向光不能因未核准的新官方連結而顯示錯誤');
  assert.ok(!readli44.includes('未核准測試內容')&&!toward44.includes('未核准測試內容'));
  for(const a of releaseCandidate.articles) assert.ok(sitemap44.includes('articles/'+a.slug+'.html'),'sitemap 缺少 '+a.slug);
  assert.ok(!sitemap44.includes('exp-compare-everyday-experiments'),'撤稿不可出現在正式 sitemap');
  assert.ok(!existsSync(path.join(fullOut,'activities.html')),'未核准活動不得偷跑到正式版');
  // 模擬站主針對相同既有功能原稿「整批同意發布」。
  // 此記錄只存在隔離 Actions checkout，最終一律還原，不會產生真實站主簽核。
  const json = async f => JSON.parse(await readFile(path.join(root,f),'utf8'));
  const inputs = {
    activities: {
      portals: await json('docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json'),
      notices: await json('docs/QA-ACTIVITIES-NOTICES-2026Q4-2027-2026-10-16.json'),
      script: await readFile(path.join(root,'src/qa-assets/js/qa-activities.js'),'utf8'),
    },
    calendar: {script: await readFile(path.join(root,'src/qa-assets/js/qa-calendar.js'),'utf8')},
    pregnancy: await json('docs/QA-LIFE-FAMILY-PREGNANCY-GUIDE-2026-10-17.json'),
    topic54: await json('docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json'),
    resourceCatalog: {
      county: await json('docs/BATCH2-23-RESOURCE-CANDIDATES-2026-10-15.json'),
      open: await json('docs/BATCH3-OPEN-ACCESS-CONTENT-2026-10-15.json'),
      english: await json('docs/QA-ENGLISH-RESOURCE-DISCOVERY-2026-10-16.json'),
    },
  };
  template.approvedFeatures = Object.fromEntries(Object.entries(inputs).map(([name, value]) => [name,sign(snapshotHash(value))]));
  await writeFile(file,JSON.stringify(template,null,2)+'\n');
  build(fullFeaturesOut);
  const activitiesHtml=await readFile(path.join(fullFeaturesOut,'activities.html'),'utf8');
  const homepage=await readFile(path.join(fullFeaturesOut,'index.html'),'utf8');
  const family=await readFile(path.join(fullFeaturesOut,'life-family.html'),'utf8');
  const learning=await readFile(path.join(fullFeaturesOut,'learning.html'),'utf8');
  const cityResources=await readFile(path.join(fullFeaturesOut,'city.html'),'utf8');
  const towardResources=await readFile(path.join(fullFeaturesOut,'toward-light.html'),'utf8');
  assert.equal((cityResources.match(/class="res-card"/g)||[]).length,51,'正式版需有原有16個核准資源和批次35個官方候選入口');
  for(const id of ['qa-en-nia','qa-en-ifi','qa-en-1990']) assert.ok(cityResources.includes('id="res-'+id+'"'),'多語官方資源缺少 '+id);
  assert.ok(towardResources.includes('href="https://cloud.culture.tw/"'),'向光原本的文化部官方延伸入口需要保留');
  assert.ok(learning.includes('id="res-open-culture-events"'),'課程與活動的同網址既有卡片應重用');
  assert.ok(!cityResources.includes('未核准測試內容'),'正式資源卡不得留測試標示');
  const allSitemap=await readFile(path.join(fullFeaturesOut,'sitemap.xml'),'utf8');
  assert.equal((activitiesHtml.match(/class="notice" id="notice-/g)||[]).length,6,'公告仍保留六筆');
  assert.equal((activitiesHtml.match(/class="act-item" id="act-/g)||[]).length,12,'長期查詢入口仍保留十二筆');
  assert.ok(activitiesHtml.includes('已依網站擁有人確認的版本公開'));
  assert.ok(!activitiesHtml.includes('未核准測試內容'),'正式活動頁不得留測試標示');
  assert.ok(homepage.includes('assets/js/qa-calendar.js') && homepage.includes('class="act-entry"'),'正式首頁應保留小日曆');
  assert.ok(existsSync(path.join(fullFeaturesOut,'assets/js/qa-calendar.js')),'正式版必須有小日曆腳本');
  assert.ok(existsSync(path.join(fullFeaturesOut,'assets/js/qa-activities.js')),'正式版必須有活動到期隱藏腳本');
  assert.equal((family.match(/class="preg-step"/g)||[]).length,4,'孕期閱讀區應為四段');
  assert.ok(family.includes('孕期與生育資訊整理')||family.includes('懷孕期間的產檢與健康照護'),'孕期閱讀區標題需存在');
  assert.ok(!family.includes('未核准測試內容'),'正式孕期區不得留測試標示');
  assert.ok(learning.includes('activities.html'),'學習與活動頁應連到正式活動頁');
  const topicPages=['life-family','career','health','law','city','learning'];
  let officialGuides=0;
  for(const pageName of topicPages) {
    const pageHtml=await readFile(path.join(fullFeaturesOut,pageName+'.html'),'utf8');
    officialGuides+=(pageHtml.match(/class="topic-links topic-guide-links"/g)||[]).length;
  }
  assert.ok(officialGuides>=35,'六類54主題的補充/修正入口沒有完整保留');
  assert.ok(allSitemap.includes('activities.html'),'正式 sitemap 應包含活動頁');
  assert.ok(!existsSync(path.join(fullOut,'activities.html')),'只有文章批准、不含功能批准時，正式版仍不得顯示活動頁');
  assert.ok(!existsSync(path.join(fullOut,'assets/js/qa-calendar.js')),'只有文章批准不能順便發布日曆');

  // 最後部署的保險絲也要真的測試：精確版本全部存在會放行；缺一組功能則會阻擋。
  const refreshFingerprints=()=>{
    for(const script of ['scripts/prepare-launch-article-batch.mjs','scripts/prepare-launch-feature-batch.mjs'])
      execFileSync(process.execPath,[script],{cwd:root,stdio:'pipe'});
  };
  const checkReadiness=()=>{
    return execFileSync(process.execPath,
      ['scripts/assert-production-ready.mjs','--out='+path.basename(fullFeaturesOut)],
      {cwd:root,env:{...process.env,LAUNCH_TEST_ONLY:'1'},stdio:'pipe'}).toString('utf8');
  };
  refreshFingerprints();
  assert.ok(checkReadiness().includes('正式部署硬閘通過'),'備妥44篇及全部功能時應准許正式發布');
  delete template.approvedFeatures.calendar;
  await writeFile(file,JSON.stringify(template,null,2)+'\\n');
  refreshFingerprints();
  assert.throws(checkReadiness,/./,'少一項功能批准就應停止正式部署');
  template.approvedFeatures.calendar=sign(snapshotHash(inputs.calendar));
  await writeFile(file,JSON.stringify(template,null,2)+'\\n');

  template.approvedFeatures = {};
  template.approvedArticles = {'batch2-01':sign(chosen.sha256)};

  // 故意把 sha256 改錯，證明舊批准不會套用在修改後的文章。
  template.approvedArticles['batch2-01'] = sign(chosen.sha256.slice(0,-1)+(chosen.sha256.endsWith('0')?'1':'0'));
  await writeFile(file, JSON.stringify(template,null,2)+'\n');
  build(badOut);
  assert.ok(!existsSync(path.join(badOut,'articles/batch2-01.html')), '內容指紋不符的文章不得輸出');
  const badIndex = await readFile(path.join(badOut,'assets/data/search-index.js'),'utf8');
  assert.ok(!badIndex.includes('articles/batch2-01.html'), '不符內容不可在搜尋中出現');
  console.log('正式版模擬完成：44篇正文與QA逐字一致、讀利26／向光18、小日曆、六筆活動、十二筆長期入口、35筆新增官方資源及多語連結、孕期四段、54主題與搜尋／sitemap 均已逐項驗證。');
} finally {
  // 不論成功或失敗都先還原原核准檔；測試產物不部署，不寫回 git。
  await writeFile(file,prior);
  // 避免把隔離測試的虛擬簽核清單留下成真正的 GitHub Actions 附件。
  for(const script of ['scripts/prepare-launch-article-batch.mjs','scripts/prepare-launch-feature-batch.mjs'])
    execFileSync(process.execPath,[script],{cwd:root,stdio:'pipe'});
  await Promise.all([rm(out,{recursive:true,force:true}),rm(badOut,{recursive:true,force:true}),rm(cityOut,{recursive:true,force:true}),rm(fullOut,{recursive:true,force:true}),rm(fullFeaturesOut,{recursive:true,force:true}),rm(qaParityOut,{recursive:true,force:true})]);
}
