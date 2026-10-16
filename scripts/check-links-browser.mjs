#!/usr/bin/env node
// 第二批候選官方連結的瀏覽器開頁檢查（Chromium，無頭模式）。
// 讀取 23 筆地方入口與 12 篇文章的官方來源網址，逐一以真正的瀏覽器開啟，只記錄：
// HTTP 狀態、最終網址、頁面標題前 40 字或錯誤類型。不輸出頁面正文，不修改任何資料。
// 結果只代表「這台檢查機器（GitHub 美國機房）當下」能否開啟；不等於台灣使用者或 iPhone Safari 的結果。
// 用法：node scripts/check-links-browser.mjs（需要 Playwright Chromium）
//       node scripts/check-links-browser.mjs --set=batch45　只檢查第四、五批 13 篇文章的參考來源（Issue #2）
//       node scripts/check-links-browser.mjs --set=batch6　 只檢查第六批城市與福利 6 篇文章的參考來源（Issue #3）
//       node scripts/check-links-browser.mjs --set=activities　只檢查首頁「活動與講座」頁的官方入口
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadBatch2Articles, BATCH2_RESOURCES } from './lib/qa-batch2.mjs';
import { loadBatch45Articles } from './lib/qa-batch45.mjs';
import { loadBatch6Articles } from './lib/qa-batch6.mjs';
import { loadQaActivities } from './lib/qa-activities.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const categories = JSON.parse(await readFile(path.join(ROOT, 'content/categories.json'), 'utf8'));
const cand = JSON.parse(await readFile(path.join(ROOT, BATCH2_RESOURCES), 'utf8')).items;
const arts = await loadBatch2Articles(ROOT, categories);

const targets = new Map();
if (process.argv.includes('--set=activities')) {
  for (const it of (await loadQaActivities(ROOT)).items) targets.set(it.url, `活動與講座 ${it.id}`);
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
    line = { label, url, ok, text: `${redirected ? '轉址後載入' : status}｜${title || '（無標題）'}${challenge ? '（防護驗證或錯誤頁，未能進入網站內容）' : ''}${final}` };
  } catch (err) {
    line = { label, url, ok: false, text: `開啟失敗：${String(err.message).split('\n')[0].replace(/ at .*$/, '').slice(0, 80)}` };
  }
  // 法規資料庫網址參數大小寫不同時另測一次 PCode=，只印出診斷結果，不修改文章網址
  if (!line.ok && /law\.moj\.gov\.tw\/.*[?&]pcode=/.test(url)) {
    const alt = url.replace('pcode=', 'PCode=');
    const r = await page.goto(alt, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
    line.text += `｜診斷：改用 PCode= 時 ${r ? r.status() : '開啟失敗'}｜${(await page.title().catch(() => '')).slice(0, 40)}`;
  }
  await page.close();
  rows.push(line);
  console.log(`${line.ok ? '✔' : '✘'} ${line.label}｜${line.text}｜${url}`);
}
await browser.close();
console.log(`\n共 ${rows.length} 個網址，瀏覽器可開啟 ${rows.filter((r) => r.ok).length} 個，未能開啟 ${rows.filter((r) => !r.ok).length} 個（未能開啟不等於網址失效，可能是海外機房被阻擋）。`);
