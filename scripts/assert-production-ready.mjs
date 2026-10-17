#!/usr/bin/env node
// 最後的正式上線硬閘：即使有人錯按「確認公開」，也不能用只有少量內容的舊版覆蓋現在的44篇網站。
// 僅在正式手動部署 workflow 呼叫；不修改資料、不發布、不替站主產生核准紀錄。
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {approvedLaunchFeature} from './lib/launch-approval.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'dist-production');
const str=p=>readFile(path.join(ROOT,p),'utf8');
const json=async p=>JSON.parse(await str(p));
const out=p=>readFile(path.join(OUT,p),'utf8');
const a=await json('content/launch-approvals.json');
const articleFiles=(await readdir(path.join(OUT,'articles'))).filter(x=>x.endsWith('.html'));
assert.equal(articleFiles.length,44,'正式版文章不足44篇：停止發布，不允許覆蓋目前網站');
const candidate=JSON.parse(await str('artifacts/launch-article-batch.json'));
assert.equal(candidate.articles.length,44);
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
assert.equal((readli.match(/<h3><a href="articles\//g)||[]).length,26,'讀利必須26篇');
assert.equal((toward.match(/class="toward-reading-card"/g)||[]).length,18,'向光必須18篇');
assert.equal((toward.match(/class="toward-toggle"/g)||[]).length,8,'向光必須有8個索引');
assert.equal((city.match(/class="res-card"/g)||[]).length,51,'原本16筆＋新增35筆官方機構必須完整');
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
console.log('正式部署硬閘通過：原稿44、讀利26／向光18、官方資源51、小日曆、公告6、活動查詢12、孕期4、54主題、Google sitemap。可以由站主執行最後的正式部署步驟。');
