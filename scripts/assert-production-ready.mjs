#!/usr/bin/env node
// 最後的正式上線硬閘：即使有人錯按「確認公開」，也不能用縮水或未逐項簽核的版本覆蓋已驗收的 62 篇首發範圍。
// 僅在正式手動部署 workflow 呼叫；不修改資料、不發布、不替站主產生核准紀錄。
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LAUNCH_EXPANSION_QUEUE, LAUNCH_SCOPE, LAUNCH_FEATURES, launchQueueFile} from './lib/launch-approval.mjs';
import {loadQaNotices} from './lib/qa-activities.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// 正式部署不可更動檢驗目標；只有隔離的單元測試明確設定 LAUNCH_TEST_ONLY 才能檢查模擬資料夾與模擬佇列。
const IS_FIXTURE = process.env.LAUNCH_TEST_ONLY === '1';
const requested=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
assert.ok(!requested || (IS_FIXTURE && /^dist-launch-[a-z0-9-]+$/.test(requested)),
  '正式部署僅允許預設 dist-production；測試目錄需隔離並明確啟用');
const OUT=path.join(ROOT,requested||'dist-production');
const str=p=>readFile(path.join(ROOT,p),'utf8');
const json=async p=>JSON.parse(await str(p));
const out=p=>readFile(path.join(OUT,p),'utf8');
const count=(html,re)=>(html.match(re)||[]).length;

// 不可讓舊「向光」和已被站主確認不可公開使用的育兒津貼私人網址進入正式發布。
const brand=await json('config/site.json');
const column=brand.directories?.find(d=>d.id==='toward-light');
assert.equal(column?.zh,'向望','正式版本仍保留舊名稱「向光」：先整合已驗收的向望 QA，不可部署');
assert.equal(column?.en,'TOWARD OPEN SKIES','正式版向望英文名稱與已驗收版本不一致');
const topicGuides=await json('docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json');
const childcare=topicGuides.topics?.find(t=>t.id==='childcare');
assert.ok(childcare && childcare.displayMode==='keep' &&
  childcare.links?.every(l=>l.url!=='https://twbaby.sfaa.gov.tw/home/index') &&
  childcare.links?.some(l=>l.url==='https://www.sfaa.gov.tw/'),
  '育兒津貼仍指向站主確認無法公開使用的私人申辦網址：先採用原社家署官方入口後才可部署');

// 2026-10-18 站主決定：44原有＋13待QA＋2校園安全＋3新生活文章完整首發（62篇），以手機驗收通過的 62 篇預覽為基準。
const candidate=await json('artifacts/launch-article-batch.json');
const features=await json('artifacts/launch-feature-batch.json');
const queueFile=launchQueueFile();
assert.ok(IS_FIXTURE || queueFile===LAUNCH_EXPANSION_QUEUE,'正式部署必須讀 62 篇首發佇列');
assert.equal(candidate.queueFile,queueFile,'文章指紋清單不是由正式首發佇列產生');
assert.equal(features.queueFile,queueFile,'功能指紋清單不是由正式首發佇列產生');
assert.equal(candidate.articles.length,LAUNCH_SCOPE.articles,'正式發布原稿候選清單未涵蓋站主確認的全部首發文章');
assert.equal(candidate.sourcePendingCount,0,'仍有來源待複核的文章，禁止正式發布');
assert.ok(candidate.articles.every(x=>x.currentlyApprovedForProduction),'文章尚未全部具備對應版本紀錄，停止正式發布');
for(const name of LAUNCH_FEATURES){
  assert.equal(features.features[name]?.currentlyApprovedForProduction,true,'功能未具對應版本記錄：'+name);
}
const articleFiles=(await readdir(path.join(OUT,'articles'))).filter(x=>x.endsWith('.html'));
assert.equal(articleFiles.length,LAUNCH_SCOPE.articles,'正式版文章數須等於首發62篇，否則禁止以縮水網站覆蓋已驗收QA');

