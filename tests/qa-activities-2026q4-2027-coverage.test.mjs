// 2026-10-18 《由己》完整首發活動2026Q4～2027Q4：短期活動過期隱藏、長期官方入口保留（只測隔離分支）。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQaNotices, loadQaActivities } from '../scripts/lib/qa-activities.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const raw=await read('docs/QA-ACTIVITIES-NOTICES-2026Q4-2027-2026-10-16.json');
assert.deepEqual(raw.window,{from:'2026-11-01',to:'2027-12-31'});
assert.equal(raw.items.length,9,'原有六筆活動＋三筆原場館公告不能遺失');
const venues=[
 ['notice-popupasia-2026','2026-11-12','2026-11-15'],
 ['notice-new-art-taipei-2026','2026-11-20','2026-11-22'],
 ['notice-furever-art-2026','2026-12-18','2026-12-20']
];
for(const [id,start,end] of venues){
 const it=raw.items.find(x=>x.id===id);
 assert.ok(it,id+' 不存在');
 assert.equal(it.startDate,start);
 assert.equal(it.endDate,end);
 assert.equal(it.visibleUntil,end);
 assert.ok(it.sourceUrl.startsWith('https://www.songshanculturalpark.org/exhibition/activity/'));
}
const now=await loadQaNotices(root,{today:'2026-10-18'});
assert.equal(now.items.length,9,'目前九筆官方已公告活動均應顯示');
const after=await loadQaNotices(root,{today:'2027-01-01'});
for(const [id] of venues)assert.ok(!after.items.some(x=>x.id===id),id+' 過期必須隱藏');
assert.ok(after.items.some(x=>x.id==='notice-tibe-2027'),'2027書展尚未到期須保留');
const portal=await loadQaActivities(root);
assert.equal(portal.items.length,14,'原12長期入口＋2館舍查詢，永久保留');
for(const id of ['act-13','act-14']) {
 const x=portal.items.find(it=>it.id===id);
 assert.ok(x&&x.type==='portal'&&!x.startDate&&!x.endDate&&x.group==='藝文與閱讀',id+' 必須是長期入口');
}
const allExpired=await loadQaNotices(root,{today:'2028-01-01'});
assert.equal(allExpired.items.length,0,'收錄視窗內活動應於2027年底後隱藏');
assert.equal((await loadQaActivities(root)).items.length,14,'活動過期後原14長期查詢入口不能消失');
console.log('✔ 2026Q4–2027Q4短期展覽／市集3筆與既有6筆、長期官網入口14筆；日期與過期邏輯通過');
