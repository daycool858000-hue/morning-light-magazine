#!/usr/bin/env node
// 第二批候選官方連結的瀏覽器開頁檢查（Chromium，無頭模式）。
// 讀取 23 筆地方入口與 12 篇文章的官方來源網址，逐一以真正的瀏覽器開啟，只記錄：
// HTTP 狀態、最終網址、頁面標題前 40 字或錯誤類型。不輸出頁面正文，不修改任何資料。
// 結果只代表「這台檢查機器（GitHub 美國機房）當下」能否開啟；不等於台灣使用者或 iPhone Safari 的結果。
// 用法：node scripts/check-links-browser.mjs（需要 Playwright Chromium）
//       node scripts/check-links-browser.mjs --set=batch45　只檢查第四、五批 13 篇文章的參考來源（Issue #2）
//       node scripts/check-links-browser.mjs --set=batch6　 只檢查第六批城市與福利 6 篇文章的參考來源（Issue #3）
//       node scripts/check-links-browser.mjs --set=activities　只檢查「近期活動與講座」頁的官方公告與長期查詢入口
//       node scripts/check-links-browser.mjs --set=expansion9　只檢查九篇擴充文章（暫存佇列）的參考來源
//       node scripts/check-links-browser.mjs --set=pregnancy　只檢查生活與家庭「孕期與生育資訊整理」的九個官方原頁
//       加上 --fail-on-broken：只有「真正失效」（404／410、網域不存在等）才以 exit 1 結束；
//       下載型連結、海外逾時／連線受阻、防護頁都不算失效，但會逐筆分類列出。
// 結果分四類：正常開啟、下載型連結（檔案直接下載，另以 HTTP 讀取狀態與檔案類型）、海外逾時／受阻、真正失效。
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadBatch2Articles, BATCH2_RESOURCES } from './lib/qa-batch2.mjs';
import { loadBatch45Articles } from './lib/qa-batch45.mjs';
import { loadBatch6Articles } from './lib/qa-batch6.mjs';
import { loadQaActivities, loadQaNotices } from './lib/qa-activities.mjs';
import { extractSection, parseExpansionArticle } from './lib/qa-expansion.mjs';
import { PREGNANCY_GUIDE_FILE } from './lib/qa-pregnancy-guide.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const categories = JSON.parse(await readFile(path.join(ROOT, 'content/categories.json'), 'utf8'));
const cand = JSON.parse(await readFile(path.join(ROOT, BATCH2_RESOURCES), 'utf8')).items;
const arts = await loadBatch2Articles(ROOT, categories);

