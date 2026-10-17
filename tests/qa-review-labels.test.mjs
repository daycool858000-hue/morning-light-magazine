#!/usr/bin/env node
// QA「待查核」三層說明的驗收（只讀已建置的 dist、dist-production、dist-qa，不開瀏覽器）。
// 一、已依既有程序確認（網站發起人整批發布核准＋快照吻合）→「官方入口已核對（AI 協助）」／「專線用途與時間已核對（AI 協助）」
// 二、AI 已核對官方來源、尚未經站主審閱 →「AI 已核對來源」
// 三、尚未完成來源查核 →「待查核」
// 同時確認：沒有任何 status／checkedAt／release-approvals.json 被改；一般預覽與正式版畫面不變。
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvedRecord } from '../scripts/lib/release.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFile(path.join(ROOT, f), 'utf8');
const json = async (f) => JSON.parse(await read(f));
let failed = 0, count = 0;
const check = (label, ok, detail = '') => { count++; if (!ok) failed++; console.log(`${ok ? '✔' : '✘'} ${label}${detail ? ' — ' + detail : ''}`); };

const resources = (await json('content/resources.json')).items;
const hot = await json('content/hotlines.json');
const approvals = await json('content/release-approvals.json');
const batch2 = (await json('docs/BATCH2-23-RESOURCE-CANDIDATES-2026-10-15.json')).items;
const batch3 = (await json('docs/BATCH3-OPEN-ACCESS-CONTENT-2026-10-15.json')).resources;
const english = (await json('docs/QA-ENGLISH-RESOURCE-DISCOVERY-2026-10-16.json')).resources;

// 資料本身：狀態欄位完全沒有被改成已確認，核准快照也沒有變
const blob = execFileSync('git', ['hash-object', 'content/release-approvals.json'], { cwd: ROOT, encoding: 'utf8' }).trim();
check('資料狀態未變：content 資源／專線／管道與 QA 候選仍是「待確認」、checkedAt 未填，release-approvals.json 未修改',
  [...resources, ...hot.items, ...hot.channels, ...batch2, ...batch3, ...english].every((x) => x.status === '待確認') &&
  [...resources, ...batch2, ...batch3, ...english].every((x) => !x.checkedAt) &&
  blob === '5c4d0532d87581383045f5e017fe4ddef4d81df9', blob);

const approvedRes = resources.filter((r) => approvedRecord(r, approvals.resources, 'official-entry')).map((r) => r.id);
const approvedHot = hot.items.filter((h) => approvedRecord(h, approvals.hotlines, 'hotline-purpose-hours')).map((h) => h.number);
const approvedCh = hot.channels.filter((h) => approvedRecord(h, approvals.channels, 'official-channel')).map((h) => h.title);
const aiChecked = (x) => /AI/.test(x?.review?.by || '') && !/受阻|保持待確認/.test(x?.review?.result || '');

// 每張資源卡（QA 所有頁面）依 id 讀出畫面上的標示
const pages = (await readdir(path.join(ROOT, 'dist-qa'))).filter((f) => f.endsWith('.html'));
const cardLabel = new Map();
const wrong = [];
for (const f of pages) {
  const html = await read(`dist-qa/${f}`);
  for (const m of html.matchAll(/<article class="res-card" id="res-([^"]+)"[\s\S]*?<div class="meta">([\s\S]*?)<\/div>/g)) {
    const [, id, meta] = m;
    const label = meta.includes('badge-ok') ? 'release' : meta.includes('badge-ai') ? 'ai' : meta.includes('badge-pending') ? 'pending' : 'other';
    if (cardLabel.has(id) && cardLabel.get(id) !== label) wrong.push(`${id} 在不同頁面標示不一致`);
    cardLabel.set(id, label);
  }
}
const expectLabel = (r) => (!r.qa && approvedRes.includes(r.id) ? 'release' : aiChecked(r) ? 'ai' : 'pending');
const all = [...resources, ...batch2.map((r) => ({ ...r, qa: true })), ...batch3.map((r) => ({ ...r, qa: true })), ...english.map((r) => ({ ...r, qa: true }))];
for (const r of all) {
  if (!cardLabel.has(r.id)) continue; // 不在任何頁面（例如未公開）
  if (cardLabel.get(r.id) !== expectLabel(r)) wrong.push(`${r.id}：畫面 ${cardLabel.get(r.id)}，應為 ${expectLabel(r)}`);
}
const tally = { release: 0, ai: 0, pending: 0, other: 0 };
for (const v of cardLabel.values()) tally[v]++;
check('QA 資源卡標示與證據一致：站主整批核准且快照吻合 16 筆＝已核對；有 AI 核對紀錄＝AI 已核對來源；其餘＝待查核',
  wrong.length === 0 && tally.release === approvedRes.length && approvedRes.length === 16 && tally.other === 0,
  `${JSON.stringify(tally)}${wrong.length ? '；' + wrong.slice(0, 4).join('；') : ''}`);