const index=await out('index.html');
const city=await out('city.html');
const family=await out('life-family.html');
const learning=await out('learning.html');
const readli=await out('quiet-power.html');
const toward=await out('toward-light.html');
const events=await out('activities.html');
const sitemap=await out('sitemap.xml');
const robots=await out('robots.txt');
const search=await out('assets/data/search-index.js');
assert.equal(count(readli,/<h3><a href="articles\//g),LAUNCH_SCOPE.readli,'正式版讀利篇數與62篇預覽不同');
assert.equal(count(toward,/class="toward-reading-card"/g),LAUNCH_SCOPE.toward,'正式版向望篇數與62篇預覽不同');
assert.equal(count(toward,/class="toward-toggle"/g),8,'向望必須有8個索引');
// 原有已核准入口16＋新增35筆官方資源＋六縣市15筆服務入口
assert.ok(count(city,/class="res-card"/g)>=16+35+LAUNCH_SCOPE.cityServices,'官方機構或城市服務入口不完整');
const queue=await json(queueFile);
for(const r of queue.resources.filter(x=>x.importToQa)){
  assert.ok(city.includes('id="res-qa-x-'+r.id.toLowerCase()+'"'),'城市服務入口缺少 '+r.id);
}
// 活動公告依臺灣日期在建置時剔除已結束場次：用同一個載入器計算「今天仍應顯示」的數量。
const activeNotices=(await loadQaNotices(ROOT)).items;
assert.equal(count(events,/class="notice" id="notice-/g),activeNotices.length,'活動公告與尚未結束的已核准公告數不同');
for(const n of activeNotices) assert.ok(events.includes('id="'+n.id+'"'),'活動公告缺少 '+n.id);
assert.equal(count(events,/class="act-item" id="act-/g),LAUNCH_SCOPE.portals,'長期查詢入口必須'+LAUNCH_SCOPE.portals+'筆');
assert.equal(count(family,/class="preg-step"/g),4,'孕產閱讀必須4段');
assert.ok(index.includes('assets/js/qa-calendar.js')&&index.includes('class="act-entry"'),'不能遺失小日曆');
assert.ok(learning.includes('activities.html'),'學習與活動頁必須保留近期活動');
for(const filename of ['assets/js/qa-calendar.js','assets/js/qa-activities.js']){
  assert.ok((await stat(path.join(OUT,filename))).size>0,'缺少已確認功能：'+filename);
}
let guideCount=0, topicCount=0;
for(const category of ['life-family','career','health','law','city','learning']){
  const html=await out(category+'.html');
  guideCount+=count(html,/class="topic-links topic-guide-links"/g);
  topicCount+=count(html,/<li class="topic" id=/g);
}
assert.equal(topicCount,LAUNCH_SCOPE.topics,'六大分類必須保留54個主題');
assert.ok(guideCount>=42,'54主題官方入口沒有正確整合（62篇預覽為42組補充／修正連結）');
assert.ok(robots.includes('Allow: /')&&!robots.includes('Disallow: /'),'正式版不應禁止搜尋');
assert.ok(!index.includes('noindex')&&!city.includes('noindex'),'正式版不應有測試站 noindex');
for(const record of candidate.articles){
  const url='articles/'+record.slug+'.html';
  assert.ok(sitemap.includes(url),'sitemap 遺漏 '+url);
  assert.ok(search.includes(url),'搜尋遺漏 '+url);
  const body=await out(url);
  assert.ok(!body.includes('未核准測試內容')&&!body.includes('noindex, nofollow'),'正式文章混入測試標示：'+url);
  assert.ok(!body.includes('來源與資料尚待複核'),'正式文章仍是待複核草稿：'+url);
}
for(const p of [index,city,family,learning,readli,toward,events]){
  assert.ok(!p.includes('未核准測試內容'),'正式網站保留測試標示');
}
assert.ok(sitemap.includes('activities.html')&&!sitemap.includes('exp-compare-everyday-experiments'));
assert.ok(!search.includes('exp-compare-everyday-experiments'));
assert.ok(!articleFiles.includes('exp-compare-everyday-experiments.html'));
console.log(`正式部署硬閘通過：原稿${articleFiles.length}篇、讀利${LAUNCH_SCOPE.readli}／向望${LAUNCH_SCOPE.toward}、官方資源與六縣市服務入口、小日曆、公告${activeNotices.length}＋長期入口${LAUNCH_SCOPE.portals}、孕期4、54主題、sitemap。此訊息不等於站主已批准正式部署。`);
