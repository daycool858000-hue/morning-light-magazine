// 54主題的最小修補：已正確的舊入口不改，缺漏／不精確的補1-2筆，必要時加一句。
// 只測獨立候選暫存版，完成不等於站主核准公開QA。
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>readFile(path.join(ROOT,p),'utf8');
const data=JSON.parse(await read('docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json'));
const cats=JSON.parse(await read('content/categories.json'));
const expected=cats.flatMap(c=>c.topics.map(t=>t.id));
const guidemap=Object.fromEntries(data.topics.map(x=>[x.id,x]));
let count=0;
const check=(label,ok)=>{count++;assert(ok,label);console.log('✔ '+label)};
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const topicArea=(html,id)=>{
 const needle='<li class="topic" id="'+id+'">';
 const start=html.indexOf(needle);
 if(start<0)throw Error('缺錨點 '+id);
 const next=html.indexOf('<li class="topic" id=',start+needle.length);
 const end=html.indexOf('</ol>',start);
 return html.slice(start,next<0?end:Math.min(next,end));
};

check('54主題、原始索引與新資料一對一',expected.length===54 && data.topics.length===54 &&
 new Set(data.topics.map(t=>t.id)).size===54 && expected.every(id=>guidemap[id]));
check('AI編輯資料仍未核准公開QA及正式發布',data.ownerApproved===false &&
 data.importToPublicQa===false && data.productionApproved===false);
check('連結有機關名稱、實際用途與原始HTTPS網址',data.topics.every(t=>t.links?.length>=1 &&
 t.links.every(l=>/^https:\/\//.test(l.url)&&l.name&&l.agency&&l.purpose)));
check('只對容易混淆的12項加一句',data.topics.filter(t=>t.clarification).length===12);
const modes=data.topics.reduce((o,t)=>(o[t.displayMode]=(o[t.displayMode]||0)+1,o),{});
check('已適合的11項保留，另4項補一個直達入口、39項修正或填空；孕產仍由PR15處理',modes.keep===11&&modes.supplement===4&&modes.replace===39);

let guard=false;
try{execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out=dist-qa'],{
 cwd:ROOT,env:{...process.env,QA_TOPIC_GUIDES_STAGING:'1'},stdio:'pipe'
})}catch(e){guard=String(e.stderr||'').includes('54入口尚未核准公開QA')}
check('未經同意的新候選禁止直接輸出到公開QA資料夾',guard);

execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out=dist-qa-topic54'],{
 cwd:ROOT,env:{...process.env,QA_TOPIC_GUIDES_STAGING:'1'},stdio:'inherit'
});

let preserved=0,repaired=0,shownLinks=0,notes=0;
for(const cat of cats){
 const current=await read('dist-qa/'+cat.id+'.html');
 const candidate=await read('dist-qa-topic54/'+cat.id+'.html');
 check(cat.title+'所有原有錨點及主題說明仍在',cat.topics.every(t=>
 candidate.includes('id="'+t.id+'"')&&candidate.includes('<p>'+escape(t.text)+'</p>')));
 check(cat.title+'39項待補主題不再顯示空白；孕產交由PR15避免重複',cat.topics.filter(t=>t.id!=='pregnancy').every(t=>!topicArea(candidate,t.id).includes('官方入口整理與查核中')));
 for (const t of cat.topics){
  const row=guidemap[t.id],before=topicArea(current,t.id),after=topicArea(candidate,t.id);
  if(row.displayMode==='keep'){
   if(before!==after)throw Error('原本正確的入口被更動 '+t.id);
   preserved++;
   continue;
  }
  if(row.displayMode==='replace' && after.includes('官方入口整理與查核中。'))
    throw Error('應修補的入口仍是整理中 '+t.id);
  for(const link of row.links){
   if(!after.includes('href="'+escape(link.url)+'"')||!after.includes(escape(link.name)))
    throw Error('缺入口原網址 '+t.id+' '+link.url);
   shownLinks++;
  }
  if(row.clarification){
   if(!after.includes(escape(row.clarification)))throw Error('缺必要的制度提醒 '+t.id);
   notes++;
  }
  repaired++;
 }
}
check('11個已合適的入口原HTML片段完全不變',preserved===11);
check('43項精確改善（39修補、4補充），原有主題文案保留',repaired===43 && shownLinks>=43);
check('12條必要提醒只出現在修補主題',notes<=12 && notes>=10);
const old=(await readdir(path.join(ROOT,'dist-qa/articles'))).filter(x=>x.endsWith('.html')).sort();
const now=(await readdir(path.join(ROOT,'dist-qa-topic54/articles'))).filter(x=>x.endsWith('.html')).sort();
check('原有文章未增減、未替換內文',JSON.stringify(old)===JSON.stringify(now)&&
 (await Promise.all(old.map(async f=>(await read('dist-qa/articles/'+f))===(await read('dist-qa-topic54/articles/'+f))))).every(Boolean));
for(const name of ['quiet-power.html','toward-light.html','search.html']){
 check(name+'原樣保留',(await read('dist-qa/'+name))===(await read('dist-qa-topic54/'+name)));
}
check('候選網站不發布到正式版',!(await read('dist-production/assets/data/search-index.js')).includes('qa-topic54'));
console.log('54主題入口最小修補 '+count+' 項驗收通過：保留'+preserved+'，補'+repaired+'，顯示'+shownLinks+'個直達網址。');
