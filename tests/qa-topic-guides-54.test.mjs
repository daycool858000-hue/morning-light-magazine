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
check('婦女中心單一地方頁標為高雄地方示例，不冒充全國名錄',guidemap['women-centers'].links[0].name.includes('地方服務示例') && guidemap['women-centers'].caution.includes('高雄'));
check('更年期衛教資料不混用未核實的年份',!/(?:2017|2024|2025)年/.test([guidemap.hormones.links[0].purpose,guidemap.hormones.links[0].evidenceType,guidemap.hormones.caution].join(' ')));
check('只對容易混淆的12項加一句',data.topics.filter(t=>t.clarification).length===12);
const modes=data.topics.reduce((o,t)=>(o[t.displayMode]=(o[t.displayMode]||0)+1,o),{});
check('已適合的11項保留，另4項補一個直達入口、39項修正或填空；孕產仍由PR15處理',modes.keep===11&&modes.supplement===4&&modes.replace===39);

let guard=false;
try{execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out=dist-qa'],{
 cwd:ROOT,env:{...process.env,QA_TOPIC_GUIDES_STAGING:'1'},stdio:'pipe'
})}catch(e){guard=String(e.stderr||'').includes('54入口尚未核准公開QA')}
check('未經同意的新候選禁止直接輸出到公開QA資料夾',guard);

// 基準版：與公開 QA 相同設定（44 篇、孕產閱讀區），另建資料夾比對，不受前面測試改寫 dist-qa 影響。
const {QA_TOPIC_GUIDES_STAGING:_omit,...baseEnv}=process.env;
execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out=dist-qa-topic54-base'],{
 cwd:ROOT,env:baseEnv,stdio:'inherit'
});
execFileSync(process.execPath,['scripts/build.mjs','--mode=qa','--out=dist-qa-topic54'],{
 cwd:ROOT,env:{...process.env,QA_TOPIC_GUIDES_STAGING:'1'},stdio:'inherit'
});

let preserved=0,repaired=0,shownLinks=0,notes=0,retainedTopics=0,retainedAnchors=0;
for(const cat of cats){
 const current=await read('dist-qa-topic54-base/'+cat.id+'.html');
 const candidate=await read('dist-qa-topic54/'+cat.id+'.html');
 check(cat.title+'所有原有錨點及主題說明仍在'+(cat.id==='life-family'?'（主題 01 沿用 PR #17 孕產導覽）':''),cat.topics.every(t=>
 candidate.includes('id="'+t.id+'"')&&(t.id==='pregnancy'||candidate.includes('<p>'+escape(t.text)+'</p>'))));
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
  // 23個已有站內資源的主題：新外部連結只能補充，不能刪去原有 #res- 錨點。
  if(row.displayMode==='replace'){
    const internalLinks=[...before.matchAll(/href="#res-[^"]+"/g)].map(m=>m[0]);
    if(internalLinks.length){
      for(const href of internalLinks){
        if(!after.includes(href))throw Error('原有站內機構跳轉被移除 '+t.id+' '+href);
        retainedAnchors++;
      }
      retainedTopics++;
    }
  }
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
check('原有23主題的站內資源跳轉均未被新的外部直達入口取代',retainedTopics===23 && retainedAnchors>=23);
check('11個已合適的入口原HTML片段完全不變',preserved===11);
check('43項精確改善（39修補、4補充），原有主題文案保留',repaired===43 && shownLinks>=43);
check('12條必要提醒只出現在修補主題',notes<=12 && notes>=10);
const old=(await readdir(path.join(ROOT,'dist-qa-topic54-base/articles'))).filter(x=>x.endsWith('.html')).sort();
const now=(await readdir(path.join(ROOT,'dist-qa-topic54/articles'))).filter(x=>x.endsWith('.html')).sort();
check('原有文章未增減、未替換內文',JSON.stringify(old)===JSON.stringify(now)&&
 (await Promise.all(old.map(async f=>(await read('dist-qa-topic54-base/articles/'+f))===(await read('dist-qa-topic54/articles/'+f))))).every(Boolean));
for(const name of ['quiet-power.html','toward-light.html','search.html']){
 check(name+'原樣保留',(await read('dist-qa-topic54-base/'+name))===(await read('dist-qa-topic54/'+name)));
}
// 與 PR #17 新版相容：44 篇、exp-12 撤稿、孕產閱讀區、小日曆仍在且未被覆蓋。
check('文章維持 44 篇且 exp-12 仍撤稿',now.length===44 && !now.some(f=>/exp-compare-everyday-experiments|exp-reading-popular-science/.test(f)) && !(await read('dist-qa-topic54/assets/data/search-index.js')).includes('exp-compare-everyday-experiments'));
const lf=await read('dist-qa-topic54/life-family.html'),lfBase=await read('dist-qa-topic54-base/life-family.html');
const pregSec=h=>{const a=h.indexOf('<section class="section preg-guide"');return a<0?'':h.slice(a,h.indexOf('</section>',a))};
check('懷孕與生育閱讀區與主題 01 原樣保留（PR #17 優先）',pregSec(lf)!=='' && pregSec(lf)===pregSec(lfBase) &&
 topicArea(lf,'pregnancy')===topicArea(lfBase,'pregnancy'));
check('小日曆腳本與入口仍在各主題頁',lf.includes('class="act-entry') && lf.includes('qa-calendar.js'));
check('其他主題頁也保留小日曆',(await Promise.all(cats.map(async c=>(await read('dist-qa-topic54/'+c.id+'.html')).includes('qa-calendar.js')))).every(Boolean));
check('未核准測試內容標示與 noindex 仍在',lf.includes('未核准測試內容') && lf.includes('noindex'));
const search=await read('dist-qa-topic54/assets/data/search-index.js'),searchBase=await read('dist-qa-topic54-base/assets/data/search-index.js');
check('搜尋索引未因54入口改變（不新增、不刪除文章）',search===searchBase);
for(const [p,re] of [['dist-production','qa-topic54'],['dist','qa-topic54']]){
 const html=(await readdir(path.join(ROOT,p))).filter(f=>f.endsWith('.html'));
 const hit=(await Promise.all(html.map(async f=>{const h=await read(p+'/'+f);return data.topics.some(t=>t.clarification&&h.includes(escape(t.clarification)))||h.includes('topic-guide-links')}))).some(Boolean);
 check(p+' 未出現54入口候選連結或提醒',!hit);
}
check('候選網站不發布到正式版',!(await read('dist-production/assets/data/search-index.js')).includes('qa-topic54'));
console.log('54主題入口最小修補 '+count+' 項驗收通過：保留'+preserved+'，補'+repaired+'，顯示'+shownLinks+'個直達網址。');
