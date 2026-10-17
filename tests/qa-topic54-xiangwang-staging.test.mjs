#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
for(const p of ['index.html','toward-light.html']){
 const html=await readFile('dist-qa-topic54/'+p,'utf8');
 assert.ok(html.includes('向望'),'54主題隔離版的'+p+'缺少向望');
 assert.ok(!html.includes('>向光<'),'54主題隔離版的'+p+'出現已撤舊名稱');
}
assert.ok(!(await readFile('dist-qa/index.html','utf8')).includes('topic-guide-links'),'未核准主題不應進公開 QA 建置');
console.log('✔ 54主題隔離版沿用向望，公開QA原有建置不含候選入口');
