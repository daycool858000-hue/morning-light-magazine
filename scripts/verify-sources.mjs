#!/usr/bin/env node
// 官方來源內容擷取：連線到官方網頁，把頁面標題、正文開頭與關鍵字前後文字印出，供人工比對查核。
// 注意：這只是「把官方頁面內容取回來看」，不會修改任何資料，也不代表查核完成。
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

// 搜尋引擎找到、但尚未讀過原文的候選官方頁面
const HOTLINE_EXTRA = [
  'https://dep.mohw.gov.tw/DOPS/cp-1183-6499-105.html',
  'https://www.mohw.gov.tw/cp-3568-38697-1.html',
  'https://www.mohw.gov.tw/cp-16-65879-1.html',
  'https://www.mohw.gov.tw/cp-16-85384-1.html',
  'https://www.mohw.gov.tw/cp-4261-46193-1.html',
  'https://www.mohw.gov.tw/cp-16-57989-1.html',
  'https://www.mohw.gov.tw/cp-2704-48244-1.html',
  'https://www.npa.gov.tw/ch/index',
  'https://www.npa.gov.tw/ch/app/artwebsite/view?module=artwebsite&id=807&serno=690fec3f-ab57-46ed-905e-5a65bd80c3f6',
  'https://www.npa.gov.tw/ch/app/artwebsite/view?module=artwebsite&id=18753&serno=04f72711-214c-4f29-881d-5764aa3cf10a',
  'https://www.npa.gov.tw/ch/app/faq/view?module=faq&id=2144&serno=A1084128',
  'https://www.nfa.gov.tw/',
  'https://www.nfa.gov.tw/cht/index.php',
  'https://sps.mohw.gov.tw/mhs',
  'https://www.1980.org.tw/',
];
// 第二輪：從第一輪頁面連結找到、需要讀原文的頁面（群組 urls 未指定網址時使用）
const FOLLOWUP = [
  'https://www.npa.gov.tw/ch/app/artwebsite/view?module=artwebsite&id=1048&serno=e3ad2889-4dee-41cf-aef8-9b9d26dc6950',
  'https://www.npa.gov.tw/ch/app/artwebsite/view?id=808&module=artwebsite&serno=d08673f4-0775-4a09-b4d8-d47c2c4edca2',
  'https://www.npa.gov.tw/ch/app/artwebsite/view?module=artwebsite&id=18753&serno=04f72711-214c-4f29-881d-5764aa3cf10a',
  'https://www.npa.gov.tw/ch/app/faq/view?module=faq&id=2144&serno=A1084128',
  'https://dep.mohw.gov.tw/DOMHAOH/lp-4917-107.html',
  'https://dep.mohw.gov.tw/DOMHAOH/cp-7168-80425-107.html',
  'https://www.1980.org.tw/',
  'https://www.119.gov.taipei/',
  'https://www.sfaa.gov.tw/',
  'https://sps.mohw.gov.tw/mhs',
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

function links(html, base, pattern, limit = 25) {
  const out = new Map();
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = toText(m[2]) || (m[0].match(/title\s*=\s*["']([^"']+)["']/i)?.[1] ?? '');
    if (!pattern.test(text)) continue;
    let href;
    try { href = new URL(decode(m[1]), base).href; } catch { continue; }
    if (!out.has(href)) out.set(href, text.slice(0, 60));
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

async function report(url, label, linkPattern, full = false) {
  console.log(`\n==== ${label} ====\nURL: ${url}`);
  try {
    const { res, html } = await fetchPage(url);
    console.log(`狀態: ${res.status}${res.url !== url ? `｜最終網址: ${res.url}` : ''}`);
    const title = toText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    console.log(`標題: ${title || '（無）'}`);
    const text = toText(html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html);
    console.log(`正文長度: ${text.length} 字`);
    console.log(`正文開頭: ${text.slice(0, 600)}`);
    if (full) {
      // 主要內容：從頁面標題（去掉網站名稱）在正文中第二次出現處（通常是內文標題）開始
      const stem = title.split(/[-｜|]/)[0].trim();
      const hits = [];
      for (let i = text.indexOf(stem); stem && i !== -1; i = text.indexOf(stem, i + 1)) hits.push(i);
      const start = hits[1] ?? hits[0] ?? 0;
      console.log(`主要內容: ${text.slice(start, start + 3500)}`);
    }
    for (const k of KEYWORDS) {
      const hits = [];
      let i = text.indexOf(k);
      while (i !== -1 && hits.length < 3) {
        hits.push(text.slice(Math.max(0, i - 90), i + k.length + 90));
        i = text.indexOf(k, i + k.length + 90);
      }
      if (hits.length) console.log(`  [${k}] ${hits.join(' ／ ')}`);
    }
    if (linkPattern) {
      const l = links(html, res.url, linkPattern);
      if (l.length) console.log(`  相關連結：\n${l.join('\n')}`);
    }
  } catch (err) {
    console.log(`連線失敗: ${err.cause?.code || err.name}: ${err.cause?.message || err.message}`);
  }
}

const [group = 'hotlines', ...rest] = process.argv.slice(2);
console.log(`擷取時間（UTC）: ${new Date().toISOString()}｜群組: ${group}`);
if (group === 'hotlines') {
  const hot = await read('content/hotlines.json');
  const urls = new Map();
  for (const h of hot.items) if (h.source?.url) urls.set(h.source.url, `專線 ${h.id} 目前來源`);
  for (const c of hot.channels) urls.set(c.url, `管道 ${c.id} 目前連結`);
  for (const u of HOTLINE_EXTRA) if (!urls.has(u)) urls.set(u, '候選官方頁面');
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
  for (const u of list.length ? list : FOLLOWUP) await report(u, '指定網址', HOTLINE_LINKS, true);
} else {
  console.error(`未知群組：${group}`);
  process.exit(1);
}