const targets = new Map();
if (process.argv.includes('--set=activities')) {
  for (const it of (await loadQaActivities(ROOT)).items) targets.set(it.url, `活動與講座 ${it.id}`);
  for (const it of (await loadQaNotices(ROOT)).all) targets.set(it.sourceUrl, `近期活動消息 ${it.id}`);
} else if (process.argv.includes('--set=pregnancy')) {
  const guide = JSON.parse(await readFile(path.join(ROOT, PREGNANCY_GUIDE_FILE), 'utf8'));
  for (const s of guide.steps) for (const l of s.links) targets.set(l.url, `孕期與生育 ${l.id}`);
} else if (process.argv.includes('--set=expansion9')) {
  // 九篇擴充候選（docs/QA-EXPANSION-STAGING-NINE-2026-10-17.json）的文章來源。
  // 直接解析原稿，不經 importToQa 開關，暫存未開啟的文章也會一併實際開啟。
  const queue = JSON.parse(await readFile(path.join(ROOT, 'docs/QA-EXPANSION-STAGING-NINE-2026-10-17.json'), 'utf8'));
  for (const x of queue.articles) {
    const text = await readFile(path.join(ROOT, x.sourceFile), 'utf8');
    const stop = queue.sourceFiles[x.sourceFile]?.stopAt;
    const [section] = extractSection(text, x.heading, stop ? text.indexOf(stop) : -1);
    if (!section) { console.log(`✘ ${x.id}｜原稿找不到第 ${x.heading} 篇｜${x.sourceFile}`); continue; }
    const label = `${x.id}${x.importToQa ? '' : '（暫存未開啟）'}`;
    for (const s of parseExpansionArticle(x.id, section.raw).sources) if (!targets.has(s.url)) targets.set(s.url, `${label} 來源`);
  }
} else if (process.argv.includes('--set=batch45') || process.argv.includes('--set=batch6')) {
  const list = process.argv.includes('--set=batch6') ? await loadBatch6Articles(ROOT, categories) : await loadBatch45Articles(ROOT, categories);
  for (const a of list) for (const s of a.sourcesList) if (!targets.has(s.url)) targets.set(s.url, `${a.slug} 來源`);
} else {
  for (const r of cand) targets.set(r.url, `地方入口 ${r.id.replace('batch2-', '')}`);
  for (const a of arts) for (const s of a.sourcesList) if (!targets.has(s.url)) targets.set(s.url, `文章 ${a.no} 來源`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'zh-TW', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36' });
const rows = [];
// 分類：ok 正常開啟／download 下載型連結／unreachable 海外逾時或受阻（不等於失效）／broken 真正失效
const KIND = { ok: '正常開啟', download: '下載型連結', unreachable: '海外逾時／受阻', broken: '真正失效' };
const BROKEN_STATUS = new Set([404, 410]);
const BROKEN_NET = /ERR_NAME_NOT_RESOLVED|ERR_CERT_|ERR_SSL_|ERR_INVALID_URL/;
for (const [url, label] of targets) {
  const page = await ctx.newPage();
  let line;
  try {
    let status = 0;
    let redirected = false;
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      status = res ? res.status() : 0;
    } catch (err) {
      // 網站以 JavaScript／meta 立即轉址時，第一次導覽會被「中斷」；改等轉址後的頁面載入完成
      if (!/interrupted by another navigation|Execution context was destroyed/.test(err.message)) throw err;
      redirected = true;
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(redirected ? 2000 : 300);
    const title = (await page.title().catch(() => '')).replace(/\s+/g, ' ').slice(0, 40);
    const u = new URL(page.url());
    const final = page.url() !== url ? `｜最終：${u.host}${u.pathname.slice(0, 40)}` : '';
    // 防護驗證頁，或 HTTP 200 但內容是拒絕／錯誤頁（例如 pip.moi.gov.tw 的 Request Rejected、法規資料庫的 Error）
    const challenge = /Just a moment|Attention Required|Request Rejected|^Error$/i.test(title);
    const ok = !challenge && (redirected ? /^https:/.test(page.url()) && Boolean(title) : status >= 200 && status < 400);
    const kind = ok ? 'ok' : BROKEN_STATUS.has(status) ? 'broken' : 'unreachable';
    line = { label, url, kind, text: `${redirected ? '轉址後載入' : status}｜${title || '（無標題）'}${challenge ? '（防護驗證或錯誤頁，未能進入網站內容）' : ''}${final}` };
  } catch (err) {
    const msg = String(err.message).split('\n')[0].replace(/ at .*$/, '');
    if (/Download is starting|net::ERR_ABORTED/.test(msg)) {
      // 檔案直接下載（例如 PDF 附件）：瀏覽器不會顯示網頁，改以 HTTP 讀取狀態、檔案類型與大小，不輸出檔案內容
      const r = await ctx.request.get(url, { timeout: 30000 }).catch((e) => ({ error: e }));
      if (r.error) line = { label, url, kind: 'unreachable', text: `下載型連結，HTTP 讀取失敗：${String(r.error.message).split('\n')[0].slice(0, 60)}` };
      else {
        const type = (r.headers()['content-type'] || '未標示').split(';')[0];
        const size = (await r.body().catch(() => Buffer.alloc(0))).length;
        const kind = r.ok() && size > 0 ? 'download' : BROKEN_STATUS.has(r.status()) ? 'broken' : 'unreachable';
        line = { label, url, kind, text: `下載型連結｜HTTP ${r.status()}｜${type}｜${Math.round(size / 1024)} KB` };
      }
    } else {
      line = { label, url, kind: BROKEN_NET.test(msg) ? 'broken' : 'unreachable', text: `開啟失敗：${msg.slice(0, 80)}` };
    }
  }
  // 法規資料庫網址參數大小寫不同時另測一次 PCode=，只印出診斷結果，不修改文章網址
  if (line.kind !== 'ok' && /law\.moj\.gov\.tw\/.*[?&]pcode=/.test(url)) {
    const alt = url.replace('pcode=', 'PCode=');
    const r = await page.goto(alt, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    line.text += `｜診斷：改用 PCode= 時 ${r ? r.status() : '開啟失敗'}｜${(await page.title().catch(() => '')).slice(0, 40)}`;
  }
  await page.close();
  rows.push(line);
  console.log(`${{ ok: '✔', download: '⇩', unreachable: '…', broken: '✘' }[line.kind]} [${KIND[line.kind]}] ${line.label}｜${line.text}｜${url}`);
}
await browser.close();
const count = (k) => rows.filter((r) => r.kind === k).length;
console.log(`\n共 ${rows.length} 個網址：正常開啟 ${count('ok')}、下載型連結 ${count('download')}、海外逾時／受阻 ${count('unreachable')}、真正失效 ${count('broken')}。`);
console.log('（海外逾時／受阻只代表 GitHub 美國機房當下打不開，不等於網址失效；工作流程 success 也不代表每個網址都正常開啟，請逐筆看上方分類。）');
if (process.argv.includes('--fail-on-broken') && count('broken')) process.exit(1);
