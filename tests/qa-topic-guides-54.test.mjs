// 54索引完整映射與未核准內容隔離；CI成功不代表站主已審閱或准許公開QA。
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>readFile(path.join(ROOT,p),'utf8');
const data=JSON.parse(await read('docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json'));
const categories=JSON.parse(await read('content/categories.json'));
const expected=categories.flatMap(c=>c.topics.map(t=>t.id));
let count=0;
function check(label,condition) { count++; assert(condition,label); console.log('✔ '+label); }
check('6類、54主題、每個獨一ID',categories.length===6 && expected.length===54 && data.topics.length===54 &&
 new Set(data.topics.map(t=>t.id)).size===54 && expected.every(id=>data.topics.some(t=>t.id===id)));
check('全體54入口都具具體用途與機關連結',data.topics.every(t=>t.intro?.length>12 && t.caution?.length>8 && t.links.length>=1 &&
 t.links.every(l=>l.url.startsWith('https://') && l.agency && l.purpose)));
check('54入口仍屬未授權公開的AI編輯資料',data.ownerApproved===false && data.importToPublicQa===false &&
 data.productionApproved===false && data.topics.every(t=>t.ownerApproved===false));

const guardTest=()=>{
 try {
  execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out=dist-qa'],{cwd:ROOT,
    env:{...process.env,QA_TOPIC_GUIDES_STAGING:'1'},stdio:'pipe'});
  return false;
 }catch(e){return String(e.stderr||'').includes('54入口尚未核准公開QA')}
};
check('公開QA資料夾不得用未授權54入口直接建置',guardTest());

execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out=dist-qa-topic54'],{
 cwd:ROOT,env:{...process.env,QA_TOPIC_GUIDES_STAGING:'1'},stdio:'inherit'});
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let seen=0,linkCount=0;
for(const cat of categories){
 const html=await read('dist-qa-topic54/'+cat.id+'.html');
 const normal=await read('dist-qa/'+cat.id+'.html');
 check(cat.title+'仍沿用舊的主題索引錨點',cat.topics.every(t=>html.includes('id="'+t.id+'"')));
 check(cat.title+'無任何空白主題入口',!html.includes('<p class="pending">官方入口整理與查核中。</p>'));
 check(cat.title+'確實只增加QA導讀資訊',html!==normal);
 for (const t of cat.topics) {
  const g=data.topics.find(r=>r.id===t.id);
  if(!g || !html.includes(esc(g.intro)) || !html.includes(esc(g.caution)))throw new Error('缺用途、限制 '+t.id);
  for(const link of g.links) {
   linkCount++;
   if(!html.includes('href="'+esc(link.url)+'"') || !html.includes(esc(link.purpose)))
    throw new Error('缺原始網址或用途 '+t.id+' '+link.url);
  }
  seen++;
 }
}
check('54入口、全部連結原頁及用途文字呈現',seen===54 && linkCount>=54);
const sourceDir='dist-qa/articles',guideDir='dist-qa-topic54/articles';
const old=(await readdir(path.join(ROOT,sourceDir))).filter(x=>x.endsWith('.html')).sort();
const newer=(await readdir(path.join(ROOT,guideDir))).filter(x=>x.endsWith('.html')).sort();
check('任何原有文章不增減',JSON.stringify(old)===JSON.stringify(newer));
check('全部原有文章HTML逐位元組未改', (await Promise.all(old.map(async f=>
 (await read(sourceDir+'/'+f))===(await read(guideDir+'/'+f))))).every(Boolean));
for(const file of ['quiet-power.html','toward-light.html','calendar.html','search.html']){
 const a=await read('dist-qa/'+file).catch(()=>null),z=await read('dist-qa-topic54/'+file).catch(()=>null);
 if(a!==null||z!==null)check(file+'未受54入口改動',a===z);
}
const before=await read('dist-production/assets/data/search-index.js');
check('production索引沒有54入口候選標記',!before.includes('QA-TOPIC-ENTRANCES-54'));
console.log('54入口QA測試共 '+count+'項全部通過；'+linkCount+'筆有用途說明的連結由獨立暫存版呈現。');
