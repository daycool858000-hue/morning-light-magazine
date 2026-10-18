#!/usr/bin/env node
// 由 62 篇預覽的「同一份原稿」建立正式發布候選清單。不改資料、不簽核、不部署。
// 用法：node scripts/prepare-launch-article-batch.mjs [--out=artifacts/launch-article-batch.json]
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontMatter } from './lib/markdown.mjs';
import { loadBatch2Resources, loadBatch2Articles } from './lib/qa-batch2.mjs';
import { loadBatch3OpenAccess } from './lib/qa-batch3.mjs';
import { loadBatch45Articles } from './lib/qa-batch45.mjs';
import { loadBatch6Articles } from './lib/qa-batch6.mjs';
import { loadQaExpansion } from './lib/qa-expansion.mjs';
import { TOWARD_READING_SLUGS } from './lib/toward-light-editorial.mjs';
import { snapshotHash, approvedLaunchArticle, launchQueueFile, LAUNCH_SCOPE } from './lib/launch-approval.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async p => JSON.parse(await readFile(path.join(ROOT,p),'utf8'));
const queueFile = launchQueueFile();
// 只為了盤點：讓 13 篇來源待複核草稿也能算出目前指紋並列為阻塞；它們永遠不會因此被核准（approvedLaunchArticle 拒絕）。
process.env.QA_PENDING_REVIEW_MODE = '1';
const categories = await json('content/categories.json');
const counties = await json('content/counties.json');
const resources = await json('content/resources.json');
const launchApprovals = await json('content/launch-approvals.json');
const articlesDir = path.join(ROOT, 'content/articles');
const articlesAll = await Promise.all((await readdir(articlesDir)).filter(f => f.endsWith('.md')).sort().map(async file => {
  const { data, body } = parseFrontMatter(await readFile(path.join(articlesDir, file), 'utf8'));
  return { ...data, file: `content/articles/${file}`, name: file.replace(/\.md$/, ''), body };
}));
const qaResources = await loadBatch2Resources(ROOT);
const b2 = await loadBatch2Articles(ROOT, categories);
const b3 = await loadBatch3OpenAccess(ROOT);
const b45 = await loadBatch45Articles(ROOT, categories);
const b6 = await loadBatch6Articles(ROOT, categories);
const existingArticles = [...b2, ...b3.articles, ...b45, ...b6];
const expanded = await loadQaExpansion(ROOT, {
  categories, counties, serviceTypes: resources.serviceTypes,
  existingResources: [...resources.items, ...qaResources, ...b3.resources],
  existingArticles: [...articlesAll, ...existingArticles],
  queueFile,
});
const articles = [...existingArticles, ...expanded.articles];
const slugs = new Set(articles.map(x => x.slug));
const queue = await json(queueFile);
const removed = queue.articles.find(x => x.id === 'exp-12');
if (articles.length !== LAUNCH_SCOPE.articles || slugs.size !== LAUNCH_SCOPE.articles ||
    expanded.articles.length !== LAUNCH_SCOPE.expansionArticles || existingArticles.length !== LAUNCH_SCOPE.baseArticles ||
    removed?.importToQa !== false || !removed?.qaWithdrawal?.doNotReimport || slugs.has(removed.slug)) {
  throw new Error('62 篇首發原稿版本有異動，停止建立正式發布候選；不得自動更新站主核准');
}
const towardBase = new Set(TOWARD_READING_SLUGS);
const classified = articles.map(a => {
  const directory = a.expansion ? a.directory : (towardBase.has(a.slug) ? 'toward' : 'readli');
  const pending = a.expansion && a.editorialReviewPending !== false;
  return {
    slug: a.slug, title: a.title, category: a.category, directory,
    sha256: snapshotHash(a),
    sourceCheck: pending ? 'pending' : 'source-checked',
    sourceCheckedOn: pending ? '' : (a.checkedOn || a.updated || ''),
    sourceMethod: 'AI-assisted-editorial-check; not manually verified by owner',
    ...(pending ? { blocker: '來源與資料尚待複核：須先完成查核、更新佇列並產生新指紋，才可請站主簽核' } : {}),
    currentlyApprovedForProduction: approvedLaunchArticle(a, launchApprovals),
  };
});
const readli = classified.filter(x => x.directory === 'readli').length;
const toward = classified.filter(x => x.directory === 'toward').length;
if (readli !== LAUNCH_SCOPE.readli || toward !== LAUNCH_SCOPE.toward)
  throw new Error(`讀利／向望篇數不符（預期 ${LAUNCH_SCOPE.readli}／${LAUNCH_SCOPE.toward}，實際 ${readli}／${toward}）`);
const pendingCount = classified.filter(x => x.sourceCheck === 'pending').length;
const report = {
  site: '由己 SELF-AUTHORED', queueFile, qaArticleCount: articles.length,
  readliCount: readli, towardCount: toward, sourcePendingCount: pendingCount,
  source: '62-article accepted preview articles parsed from the same original draft loaders, exact data hashed',
  ownerPublicationApproved: false,
  note: '本報告只提供文章最新原稿指紋及候選範圍；無論何時產生都不能自動代表站主正式發布核准。來源待複核的文章即使填入指紋也不會放行。',
  withdrawn: [removed.slug],
  articles: classified,
};
const filename = process.argv.find(x => x.startsWith('--out='))?.slice(6) || 'artifacts/launch-article-batch.json';
const output = path.resolve(ROOT, filename);
if (!output.startsWith(ROOT + path.sep) || !output.includes(path.sep + 'artifacts' + path.sep))
  throw new Error('只能輸出到專案 artifacts 資料夾，不可覆蓋正式核准或網站資料');
await mkdir(path.dirname(output), {recursive:true});
await writeFile(output, JSON.stringify(report,null,2) + '\n');
console.log(`準備正式發布候選：${articles.length} 篇（讀利 ${readli}／向望 ${toward}），來源待複核 ${pendingCount} 篇；launch-approvals.json 已取得文章核准：${classified.filter(x => x.currentlyApprovedForProduction).length}`);
console.log('已撤稿 exp-12 不在清單中。候選版本指紋記錄已寫入 ' + path.relative(ROOT,output) + '；沒有修改現有網站。');
