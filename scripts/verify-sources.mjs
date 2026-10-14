#!/usr/bin/env node
// 官方來源連線檢查：連線到官方網頁，只印出網址、連線狀態、頁面標題、頁面上的日期與少量關鍵字短摘錄，供人工比對查核。
// 執行紀錄會出現在公開的 GitHub Actions 頁面，因此刻意不輸出正文：每個關鍵字最多一段 ±30 字摘錄、每頁最多 8 段，
// 並遮蔽電子郵件地址。要閱讀完整內容，請直接開啟官方網頁。
// 注意：這不會修改任何資料，也不代表查核完成。
// 是否改為「已確認」仍須由人工閱讀官方頁面後決定。
//
// 用法：
//   node scripts/verify-sources.mjs hotlines     # 緊急專線與相關官方頁面
//   node scripts/verify-sources.mjs resources    # content/resources.json 內所有官方入口
//   node scripts/verify-sources.mjs counties     # 22 縣市政府首頁，列出社會福利相關連結（候選名單，不會發布）
//   node scripts/verify-sources.mjs urls <網址…>  # 指定網址
// 需要可連外的網路環境（例如 GitHub Actions 手動執行的 verify-sources 工作流程）。
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (f) => JSON.parse(await readFile(path.join(ROOT, f), 'utf8'));

const KEYWORDS = ['服務時間', '24小時', '24 小時', '全天候', '免付費', '免費', '年滿', '歲', '補助', '申請', '簡訊', '視訊', '定位', '派遣', '1925', '113', '110', '119', '1980', '115年', '2026', '停止', '截止', '更名', '服務對象'];

// 群組 urls 未指定網址時使用的清單
const FOLLOWUP = [
  'https://www.nfa.gov.tw/cht/?code=list&ids=68',
];
const HOTLINE_LINKS = /輔導專線|服務時間|1925|安心專線|113|保護專線|110|119|視訊報案|簡訊報案|警政服務|報案|緊急救護|心理健康支持|青壯|諮商/;

const COUNTY_HOME = {
  keelung: 'https://www.klcg.gov.tw/', taipei: 'https://www.gov.taipei/', 'new-taipei': 'https://www.ntpc.gov.tw/',
  taoyuan: 'https://www.tycg.gov.tw/', 'hsinchu-city': 'https://www.hccg.gov.tw/', 'hsinchu-county': 'https://www.hsinchu.gov.tw/',
  yilan: 'https://www.e-land.gov.tw/', miaoli: 'https://www.miaoli.gov.tw/', taichung: 'https://www.taichung.gov.tw/',
  changhua: 'https://www.chcg.gov.tw/', nantou: 'https://www.nantou.gov.tw/', yunlin: 'https://www.yunlin.gov.tw/',
  'chiayi-city': 'https://www.chiayi.gov.tw/', 'chiayi-county': 'https://www.cyhg.gov.tw/', tainan: 'https://www.tainan.gov.tw/',
  kaohsiung: 'https://www.kcg.gov.tw/', pingtung: 'https://www.pthg.gov.tw/', hualien: 'https://www.hl.gov.tw/',
  taitung: 'https://www.taitung.gov.tw/', penghu: 'https://www.penghu.gov.tw/', kinmen: 'https://www.kinmen.gov.tw/',
  lienchiang: 'https://www.matsu.gov.tw/',
};
const COUNTY_LINKS = /社會局|社會處|社會及勞動處|社會福利|家庭暴力|家防|性侵害|婦女|婦幼|勞工|勞動|就業/;

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENT[e.toLowerCase()] ?? m;
});
const toText = (html) => decode(html
  .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function links(html, base, pattern, limit = 10) {
  const out = new Map();
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = toText(m[2]) || (m[0].match(/title\s*=\s*["']([^"']+)["']/i)?.[1] ?? '');
    if (!pattern.test(text)) continue;
    let href;
    try { href = new URL(decode(m[1]), base).href; } catch { continue; }
    if (!out.has(href)) out.set(href, text.slice(0, 30));
    if (out.size >= limit) break;
  }
  return [...out].map(([href, text]) => `    · ${text} → ${href}`);
}

