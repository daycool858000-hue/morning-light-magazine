#!/usr/bin/env node
// 外部連結可達性檢查：逐一連線 content/ 內所有官方網址，回報 HTTP 狀態。
// 注意：「可以連線」不等於「內容已查核」。查核仍需人工比對官方頁面內容後，才可把 status 改為「已確認」。
// 用法：npm run check-links（需要可連外的網路環境，例如自己的電腦或 GitHub Actions）
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (f) => JSON.parse(await readFile(path.join(ROOT, f), 'utf8'));
const resources = await read('content/resources.json');
const hotlines = await read('content/hotlines.json');
const events = await read('content/events.json');

const urls = new Map();
const add = (url, where) => { if (url) urls.set(url, [...(urls.get(url) || []), where]); };
for (const r of resources.items) { add(r.url, r.id); r.sources.forEach((s) => add(s.url, `${r.id} 來源`)); }
for (const h of hotlines.items) add(h.source?.url, `hotline ${h.id}`);
for (const c of hotlines.channels) add(c.url, `channel ${c.id}`);
for (const e of events.items) add(e.url, `event ${e.id}`);

const rows = [];
for (const [url, where] of urls) {
  let status = '';
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'MorningLightLinkCheck/1.0' } });
    status = `${res.status}${res.redirected ? ` → ${res.url}` : ''}`;
  } catch (err) {
    status = `連線失敗：${err.cause?.code || err.message}`;
  }
  rows.push({ url, where: where.join('、'), status });
  console.log(`${status.startsWith('2') ? '✔' : '✘'} ${status}  ${url}`);
}
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
await mkdir(path.join(ROOT, 'docs/link-checks'), { recursive: true });
const file = path.join(ROOT, `docs/link-checks/${today}.md`);
await writeFile(file, `# 外部連結可達性檢查 ${today}\n\n> 此紀錄只代表網址可否連線，不代表內容已完成人工查核。\n\n| 狀態 | 網址 | 使用位置 |\n|---|---|---|\n${rows.map((r) => `| ${r.status} | ${r.url} | ${r.where} |`).join('\n')}\n`);
console.log(`\n已寫入 ${path.relative(ROOT, file)}`);
