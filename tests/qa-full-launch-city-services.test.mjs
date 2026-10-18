#!/usr/bin/env node
// 完整首發候選六縣市直接服務入口：15個長期官方URL + 62篇閱讀，維持QA隔離。
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const manifest='docs/QA-FULL-LAUNCH-ALL-62-WITH-CITY-SERVICES-2026-10-18.json';
const q=JSON.parse(await readFile(manifest,'utf8'));
const city=q.resources.filter(x=>x.id.startsWith('local-')&&x.importToQa);
assert.equal(city.length,15);
assert.equal(new Set(city.map(x=>x.url)).size,15);
assert.equal(new Set(city.map(x=>x.regions[0])).size,6);
assert.ok(!city.some(x=>x.id.includes('north-south-oct-dec-2026')||x.id.includes('centers-four-modes')));
const dir='dist-qa-all62-city-review';
const env={...process.env,QA_EXPANSION_QUEUE:manifest,QA_TOPIC_GUIDES_STAGING:'1',QA_PENDING_REVIEW_MODE:'1'};
execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out='+dir],{env,stdio:'inherit'});
const file=async name=>readFile(dir+'/'+name,'utf8');
const cityHTML=await file('city.html');
for(const c of city){
 assert.ok(cityHTML.includes(c.url.replaceAll('&','&amp;')),c.id+' city official link');
 assert.ok(cityHTML.includes(c.name),c.id+' city name');
}
assert.equal((await readdir(dir+'/articles')).filter(f=>f.endsWith('.html')).length,62);
assert.ok((await file('health.html')).includes('exp-menstrual-changes-observation-guide'));
assert.ok((await file('activities.html')).includes('notice-popupasia-2026'));
const normal=await readFile('dist-qa/city.html','utf8');
for(const c of city)assert.ok(!normal.includes(c.name),'default QA must not leak '+c.id);
console.log('✔ 六縣市15筆具體官方服務入口在62篇隔離版可使用；時效公告未混入，原QA不受影響');