const stillPending = [...cardLabel].filter(([, v]) => v === 'pending').map(([k]) => k).sort();
check('仍顯示「待查核」的資源卡只剩沒有完成查核的項目（mohw-sps、sfaa：AI 曾嘗試但官方頁讀取受阻）',
  JSON.stringify(stillPending) === JSON.stringify(['mohw-sps', 'sfaa']), stillPending.join('、'));

const support = await read('dist-qa/support.html');
const hotMeta = [...support.matchAll(/<article class="hotline">[\s\S]*?<h3>(\d+) [^<]*<\/h3>[\s\S]*?<div class="meta">([\s\S]*?)<\/div>/g)].map((m) => [m[1], m[2].includes('badge-ok')]);
const chMeta = [...support.matchAll(/<h3>([^<]+)<\/h3><\/div><\/header><p class="res-summary">[\s\S]*?<div class="meta">([\s\S]*?)<\/div>/g)].map((m) => [m[1], m[2].includes('badge-ok') ? 'release' : m[2].includes('badge-pending') ? 'pending' : 'other']);
check('專線與其他管道：110／119／113／1925 及 110 簡訊顯示站主整批核准範圍；未核准的視訊報案維持「待查核」',
  hotMeta.length === 4 && hotMeta.every(([n, ok]) => ok && approvedHot.includes(n)) &&
  chMeta.length === 2 && chMeta.every(([t, l]) => (approvedCh.includes(t) ? l === 'release' : l === 'pending')),
  JSON.stringify({ hotMeta, chMeta }));

const text = pages.length ? await read('dist-qa/life-family.html') : '';
check('QA 標示文字不把 AI 查核說成站主確認：「AI 已核對來源」一律附「尚未經站主審閱」，沒有出現「已確認」徽章',
  [...pages].length > 0 && !/class="badge badge-ok">已確認</.test(text) &&
  (await Promise.all(pages.map((f) => read(`dist-qa/${f}`)))).every((h) => (h.match(/badge-ai">AI 已核對來源<\/span><span>核對：\d{4}-\d{2}-\d{2}｜尚未經站主審閱/g) || []).length === (h.match(/badge-ai/g) || []).length));

// 一般預覽與正式版：畫面維持原狀（沒有 QA 三層標示）
const leak = [];
for (const dir of ['dist', 'dist-production']) {
  for (const f of (await readdir(path.join(ROOT, dir))).filter((x) => x.endsWith('.html'))) {
    const h = await read(`${dir}/${f}`);
    if (h.includes('badge-ai') || h.includes('站主已整批核准')) leak.push(`${dir}/${f}`);
  }
}
check('一般預覽與 production 沒有 QA 三層標示（正式版仍只依 release-approvals 快照公開）', leak.length === 0, leak.join('、'));
console.log(`QA 查核標示：${count} 項，通過 ${count - failed}，失敗 ${failed}`);
if (failed) process.exitCode = 1;
