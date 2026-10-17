// 生活與家庭 01「懷孕與生育相關福利」QA-only 閱讀區的靜態驗收（需先執行 npm test 前段建置 dist、dist-production、dist-qa）。
// 測試通過只代表工程條件符合，不等於站主內容核准，也不代表外部官方網址都已實機開啟。
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PREGNANCY_GUIDE_FILE } from '../scripts/lib/qa-pregnancy-guide.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFile(path.join(root, p), 'utf8');
let failed = 0, count = 0;
const check = (label, ok, reason = '') => { count++; if (!ok) failed++; console.log((ok ? '✔' : '✘') + ' ' + label + (reason ? ' — ' + reason : '')); };

const guide = JSON.parse(await read(PREGNANCY_GUIDE_FILE));
const qa = await read('dist-qa/life-family.html');
const pv = await read('dist/life-family.html');
const prod = await read('dist-production/life-family.html');
const topicItems = (h) => [...h.matchAll(/<li class="topic" id="([^"]+)">[\s\S]*?<\/li>(?=\n|$)/g)].map((m) => ({ id: m[1], html: m[0] }));
const sectionOf = (h) => (h.match(/<section class="section preg-guide" id="pregnancy-guide"[\s\S]*?<\/section>/) || [''])[0];

const qaTopics = topicItems(qa), pvTopics = topicItems(pv);
const preg = qaTopics.find((t) => t.id === 'pregnancy');
check('主題索引 01 保留原標題與 #pregnancy 錨點，「整理中」改為可點擊的「查看孕期與生育資訊整理」',
  qaTopics[0]?.id === 'pregnancy' && preg.html.includes('<h3>懷孕與生育相關福利</h3>') &&
  preg.html.includes('<a href="#pregnancy-guide">查看孕期與生育資訊整理') && !preg.html.includes('官方入口整理與查核中'));
check('其他九個生活家庭主題索引的順序與內容逐字不變（與一般預覽版相同）',
  qaTopics.length === 10 && JSON.stringify(qaTopics.map((t) => t.id)) === JSON.stringify(pvTopics.map((t) => t.id)) &&
  qaTopics.slice(1).every((t, i) => t.html === pvTopics[i + 1].html));
check('「從需求開始」原本連到 #pregnancy 的入口仍在', qa.includes('href="#pregnancy"') && qa.includes('我想了解懷孕與生育相關福利'));

const sec = sectionOf(qa);
const steps = [...sec.matchAll(/<h3><span class="preg-no" aria-hidden="true">(\d\d)<\/span>([^<]+)<\/h3>/g)].map((m) => m[1] + m[2]);
check('同頁新增 #pregnancy-guide，位於主題索引之後、官方資源卡之前，四段依產檢→生育給付→工作權益→出生登記排列',
  sec && (qa.match(/id="pregnancy-guide"/g) || []).length === 1 &&
  qa.indexOf('id="topics-title"') < qa.indexOf('id="pregnancy-guide"') && qa.indexOf('id="pregnancy-guide"') < qa.indexOf('id="res-title"') &&
  JSON.stringify(steps) === JSON.stringify(['01懷孕期間的產檢與健康照護', '02生育給付：先分清楚自己的保險類型', '03正在工作：產檢假、產假與育嬰留停', '04孩子出生後：出生登記與地方生育獎勵']), steps.join('、'));

const ext = [...sec.matchAll(/<li><a href="(https:[^"]+)" target="_blank" rel="noopener noreferrer">[^<]+<span aria-hidden="true">↗<\/span>[\s\S]*?<\/a><p>([^<]+)<\/p><small>([^<]+)<\/small><\/li>/g)];
const expectedUrls = guide.steps.flatMap((s) => s.links.map((l) => l.url));
check('九個官方原頁連結都可點擊、另開新視窗，且附用途說明與機關／層級',
  ext.length === 9 && JSON.stringify(ext.map((m) => m[1])) === JSON.stringify(expectedUrls) && ext.every((m) => m[2].length >= 10 && m[3].includes('｜')));
