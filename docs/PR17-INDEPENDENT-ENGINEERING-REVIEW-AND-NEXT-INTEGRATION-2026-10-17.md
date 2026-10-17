# PR #17 第一輪QA整合｜ChatGPT獨立程式與發布閘門驗收

**2026-10-17，ChatGPT AI獨立審查；審查範圍是工程分支，不等於站主正式發布核准。**

## GitHub核對的確切版本

- [PR #17](https://github.com/daycool858000-hue/morning-light-magazine/pull/17) 草稿，未合併，base `qa/public-nine-articles-20261017` SHA `15a46217e0e62c7a5636424d6b39c2299e7cbcde`，head `2a0838cfc94aaca4a8c23cf421c61d7bf9ea5646`。目前公開QA分支**仍是45篇原版**；PR17生成的44篇只在獨立待合併版本，不可對站主稱網站已撤稿。
- head `2a0838c` 最新 GitHub Actions push `39009405486`／PR `39009408263`均 `completed/success`；其中 `test`和`calendar`兩個工作皆success。舊工程 `9145c11`也成功，不依賴Claude報告聲稱。
- 從 `calendar`原始log確認Chromium／WebKit四寬度320／375／390／1280，各16項，WebKit 0文字遮擋，附前後兩欄實際截圖 `docs/qa-media/calendar-avoid-2026-10-17/calendar-390-pregnancy-labor-insurance-before-after.png`；左側舊圖蓋住「補助」，右側新圖正常，日曆仍可見且常駐。WebKit不是只寫測試檔，確實在CI上執行。
- 從`test` job原始log確認WebKit孕產四寬度各48項全過，原有QA瀏覽測試28項全過、沒有JS錯誤。Claude本機`npm test`報215項，經現有主CI success佐證。
- 撤稿`exp-12`被設 `importToQa:false`+`qaWithdrawal.doNotReimport:true`，`scripts/lib/qa-expansion.mjs`直接拒絕撤稿被擅自再開；新部署預檢明確要求44篇、讀利26／向光18，舊文章檔案／搜尋／目錄不存在。QA workflow現在更正`! grep`後附`|| exit 1`，防止錯誤殘留被放行。
- 正式發布核准檔沒改，main、production HTML沒動，QA新增的三層查核說明只改畫面文字而沒竄改`status`。59筆分21既有有限核准（16基礎機構＋4專線＋110簡訊）、35筆AI官方來源初核但站主未逐頁內容審核、3筆無完整原頁查核（mohw-sps、sfaa、video-110）。`mohw-sps`、`sfaa`的**網站連結已在站主33筆臺灣端可點開回報之內**，故不可再要求她測網址；這只能證實可開而不是補成「AI已逐頁查核內容」。
- PR17沒有新增其他13篇、60地方候選或變更`content/release-approvals.json`。部署工作流程只對QA分支的檔案更動觸發，但**PR17一旦合併QA，就可能立即公開部署**，必須再次先獲站主明確授權。

## 獨立驗收結論

**PR17本批四項工程可通過獨立工程驗收**（撤稿、日曆、孕產、查核顯示），且最新commit的CI也已成功。但在站主先前要求的「所有入口修補及過時來源刪留」尚未合併之前，**不建議立刻合併PR17更新公開QA**；建議一次完成下一批後整合部署，以免站主反覆看尚有17個空白入口的網站。

## 必須接續、不重複開發的下一批

1. **PR #16（草稿 `claude/verified-all-54-topic-guides-20261017`，`4e402634`）**：54主題中11保持、4個增補、39個調整直達原頁、12句必要說明。這批建於舊45篇QA分支，**禁止直接整個分支覆蓋PR17的新44篇**；從PR17新分支開一個整合分支，僅移植PR16的資料、QA專用載入／生成和必要CSS、測試。尤其避免與PR17在`scripts/build.mjs`、`src/assets/css/main.css`、`package.json`的衝突；孕產題01優先採PR17既有四段9連結，不改回「整理中」。
2. **B04/C03編輯取捨已由站主明確決定**：B04 2021舊創業公告 `https://startup.sme.gov.tw/home/modules/news/detial.php?sId=1343`移除；C03故宮OpenData `https://digitalarchive.npm.gov.tw/opendata/`移除，並精簡文中的CC0／CC BY技術細節；**C02故宮典藏檢索保留，B11服飾標示法規保留，故宮文章保留**。權威修改在PR11的 `docs/BATCH4-ART-CULTURE-INSURANCE-CASHFLOW-DRAFTS-2026-10-16.md`；需將這兩處原稿差異同步到最後QA建置，並加回歸測試保證B04/C03不再從文章原稿返回。只改所需最小篇幅，不重寫36篇全文。
3. **站主33筆臺灣端可點開紀錄**：`docs/SITE-AUDIT-2026-10-17-OWNER-33-LINKS-LOCAL-RETEST.json`。30項GitHub美國機房曾受阻、3項錯誤頁，站主回報在她裝置上全部可點開。**不用再要求她重新測33筆，也不得因此偽稱她逐字審核頁面**。E01科教館PDF為exp12源，站主未測，隨撤稿移除引用。
4. **只在新44篇最終QA整合版本做一次完整站內＋外連**：參考只讀爬蟲`audit/qa-site-wide-readiness-20261017`，上輪62HTML、1305站內錨點、177外連0明確斷鏈（run39008335766），但那是舊45篇版本。新入口的35個外部URL先前29開、6海外受阻，不能誤用站主對舊33網址的回報覆蓋新網址；確實仍有當期來源疑慮者列獨立例外，不設無限人工逐頁複查要求。
5. 不改原36篇未涉及B04/C03部分的正文，讀利／向光保持26／18、網站六大類及成人向光入口不重設；不新增大型卡，不把網站變成需要代辦服務或資料收集的平台。
6. QA-only繼續noindex／未核准提示；正式核准不動、main不合併、GitHub Pages不自行部署。最終報分支、SHA、CI、各項變更、可測網址和例外給ChatGPT＋站主審核後決定。

## 其他尚未解決的整站事項（和這批工程區分）

- 22縣市60個服務研究原頁尚非每縣完整五層查核；13新住民候選與13未QA文章仍只在編輯研究。
- 先前總查核記載`content/pages/privacy.md`的「預計GitHub Pages」舊時態；可在最後QA修訂改成現行代管說明，但不能偽稱正式內容已核准。
- 3項QA的`待查核`是來源詳細查核資格不足，不等於連結都打不開；可僅補一行說明，不擅自改狀態。
- 正式發布門檻：先完成最新版QA整合，再由站主實際手機試讀與明確批准該批公開QA，之後另討論正式版本的發布範圍。CI綠燈和資料已歸檔不是正式核准。