async function fetchPage(url) {
  const res = await fetch(url, {
    redirect: 'follow', signal: AbortSignal.timeout(30000),
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; SelfAuthoredSourceCheck/1.0)', 'accept-language': 'zh-TW,zh;q=0.9' },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const head = buf.subarray(0, 4096).toString('latin1');
  const charset = (res.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1]
    || head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] || 'utf-8').toLowerCase();
  let html;
  try { html = new TextDecoder(charset).decode(buf); } catch { html = buf.toString('utf8'); }
  return { res, html };
}

const SNIPPET = 30; // 摘錄前後各 30 字
const MAX_SNIPPETS = 8;
const DATE_RE = /(更新日期|更新時間|建檔日期|發布日期|上版日期|資料更新|最後更新日期)[：:\s]*(\d{2,4}[-/.]\d{1,2}[-/.]\d{1,2})/g;
const mask = (t) => t.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '［電子郵件已遮蔽］');

async function report(url, label, linkPattern) {
  console.log(`\n==== ${label} ====\nURL: ${url}`);
  try {
    const { res, html } = await fetchPage(url);
    console.log(`狀態: ${res.status}${res.url !== url ? `｜最終網址: ${res.url}` : ''}`);
    const title = toText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    console.log(`標題: ${mask(title) || '（無）'}`);
    const text = toText(html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html);
    const dates = [...new Set([...text.matchAll(DATE_RE)].map((m) => `${m[1]} ${m[2]}`))].slice(0, 4);
    if (dates.length) console.log(`日期: ${dates.join('／')}`);
    let shown = 0;
    for (const k of KEYWORDS) {
      if (shown >= MAX_SNIPPETS) break;
      const i = text.indexOf(k);
      if (i === -1) continue;
      console.log(`  [${k}] ${mask(text.slice(Math.max(0, i - SNIPPET), i + k.length + SNIPPET))}`);
      shown++;
    }
    if (linkPattern) {
      const l = links(html, res.url, linkPattern);
      if (l.length) console.log(`  相關連結：\n${l.join('\n')}`);
    }
  } catch (err) {
    console.log(`連線失敗: ${err.cause?.code || err.name}`);
  }
}

const [group = 'hotlines', ...rest] = process.argv.slice(2);
console.log(`擷取時間（UTC）: ${new Date().toISOString()}｜群組: ${group}`);
if (group === 'hotlines') {
  const hot = await read('content/hotlines.json');
  const urls = new Map();
  for (const h of hot.items) if (h.source?.url) urls.set(h.source.url, `專線 ${h.id} 目前來源`);
  for (const c of hot.channels) urls.set(c.url, `管道 ${c.id} 目前連結`);
  for (const [u, label] of urls) await report(u, label, HOTLINE_LINKS);
} else if (group === 'resources') {
  const res = await read('content/resources.json');
  for (const r of res.items) {
    await report(r.url, `資源 ${r.id}｜${r.name}`, HOTLINE_LINKS);
    for (const s of r.sources) if (s.url !== r.url) await report(s.url, `資源 ${r.id} 來源`, null);
  }
} else if (group === 'counties') {
  const counties = await read('content/counties.json');
  for (const c of counties) {
    const url = COUNTY_HOME[c.id];
    if (!url) { console.log(`\n==== ${c.name}：未設定首頁候選網址 ====`); continue; }
    await report(url, `縣市 ${c.name}（候選，不會發布）`, COUNTY_LINKS);
  }
} else if (group === 'urls') {
  const list = rest.join(' ').split(/\s+/).filter(Boolean);
  if (!list.length) console.log('未指定網址，使用 FOLLOWUP 清單（' + FOLLOWUP.length + ' 筆）');
  for (const u of list.length ? list : FOLLOWUP) await report(u, '指定網址', HOTLINE_LINKS);
} else {
  console.error(`未知群組：${group}`);
  process.exit(1);
}
