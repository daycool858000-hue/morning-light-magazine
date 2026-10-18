#!/usr/bin/env node
// 最後的正式上線硬閘：即使有人錯按「確認公開」，也不能用只有少量內容的舊版覆蓋現在的44篇網站。
// 僅在正式手動部署 workflow 呼叫；不修改資料、不發布、不替站主產生核准紀錄。
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// 正式部署不可更動檢驗目標；只有隔離的單元測試明確設定 LAUNCH_TEST_ONLY 才能檢查模擬資料夾。
const requested=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
assert.ok(!requested || (process.env.LAUNCH_TEST_ONLY==='1' && /^dist-launch-[a-z0-9-]+$/.test(requested)),
  '正式部署僅允許預設 dist-production；測試目錄需隔離並明確啟用');
const OUT=path.join(ROOT,requested||'dist-production');
const str=p=>readFile(path.join(ROOT,p),'utf8');
const json=async p=>JSON.parse(await str(p));
const out=p=>readFile(path.join(OUT,p),'utf8');

// 不可讓舊「向光」和已被站主確認不可公開使用的育兒津貼私人網址進入正式發布。
// 僅隔離的單元測試可使用 LAUNCH_TEST_ONLY=1 檢查歷史版功能；真正的正式部署不可跳過。
if (process.env.LAUNCH_TEST_ONLY !== '1') {
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
}

const articleFiles=(await readdir(path.join(OUT,'articles'))).filter(x=>x.endsWith('.html'));
// 2026-10-18 站主決定：44原有＋13待QA＋2校園安全＋3新生活文章完整首發（目標62篇）。
// 舊 CI 使用 LAUNCH_TEST_ONLY=1 的44篇模擬資料仍可測試快照簽核，但不得拿測試例外去正式部署。
const IS_FIXTURE = process.env.LAUNCH_TEST_ONLY === '1';
const MIN_LAUNCH_ARTICLES = IS_FIXTURE ? 44 : 62;
assert.ok(articleFiles.length >= MIN_LAUNCH_ARTICLES,
  '正式版至少須有'+MIN_LAUNCH_ARTICLES+'篇完整核准文章，否則禁止以縮水網站覆蓋已驗收QA');
const candidate=JSON.parse(await str('artifacts/launch-article-batch.json'));
assert.ok(candidate.articles.length >= MIN_LAUNCH_ARTICLES,
  '正式發布原稿候選清單尚未涵蓋站主確認的全部首發文章');
assert.equal(candidate.articles.length,articleFiles.length,
  '正式發布原稿與輸出文章數量不一致，禁止發布');
assert.ok(candidate.articles.every(x=>x.currentlyApprovedForProduction),'文章尚未全部具備對應版本紀錄，停止正式發布');
const catalog=await json('artifacts/launch-feature-batch.json');
for(const name of ['calendar','activities','pregnancy','topic54','resourceCatalog']){
  assert.equal(catalog.features[name]?.currentlyApprovedForProduction,true,'功能未具對應版本記錄：'+name);
}
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
assert.ok((readli.match(/<h3><a href="articles\//g)||[]).length >= 26,'正式版讀利不能少於原有26篇');
assert.ok((toward.match(/class="toward-reading-card"/g)||[]).length >= 18,'正式版向望不能少於原有18篇');
assert.equal((toward.match(/class="toward-toggle"/g)||[]).length,8,'向望必須有8個索引');
assert.ok((city.match(/class="res-card"/g)||[]).length >= 51,'原本16筆＋新增35筆官方機構必須完整');
assert.equal((events.match(/class="notice" id="notice-/g)||[]).length,6,'活動公告必須6筆');
assert.equal((events.match(/class="act-item" id="act-/g)||[]).length,12,'活動長期查詢入口必須12筆');
assert.equal((family.match(/class="preg-step"/g)||[]).length,4,'孕產閱讀必須4段');
assert.ok(index.includes('assets/js/qa-calendar.js')&&index.includes('class="act-entry"'),'不能遺失小日曆');
assert.ok(learning.includes('activities.html'),'學習與活動頁必須保留近期活動');
for(const filename of ['assets/js/qa-calendar.js','assets/js/qa-activities.js']){
  assert.ok((await stat(path.join(OUT,filename))).size>0,'缺少已確認功能：'+filename);
}
let guideCount=0;
for(const category of ['life-family','career','health','law','city','learning']){
  guideCount+=((await out(category+'.html')).match(/class="topic-links topic-guide-links"/g)||[]).length;
}
assert.ok(guideCount>=35,'54主題官方入口沒有正確整合');
assert.ok(robots.includes('Allow: /')&&!robots.includes('Disallow: /'),'正式版不應禁止搜尋');
assert.ok(!index.includes('noindex')&&!city.includes('noindex'),'正式版不應有測試站 noindex');
for(const record of candidate.articles){
  const url='articles/'+record.slug+'.html';
  assert.ok(sitemap.includes(url),'sitemap 遺漏 '+url);
  assert.ok(search.includes(url),'搜尋遺漏 '+url);
  const body=await out(url);
  assert.ok(!body.includes('未核准測試內容')&&!body.includes('noindex, nofollow'),'正式文章混入測試標示：'+url);
}
for(const p of [index,city,family,learning,readli,toward,events]){
  assert.ok(!p.includes('未核准測試內容'),'正式網站保留測試標示');
}
assert.ok(sitemap.includes('activities.html')&&!sitemap.includes('exp-compare-everyday-experiments'));
assert.ok(!search.includes('exp-compare-everyday-experiments'));
assert.ok(!articleFiles.includes('exp-compare-everyday-experiments.html'));
console.log('正式部署硬閘通過：原稿'+articleFiles.length+'篇（首發最低'+MIN_LAUNCH_ARTICLES+'）、讀利≥26／向望≥18、官方資源≥51、小日曆、原已驗收公告與長期入口、孕期4、54主題、sitemap。此訊息不等於站主已批准正式部署。');
