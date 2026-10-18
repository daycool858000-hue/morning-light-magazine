import assert from 'node:assert/strict';
import {snapshotHash, approvedLaunchArticle, approvedLaunchFeature, launchQueueFile, LAUNCH_EXPANSION_QUEUE} from '../scripts/lib/launch-approval.mjs';
import {readFile} from 'node:fs/promises';

const approvals = JSON.parse(await readFile(new URL('../content/launch-approvals.json', import.meta.url),'utf8'));
assert.deepEqual(approvals.approvedArticles,{});
assert.deepEqual(approvals.approvedFeatures,{});
const a = {slug:'example',qa:true,status:'待確認',visibility:'public',body:'原始文章',sourcesList:[{url:'https://www.gov.tw/'}]};
assert.equal(approvedLaunchArticle(a,approvals),false);
const record = {decision:'site-owner-approved-for-publication',approvedBy:'site-owner',approvedOn:'2026-10-17',sourceReview:'AI-source-checked-not-manual-owner-audit',sha256:snapshotHash(a)};
assert.equal(approvedLaunchArticle(a,{approvedArticles:{example:record}}),true);
assert.equal(approvedLaunchArticle({...a,body:'資料被修改'},{approvedArticles:{example:record}}),false);
assert.equal(approvedLaunchArticle(a,{approvedArticles:{example:{...record,approvedBy:'AI'}}}),false);
assert.equal(approvedLaunchArticle(a,{approvedArticles:{example:{...record,decision:'qa-tests-passed'}}}),false);
assert.equal(approvedLaunchArticle({...a,status:'已撤下'},{approvedArticles:{example:record}}),false);
assert.equal(approvedLaunchArticle({...a,visibility:'withdrawn'},{approvedArticles:{example:record}}),false);
for(const slug of ['exp-compare-everyday-experiments','exp-reading-popular-science']){
 const withdrawn = {...a,slug};
 assert.equal(approvedLaunchArticle(withdrawn,{approvedArticles:{[slug]:{...record,sha256:snapshotHash(withdrawn)}}}),false);
}
// 62 篇中來源待複核的擴充草稿：即使指紋完全相符也不放行；查核完成（editorialReviewPending:false）才可簽。
const pending = {...a,slug:'exp-pending',expansion:true,editorialReviewPending:true};
assert.equal(approvedLaunchArticle(pending,{approvedArticles:{'exp-pending':{...record,sha256:snapshotHash(pending)}}}),false);
const checked = {...pending,editorialReviewPending:false};
assert.equal(approvedLaunchArticle(checked,{approvedArticles:{'exp-pending':{...record,sha256:snapshotHash(checked)}}}),true);
const activities = {events:[{title:'正式活動',url:'https://www.gov.tw/'}]};
assert.equal(approvedLaunchFeature('activities',activities,approvals),false);
assert.equal(approvedLaunchFeature('activities',activities,{approvedFeatures:{activities:{...record,sha256:snapshotHash(activities)}}}),true);
assert.equal(approvedLaunchFeature('activities',{events:[]},{approvedFeatures:{activities:{...record,sha256:snapshotHash(activities)}}}),false);
assert.equal(approvedLaunchFeature('cityServices',activities,{approvedFeatures:{cityServices:{...record,sha256:snapshotHash(activities)}}}),true);
assert.equal(approvedLaunchFeature('unknown',activities,{approvedFeatures:{unknown:{...record,sha256:snapshotHash(activities)}}}),false);
// 正式部署固定 62 篇首發佇列；只有 LAUNCH_TEST_ONLY 隔離測試能換成產生的模擬佇列。
assert.equal(launchQueueFile({}),LAUNCH_EXPANSION_QUEUE);
assert.equal(launchQueueFile({LAUNCH_EXPANSION_QUEUE:'docs/.launch-fixture-x.generated.json'}),LAUNCH_EXPANSION_QUEUE);
assert.equal(launchQueueFile({LAUNCH_TEST_ONLY:'1',LAUNCH_EXPANSION_QUEUE:'docs/.launch-fixture-x.generated.json'}),'docs/.launch-fixture-x.generated.json');
assert.throws(()=>launchQueueFile({LAUNCH_TEST_ONLY:'1',LAUNCH_EXPANSION_QUEUE:'docs/QA-EXPANSION-IMPORT-QUEUE.json'}));
console.log('正式發布核准條件 20 項通過；QA 測試不能冒充正式核准、原文修改使核准失效、撤稿與待複核草稿不能放行、正式佇列不可被環境變數替換。');