check('官方連結都是實際原頁，不是機構總首頁', expectedUrls.every((u) => new URL(u).pathname.length > 1));
const cardUrls = [...qa.matchAll(/<article class="res-card[\s\S]*?<\/article>/g)].flatMap((m) => [...m[0].matchAll(/href="(https:[^"]+)"/g)].map((x) => x[1]));
const resourceUrls = JSON.parse(await read('content/resources.json')).items.map((r) => r.url);
check('沒有與既有資源卡同網址的重複、每個網址在頁面只出現一次，閱讀區沒有資源卡或圖片',
  new Set(expectedUrls).size === 9 && expectedUrls.every((u) => !cardUrls.includes(u) && !resourceUrls.includes(u)) &&
  !sec.includes('res-card') && !sec.includes('<img') && expectedUrls.every((u) => qa.split(`href="${u}"`).length === 2));

const benefit = (sec.match(/<li class="preg-step">\s*<h3><span class="preg-no" aria-hidden="true">02[\s\S]*?<\/li>\s*<li class="preg-step">/) || [''])[0];
check('生育給付清楚區分勞保、國保及無保別者，寫明「合計」補足，未寫成每人額外領取十萬元',
  benefit.includes('合計') && benefit.includes('不是每個人另外再領 10 萬元') &&
  ['勞保局｜勞工生育補助', '勞保局｜國保生育給付暨加給補助', '勞保局｜未參加相關社會保險者生育補助'].every((x) => benefit.includes(x)) &&
  !/每人(一律)?(再|另外|額外)?領\s*10\s*萬|各保別各領/.test(sec));

const law = await read('dist-qa/law.html');
const inner = [...sec.matchAll(/<a href="((?:law|city)\.html[^"]*|#[a-z-]+)">/g)].map((m) => m[1]);
check('育兒津貼、托育、產假與育嬰留停改用既有主題站內連結，目標錨點都存在',
  ['law.html#parental-leave', 'law.html#pregnancy-protection', 'city.html', '#childcare', '#daycare', '#pregnancy'].every((h) => inner.includes(h)) &&
  law.includes('id="parental-leave"') && law.includes('id="pregnancy-protection"') && qa.includes('id="childcare"') && qa.includes('id="daycare"'));
check('閱讀區不蒐集資料：沒有表單、輸入欄位或按鈕', !/<form|<input|<select|<textarea|<button/.test(sec));
check('閱讀區標示未核准測試內容與 AI 查核日期，頁面維持 noindex',
  sec.includes('未核准測試內容') && sec.includes('AI 編輯查核，尚未經網站擁有人核准') && qa.includes('noindex') && sec.includes(guide.closing));

const others = (await readdir(path.join(root, 'dist-qa'))).filter((f) => f.endsWith('.html') && f !== 'life-family.html');
const leaks = [];
for (const f of others) if ((await read('dist-qa/' + f)).includes('preg-guide')) leaks.push(f);
check('只有生活與家庭頁加入閱讀區，其他 QA 頁面沒有', leaks.length === 0, leaks.join('、'));

const qaIndex = await read('dist-qa/assets/data/search-index.js');
check('QA 站內搜尋可找到「孕期與生育資訊整理」並連到 #pregnancy-guide，原主題索引搜尋結果保留',
  qaIndex.includes('"url":"life-family.html#pregnancy-guide"') && qaIndex.includes('"url":"life-family.html#pregnancy"') && /"title":"孕期與生育資訊整理"[^}]*產檢/.test(qaIndex));

const prodIndex = await read('dist-production/assets/data/search-index.js');
const pvIndex = await read('dist/assets/data/search-index.js');
check('一般預覽與 production 不含閱讀區、搜尋項目或九個新網址，仍顯示原本的「整理中」',
  [pv, prod].every((h) => !h.includes('pregnancy-guide') && h.includes('官方入口整理與查核中') && expectedUrls.every((u) => !h.includes(u))) &&
  [pvIndex, prodIndex].every((h) => !h.includes('pregnancy-guide')));
const approvals = await read('content/release-approvals.json');
check('資料仍是未核准候選，正式發布核准快照沒有任何新網址',
  guide.status === 'candidate-not-approved' && guide.ownerPublicationApproval === false && guide.productionApproved === false &&
  !approvals.includes('pregnancy-guide') && expectedUrls.every((u) => !approvals.includes(u)));
const pending = guide.sourceRecords.filter((r) => r.linkStatus !== 'ai-opened').map((r) => r.id);
check('PG01、PG02 保留「待驗」紀錄，未被標成查核成功', JSON.stringify(pending) === JSON.stringify(['PG01', 'PG02']));

console.log(`孕期與生育閱讀區：${count} 項，通過 ${count - failed}，失敗 ${failed}`);
if (failed) process.exitCode = 1;
