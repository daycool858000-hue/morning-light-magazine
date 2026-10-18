// 只在隔離的 GitHub Actions checkout／本機工作目錄模擬站主簽核 62 篇首發範圍。
// 測完必定還原 content/launch-approvals.json、刪除模擬佇列與輸出。此測試不代表站主真的已核准，也不部署網站。
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotHash, LAUNCH_EXPANSION_QUEUE, LAUNCH_SCOPE, LAUNCH_FEATURES } from '../scripts/lib/launch-approval.mjs';
import { loadLaunchFeatureInputs } from '../scripts/lib/launch-inputs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'content/launch-approvals.json');
const prior = await readFile(file, 'utf8');
const template = JSON.parse(prior);
assert.deepEqual(template.approvedArticles, {}, '這份工程測試必須先從零核准狀態開始');
assert.deepEqual(template.approvedFeatures, {}, '這份工程測試必須先從零核准狀態開始');

// 模擬「13 篇完成來源複核後」的佇列：只寫入 gitignore 的產生檔，真實佇列與原稿完全不動。
const FIXTURE = 'docs/.launch-fixture-62.generated.json';
const realQueue = JSON.parse(await readFile(path.join(root, LAUNCH_EXPANSION_QUEUE), 'utf8'));
const fixtureQueue = structuredClone(realQueue);
let flipped = 0;
for (const x of fixtureQueue.articles) {
  if (x.importToQa && x.sourceCheck === 'pending') {
    Object.assign(x, { sourceCheck: 'source-checked', sourceCheckedOn: '2026-10-18', sourceCheckRecord: FIXTURE });
    flipped++;
  }
}
assert.equal(flipped, 13, '62 篇預覽應有 13 篇來源待複核');
const env = { ...process.env, LAUNCH_TEST_ONLY: '1', LAUNCH_EXPANSION_QUEUE: FIXTURE };
const realEnv = { ...process.env };
delete realEnv.LAUNCH_TEST_ONLY; delete realEnv.LAUNCH_EXPANSION_QUEUE;
const outs = [];
const node = (args, e = env) => execFileSync(process.execPath, args, { cwd: root, env: e, stdio: 'pipe' }).toString('utf8');
const build = (name, e = env) => { outs.push(path.join(root, name)); return node(['scripts/build.mjs', '--mode=production', '--out=' + name], e); };
const sign = (sha256) => ({
  decision: 'site-owner-approved-for-publication', approvedBy: 'site-owner', approvedOn: '2026-10-18',
  sourceReview: 'AI-source-checked-not-manual-owner-audit', sha256,
});
const save = () => writeFile(file, JSON.stringify(template, null, 2) + '\n');
const refresh = (e = env) => { node(['scripts/prepare-launch-article-batch.mjs'], e); node(['scripts/prepare-launch-feature-batch.mjs'], e); };
const readiness = (name, e = env) => node(['scripts/assert-production-ready.mjs', '--out=' + name], e);
const read = (dir, p) => readFile(path.join(root, dir, p), 'utf8');
const articleFiles = async (dir) => (await readdir(path.join(root, dir, 'articles'))).filter((x) => x.endsWith('.html'));
const count = (html, re) => (html.match(re) || []).length;

