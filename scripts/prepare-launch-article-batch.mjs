#!/usr/bin/env node
// 由目前 QA 的「同一份原稿」建立正式發布候選清單。不改資料、不簽核、不部署。
// 用法：node scripts/prepare-launch-article-batch.mjs [--out=artifacts/launch-article-batch.json]
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBatch2Resources, loadBatch2Articles } from './lib/qa-batch2.mjs';
import { loadBatch3OpenAccess } from './lib/qa-batch3.mjs';
import { loadBatch45Articles } from './lib/qa-batch45.mjs';
import { loadBatch6Articles } from './lib/qa-batch6.mjs';
import { loadQaExpansion } from './lib/qa-expansion.mjs';
import { TOWARD_READING_SLUGS } from './lib/toward-light-editorial.mjs';
import { snapshotHash, approvedLaunchArticle } from './lib/launch-approval.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async p => JSON.parse(await readFile(path.join(ROOT,p),'utf8'));
const categories = await json('content/categories.json');
const counties = await json('content/counties.json');
const resources = await json('content/resources.json');
const launchApprovals = await json('content/launch-approvals.json');
const qaResources = await loadBatch2Resources(ROOT);
const b2 = await loadBatch2Articles(ROOT, categories);
const b3 = await loadBatch3OpenAccess(ROOT);
const b45 = await loadBatch45Articles(ROOT, categories);
const b6 = await loadBatch6Articles(ROOT, categories);
const existingArticles = [...b2, ...b3.articles, ...b45, ...b6];
const expanded = await loadQaExpansion(ROOT, {
  categories, counties, serviceTypes: resources.serviceTypes,
  existingResources: [...resources.items, ...qaResources, ...b3.resources],
  existingArticles,
});
const articles = [...existingArticles, ...expanded.articles];
const slugs = new Set(articles.map(x => x.slug));
const disabled = await json('docs/QA-EXPANSION-IMPORT-QUEUE.json');
const removed = disabled.articles.find(x => x.id === 'exp-12');
if (articles.length !== 44 || slugs.size !== 44 || expanded.articles.length !== 8 ||
    existingArticles.length !== 36 || !removed?.qaWithdrawal?.doNotReimport ||
    slugs.has(removed.slug)) {
  throw new Error('QA 文章版本有異動，停止建立正式發布候選；不得自動更新站主核准');
}
const towardBase = new Set(TOWARD_READING_SLUGS);
const classified = articles.map(a => {
  const directory = a.expansion ? a.directory : (towardBase.has(a.slug) ? 'toward' : 'readli');
  return {
    slug: a.slug, title: a.title, category: a.category, directory,
    sha256: snapshotHash(a),
    sourceCheckedOn: a.checkedOn || a.updated || '',
    sourceMethod: 'AI-assisted-editorial-check; not manually verified by owner',
    currentlyApprovedForProduction: approvedLaunchArticle(a, launchApprovals),
  };
});
const readli = classified.filter(x => x.directory === 'readli').length;
const toward = classified.filter(x => x.directory === 'toward').length;
if (readli !== 26 || toward !== 18) throw new Error('讀利／向光篇數不符（預期 26／18）');
const report = {
  site: '由己 SELF-AUTHORED', qaArticleCount: articles.length,
  readliCount: readli, towardCount: toward,
  source: 'QA candidate articles parsed from existing original draft loaders, exact data hashed',
  ownerPublicationApproved: false,
  note: '本報告只提供文章最新原稿指紋及候選範圍；無論何時產生都不能自動代表站主正式發布核准。',
  withdrawn: [removed.slug],
  articles: classified,
};
const filename = process.argv.find(x => x.startsWith('--out='))?.slice(6) || 'artifacts/launch-article-batch.json';
const output = path.resolve(ROOT, filename);
if (!output.startsWith(ROOT + path.sep) || !output.includes(path.sep + 'artifacts' + path.sep))
  throw new Error('只能輸出到專案 artifacts 資料夾，不可覆蓋正式核准或網站資料');
await mkdir(path.dirname(output), {recursive:true});
await writeFile(output, JSON.stringify(report,null,2) + '\n');
console.log('準備正式發布候選：44 篇（讀利 26／向光 18），目前在 launch-approvals.json 已取得文章核准：' + classified.filter(x => x.currentlyApprovedForProduction).length);
console.log('已撤稿 exp-12 不在清單中。候選版本指紋記錄已寫入 ' + path.relative(ROOT,output) + '；沒有修改現有網站。');
