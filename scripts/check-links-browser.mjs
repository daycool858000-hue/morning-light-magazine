#!/usr/bin/env node
// 第二批候選官方連結的瀏覽器開頁檢查（Chromium，無頭模式）。
// 讀取 23 筆地方入口與 12 篇文章的官方來源網址，逐一以真正的瀏覽器開啟，只記錄：
// HTTP 狀態、最終網址、頁面標題前 40 字或錯誤類型。不輸出頁面正文，不修改任何資料。
// 結果只代表「這台檢查機器（GitHub 美國機房）當下」能否開啟；不等於台灣使用者或 iPhone Safari 的結果。
// 用法：node scripts/check-links-browser.mjs（需要 Playwright Chromium）
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadBatch2Articles, BATCH2_RESOURCES } from './lib/qa-batch2.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const categories = JSON.parse(await readFile(path.join(ROOT, 'content/categories.json'), 'utf8'));
const cand = JSON.parse(await readFile(path.join(ROOT, BATCH2_RESOURCES), 'utf8')).items;
const arts = await loadBatch2Articles(ROOT, categories);

const targets = new Map();
for (const r of cand) targets.set(r.url, `地方入口 ${r.id.replace('batch2-', '')}`);
for (const a of arts) for (const s of a.sourcesList) if (!targets.has(s.url)) targets.set(s.url, `文章 ${a.no} 來源`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'zh-TW', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36' });
const page = await ctx.newPage();
const rows = [];
for (const [url, label] of targets) {
  let line;
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = res ? res.status() : 0;
    const title = (await page.title()).replace(/\s+/g, ' ').slice(0, 40);
    const final = page.url() !== url ? `｜最終：${new URL(page.url()).host}${new URL(page.url()).pathname.slice(0, 40)}` : '';
    line = { label, url, ok: status >= 200 && status < 400, text: `${status}｜${title || '（無標題）'}${final}` };
  } catch (err) {
    line = { label, url, ok: false, text: `開啟失敗：${String(err.message).split('\n')[0].replace(/ at .*$/, '').slice(0, 80)}` };
  }
  rows.push(line);
  console.log(`${line.ok ? '✔' : '✘'} ${line.label}｜${line.text}｜${url}`);
}
await browser.close();
console.log(`\n共 ${rows.length} 個網址，瀏覽器可開啟 ${rows.filter((r) => r.ok).length} 個，未能開啟 ${rows.filter((r) => !r.ok).length} 個（未能開啟不等於網址失效，可能是海外機房被阻擋）。`);