try {
  // 1. 真實佇列：13 篇仍待複核，即使有人誤簽一筆，正式建置也必須直接中止。
  const realBatch = JSON.parse((node(['scripts/prepare-launch-article-batch.mjs'], realEnv), await readFile(path.join(root, 'artifacts/launch-article-batch.json'), 'utf8')));
  assert.equal(realBatch.queueFile, LAUNCH_EXPANSION_QUEUE);
  assert.equal(realBatch.sourcePendingCount, 13);
  assert.ok(realBatch.articles.every((x) => !x.currentlyApprovedForProduction));
  const pendingOne = realBatch.articles.find((x) => x.sourceCheck === 'pending');
  template.approvedArticles[pendingOne.slug] = sign(pendingOne.sha256);
  await save();
  assert.throws(() => build('dist-launch-real-pending', realEnv), /尚未完成來源查核/, '真實佇列仍有待複核文章時不可建置正式版');
  template.approvedArticles = {};
  await save();

  // 2. 模擬佇列的精確指紋
  await writeFile(path.join(root, FIXTURE), JSON.stringify(fixtureQueue, null, 2) + '\n');
  refresh();
  const batch = JSON.parse(await readFile(path.join(root, 'artifacts/launch-article-batch.json'), 'utf8'));
  assert.equal(batch.queueFile, FIXTURE);
  assert.equal(batch.articles.length, LAUNCH_SCOPE.articles);
  assert.equal(batch.sourcePendingCount, 0);

  // 3. 單篇簽核：只輸出那一篇，不帶出其他 61 篇、日曆或測試標示。
  const chosen = batch.articles.find((x) => x.slug === 'batch2-01');
  template.approvedArticles['batch2-01'] = sign(chosen.sha256);
  await save();
  build('dist-launch-one');
  assert.deepEqual(await articleFiles('dist-launch-one'), ['batch2-01.html']);
  const one = await read('dist-launch-one', 'articles/batch2-01.html');
  const oneIndex = await read('dist-launch-one', 'assets/data/search-index.js');
  assert.ok(one.includes('網站擁有人已同意公開此原稿版本') && !one.includes('未核准測試內容') && !one.includes('noindex'));
  assert.ok(oneIndex.includes('articles/batch2-01.html') && !oneIndex.includes('articles/batch2-02.html'));
  assert.ok(!existsSync(path.join(root, 'dist-launch-one/assets/js/qa-calendar.js')), '不可順便帶出未核准日曆');
  assert.ok(!(await read('dist-launch-one', 'city.html')).includes('id="benefits"'), '未簽核的城市福利文章不可顯示');

  // 4. 指紋改錯一碼：不得輸出
  template.approvedArticles['batch2-01'] = sign(chosen.sha256.slice(0, -1) + (chosen.sha256.endsWith('0') ? '1' : '0'));
  await save();
  build('dist-launch-bad');
  assert.deepEqual(await articleFiles('dist-launch-bad'), []);

  // 5. 62 篇全簽、功能未簽：沿用讀利38／向望24版面，但活動與日曆不得偷跑；硬閘必須擋下。
  template.approvedArticles = Object.fromEntries(batch.articles.map((a) => [a.slug, sign(a.sha256)]));
  await save();
  build('dist-launch-articles');
  assert.equal((await articleFiles('dist-launch-articles')).length, LAUNCH_SCOPE.articles);
  assert.equal(count(await read('dist-launch-articles', 'quiet-power.html'), /<h3><a href="articles\//g), LAUNCH_SCOPE.readli);
  assert.equal(count(await read('dist-launch-articles', 'toward-light.html'), /class="toward-reading-card"/g), LAUNCH_SCOPE.toward);
  assert.ok(!existsSync(path.join(root, 'dist-launch-articles/activities.html')), '只有文章簽核時活動頁不得出現');
  assert.ok(!existsSync(path.join(root, 'dist-launch-articles/assets/js/qa-calendar.js')));
  refresh();
  assert.throws(() => readiness('dist-launch-articles'), /功能未具對應版本記錄/);

  // 6. 全部功能也簽：硬閘放行，並與站主驗收的 62 篇預覽逐項對照。
  const inputs = await loadLaunchFeatureInputs(root, FIXTURE);
  template.approvedFeatures = Object.fromEntries(LAUNCH_FEATURES.map((n) => [n, sign(snapshotHash(inputs[n]))]));
  await save();
  build('dist-launch-full');
  refresh();
  assert.match(readiness('dist-launch-full'), /正式部署硬閘通過/);
  // 正文與引用來源與 62 篇預覽逐字相同（預覽以真實佇列建置，13 篇的正文沒有因模擬查核而改寫）。
  const qaDir = 'dist-qa-all62-city-review';
  node(['scripts/build.mjs', '--mode=qa', '--out=' + qaDir], { ...realEnv, QA_EXPANSION_QUEUE: LAUNCH_EXPANSION_QUEUE, QA_TOPIC_GUIDES_STAGING: '1', QA_PENDING_REVIEW_MODE: '1' });
  const prose = (html) => {
    const start = html.indexOf('<div class="section section-tight"><div class="wrap"><div class="prose">');
    const end = html.indexOf('</div></div></div>\n</article>', start);
    assert.ok(start >= 0 && end > start, '文章正文容器不存在');
    return html.slice(start, end);
  };
  for (const a of batch.articles) {
    const p = 'articles/' + a.slug + '.html';
    assert.equal(prose(await read('dist-launch-full', p)), prose(await read(qaDir, p)), '正式版正文／引用遭改寫：' + a.slug);
  }
  for (const page of ['city.html', 'activities.html', 'learning.html', 'life-family.html', 'toward-light.html', 'quiet-power.html']) {
    const qa = await read(qaDir, page), prod = await read('dist-launch-full', page);
    for (const re of [/class="notice" id="notice-/g, /class="act-item" id="act-/g, /class="preg-step"/g, /class="topic-links topic-guide-links"/g,
      /<li class="topic" id=/g, /id="res-qa-x-/g, /class="toward-reading-card"/g, /class="toward-toggle"/g, /<h3><a href="articles\//g]) {
      assert.equal(count(prod, re), count(qa, re), `${page} 與 62 篇預覽不一致：${re}`);
    }
  }
  // 原有 18 筆中只有已核准的 16 筆入口能進正式版；其餘 50 筆新增資源全數保留。
  assert.equal(count(await read(qaDir, 'city.html'), /class="res-card"/g) - count(await read('dist-launch-full', 'city.html'), /class="res-card"/g), 2);
  assert.ok(!(await read('dist-launch-full', 'city.html')).includes('未核准測試內容'));

  // 7. 少一項功能簽核即擋下；硬閘拒絕在非測試模式檢查模擬目錄。
  delete template.approvedFeatures.cityServices;
  await save();
  refresh();
  assert.throws(() => readiness('dist-launch-full'), /cityServices/);
  assert.throws(() => readiness('dist-launch-full', realEnv), /正式部署僅允許預設 dist-production/);
  console.log(`正式版模擬完成：真實佇列 13 篇待複核時正式建置中止；模擬查核完成後 62 篇正文與預覽逐字一致、讀利${LAUNCH_SCOPE.readli}／向望${LAUNCH_SCOPE.toward}、活動、長期入口、孕期、54主題、六縣市15入口均與預覽相同；缺一項功能、指紋不符或單篇簽核都不能通過硬閘。`);
} finally {
  // 不論成功或失敗都先還原原核准檔；模擬佇列、測試輸出不寫回 git，並以真實佇列重建指紋清單。
  await writeFile(file, prior);
  await rm(path.join(root, FIXTURE), { force: true });
  await Promise.all(outs.map((o) => rm(o, { recursive: true, force: true })));
  refresh(realEnv);
}
