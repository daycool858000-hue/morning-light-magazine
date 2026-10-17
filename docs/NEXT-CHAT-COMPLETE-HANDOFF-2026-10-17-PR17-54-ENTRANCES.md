# 《由己 SELF-AUTHORED》｜2026-10-17 新視窗完整交接｜PR #17 已完成待整合

> 致下一個 ChatGPT 視窗：此為2026-10-17臺灣時間的完整承接資訊，**先實際讀 GitHub 最新檔案／PR／CI，再開始工作**。站主是網站擁有人與內容最終決策者；ChatGPT負責事實查核、專業技術驗收、內容排序、風險分級、與Claude工程指令；Claude Code負責具體GitHub工程。站主不必逐一閱讀程式碼或重複開33條已測網址。

## 一、網站定位與不可變更決策

- 正式名稱 **由己 SELF-AUTHORED**；既有公開QA網站：https://daycool858000-hue.github.io/morning-light-magazine/；GitHub：https://github.com/daycool858000-hue/morning-light-magazine 。
- 網站公開免費、非營利、單向靜態資訊導航／女性與一般成人生活知識雜誌；**不登入、不向訪客收集個資、不承接申訴、求助個案、預約、諮商、付款、表單或轉介個案**。本站幫讀者看懂內容與尋找原始來源，正式機關外站可能自行要求資料或登入。事前合理查核與風險標示，不承諾承擔第三方所有結果。
- 六類固定不擴設：生活與家庭、職涯與創業、身心健康、法律與權益、城市與福利、學習與活動。
- 雙目錄 **讀利專欄** `quiet-power.html`＝實用資訊；**向光** `toward-light.html`＝成人探索、文化、藝術、開放學習。文章可在不同主題被引用但不得重複複製正文。向光是有實質原創內容，不是只放相關連結。
- 風格暖米白、陶土橘／琥珀棕、低飽和鼠尾草綠、成熟編輯雜誌感；手機優先。既有六類頁、搜尋、讀利、向光、小日曆、活動頁與圖示不要重新設計。小日曆約3秒浮現、全站常駐、進入活動頁，必須避開可點文字；不佔大量版面。
- 官方與民間資源可並列，但清楚標明機關性質與用途。一般入口只放**1–2個貼合主題的具體原頁連結＋原有短說明**；只有複雜制度補1句必要提醒。不必為每個入口寫長文章或放資源大卡；不得用部會首頁敷衍或留下「官方入口整理與查核中」的空白，無準確來源時如實標示限制。避免過期招生資訊與浮誇免費保證。
- 第一階段以可驗事實與非政治性活動為主，不做女性歷史人物、政治動員或責任歸屬評論；不使用外部機構Logo與未授權圖片／長文，沿用原創圖示。
- 不修改 `content/release-approvals.json` 或擅改「已確認」狀態；AI查原始來源、站主限定的內容發布核准、人工逐頁核對是三種不同證據。QA已公開、被搜尋引擎noindex並不表示私密，也不等於正式發布核准。

## 二、2026-10-17當前分支與真實發布狀態

- `main` 保有原有36篇及部分限定核准機構資料；不可因要部署QA就把所有候選合入main。
- **公開QA分支** `qa/public-nine-articles-20261017` 最新 **`15a46217e0e62c7a5636424d6b39c2299e7cbcde`**。現有網站仍**45篇（原36＋擴充9；讀利26、向光19）**，曾經站主同意公開試讀、保留noindex和「未核准測試內容」。網站網址即上方GitHub Pages。
- **PR #17** https://github.com/daycool858000-hue/morning-light-magazine/pull/17 ，工程分支 `claude/morning-light-qa-integration-kd06lm`，head **`2a0838cfc94aaca4a8c23cf421c61d7bf9ea5646`**，base是上述QA，draft未合併，這是**44篇的新建置結果，尚非目前線上網站**。四工程：①撤站主指定的exp-12（讀利26、向光18），禁重新匯入；②小日曆遮擋連結修復；③完整沿用PR#15孕產入口；④59筆查核狀態改為三層QA可讀文字。最後CI push **39009405486**、PR **39009408263** 都成功，各有test及calendar job；上一次 **39008617989／39008621595**亦成功。npm test 215項；calendar Chromium/WebKit各16項；孕產 Chromium/WebKit四寬度各48項；部署前否定式`! grep`已加真正fail gate。**PR17一併更改了QA部署workflow，合入QA分支將直接公開部署，未經站主明確同意禁止合併。**
- **PR #15** https://github.com/daycool858000-hue/morning-light-magazine/pull/15 ，head `7c921a59bdb7015fd9a17300a8b6822a4a94db27`，已被PR17完整沿用：生活與家庭 `#pregnancy`→`#pregnancy-guide`四段、9正式機關原頁與搜尋、法權／育兒津貼／托育站內互連；2026年合計補足每胎10萬元依保險身分與現行規定，不得誤寫額外每人領10萬元。PR15仍是草稿且不可再與PR17重複部署。
- **PR #16** https://github.com/daycool858000-hue/morning-light-magazine/pull/16 ，工程分支 `claude/verified-all-54-topic-guides-20261017`，head **`4e402634cfade641bd928f87dd5e18fcbbb37f80`**，draft未合併，來源是**舊45篇QA**。全54索引：11個已有正確內容不改、4個只補1筆對應官方入口、39個空白／過於籠統／用途不符者補1–2筆原頁；12條混淆提醒。獨立`dist-qa-topic54`暫存、不碰正式QA；最後普通CI／外連抽核有成功紀錄（可核run 39006712751／39006712817），35個不同新URL，美國Chromium 29可開、6海外受阻、0確定404。**整合必須以PR17的44篇工程作為最新基礎，只帶PR16的最小索引差異，絕不可把整條45篇舊分支覆蓋掉exp-12撤稿、孕產與新日曆。**
- **PR #11** https://github.com/daycool858000-hue/morning-light-magazine/pull/11 ，編輯分支 `editorial/youji-full-six-topics-expansion-20261016`，**最近確認head `3114603302f4e573abbd0a76d40c683cc22a3c9c`**，草稿不併main。它是查核、文章權威稿、所有歸檔的主要基地；不應整個研究分支當成可上線工程。
- 所有上述PR截至交接**均未合併**，公開QA仍45篇、main也未改release核准。工程CI通過不等於站主視覺驗收、內容審閱或授權部署。

## 三、站主已確認的文章與外部連結取捨

- **exp-12**〈同一個生活實驗，換了條件，結果還能直接比較嗎？〉站主已決定撤稿，非文章事實錯誤。PR17透過`docs/QA-EXPANSION-IMPORT-QUEUE.json`、`scripts/lib/qa-expansion.mjs`、`docs/QA-EXP-12-OWNER-WITHDRAWAL-2026-10-17.md`下架及禁止自動重新匯入，保留研究與歷史。**合併部署前網站仍45篇**。
- **B04** `https://startup.sme.gov.tw/home/modules/news/detial.php?sId=1343`，2021年舊創業公告引用：**移除**；已在PR#11 `docs/BATCH4-ART-CULTURE-INSURANCE-CASHFLOW-DRAFTS-2026-10-16.md`實際刪掉該引用，但尚未同步到QA文章。
- **B11** `https://law.moea.gov.tw/LawContent.aspx?id=GL000482`：**保留**。《服飾標示基準》仍是洗標與成分文章重要法規原頁，2023-05-18生效，不是泛泛經濟部首頁。
- **C02** `https://digitalarchive.npm.gov.tw/Collection`：**保留**，保留〈在家也能逛故宮？從線上典藏開始看一件文物〉整篇及其一個必要文物搜尋入口，不新增多餘大資源卡。
- **C03** `https://digitalarchive.npm.gov.tw/opendata/`：**移除**，相應CC0／CC BY 4.0等依該頁判定的細節精簡為「欣賞圖片不代表可任意轉載」，權威編輯原稿已在PR#11實際修改；**尚未進QA**。
- **E01** `https://www.ntsec.gov.tw/article/FileAtt.ashx?id=6193` 為exp-12相關科教館PDF附件，站主**沒點、也不必點**，跟exp-12正式撤除QA時一併沒有公眾引用。
- 這些決策**已獲站主明確同意，不得再問她是否撤故宮整篇、再測E01或是否保留B11**。原始紀錄：`docs/QA-LINKS-B04-B11-C02-C03-EDITORIAL-DECISIONS-2026-10-17.md`，最新段落優先於歷史待決敘述。

## 四、全站核查、33個連結臺灣端測試、歸檔證據

- 2026-10-17對公開QA的**62個實際HTML頁**查出**1,305處站內連結／錨點**，沒有已確認錯誤檔案或錨點；外部**177不同原網址／337次引用**，GitHub美國Chromium **143正常、30海外受阻或逾時、3錯誤／拒絕頁、1附件下載型、0明確404/410**。成功run **39008335766**（隔離分支`audit/qa-site-wide-readiness-20261017`）。詳細177條歷史機器證據永久保存 `docs/SITE-AUDIT-2026-10-17-177-ACTUAL-QA-OUTBOUND-URL-RESULTS.json`。
- **之後站主已親自用台灣端裝置打開30+3共33條，全部能點開**！歸檔 `docs/SITE-AUDIT-2026-10-17-OWNER-33-LINKS-LOCAL-RETEST.json`。**禁止再要求站主重測這33個網址**。原GitHub海外阻擋紀錄留存但不再視為站主連線故障；站主說「可點開」**並不表示她逐字檢查內容、金額、資格、營運或核准正式發布**。
- PR#17查核標示清單 **59筆＝③21、②35、①3**。③16筆基本資源＋4條110/119/113/1925專線＋1條110簡訊通過既有「限定範圍發布核准＋AI查入口」，仍**不等於人工逐頁核對**；②23筆縣市QA＋9筆開放資源＋3筆英文／多語已AI來源核對但尚無站主發布核准；① `mohw-sps`、`sfaa`、`video-110` 舊資料顯示缺明確來源核對。**最新站主33網址可開**含前兩站應記為「連線可用的新證據」，但要先由AI核實內容用途再考慮是否由①改為②，**不能直接當③發布核准**；`video-110`仍須正式來源查核。PR#17只更新QA可讀標示，底層`status`和`release-approvals.json`未改。
- 22縣市**都有部分地方服務研究、合計60個獨立官方候選URL**，但五層（主管機關、婦女中心、家教、職涯／長照／法扶、新住民）全覆蓋 **0／22**。13個新住民／多語候選尚未啟用QA及未核准。60條新候選不是60張公開卡；目前資源基底**50筆＝18＋23＋9**，另3個英文資源與專線／管道等；22篇擴充候選中**原先9篇入QA**（exp12撤稿後8），另**13篇未上線**但已有各篇AI第一手來源複核，不要將其一鍵上線。
- 城市高風險待查：屏東女性夢想館營運狀態、臺東2026新住民中心承辦變更、高雄過時2022資訊、澎湖與金門多語PDF真實附件等。不能說22縣所有服務查完、所有據點正在營業。
- 6筆有期限具體活動、12筆長期官方活動查詢（對首頁／分類重用11條文字入口＋1張既有卡），要依臺灣日期處理過期，不能說每場活動免費或可報名；2027計畫公告不等於報名已開。
- 9張既有原創概念圖片為限定範圍已核准，第10張`article-how-to-use`是可選照片、未補不應阻礙公開。禁止使用各單位商標／圖片全文而無授權。
- 隱私文案`content/pages/privacy.md`說「預計透過GitHub Pages」時態過時，現在已有公開QA，需要只校正QA描述（正式版是否上線另說），不要加過度「絕對無紀錄」的承諾。
- 既有安全是靜態、無站內註冊與用戶資料庫、外部頁原始HTTPS；GitHub Pages等第三方可能有其技術記錄；品牌`SELF-AUTHORED`商標初查與正式法律確定性不能誤說已註冊／已排除風險。

## 五、全站歸檔文件（PR#11目錄docs）

1. `SITE-WIDE-PREPUBLICATION-COMPREHENSIVE-AUDIT-2026-10-17.md` 全站總查核／最後「子」節是33筆站主實測最新狀態。
2. `SITE-AUDIT-2026-10-17-ARTICLES-36-PLUS-22-REGISTRY.json` 36原文、22候選全體索引。
3. `SITE-AUDIT-2026-10-17-54-TOPICS-50-RESOURCE-CARDS.json` 54入口、50資源卡及原始核准比對。
4. `SITE-AUDIT-2026-10-17-CITY-MULTILINGUAL-ACTIVITIES-ASSETS-REGISTRY.json` 22縣60URL、新住民13、活動、語言、圖片。
5. `SITE-AUDIT-2026-10-17-177-ACTUAL-QA-OUTBOUND-URL-RESULTS.json` 177條實際URL原始CI證據。
6. `SITE-AUDIT-2026-10-17-OWNER-33-LINKS-LOCAL-RETEST.json` 33條站主可打開的回報。
7. `ALL-54-TOPIC-ENTRANCES-FULL-CHECK-AND-PUBLISHING-GAPS-2026-10-17.md` ＋`ALL-54-TOPIC-ENTRANCES-ALIGNMENT-AND-SOURCE-AUDIT-2026-10-17.json`。
8. `QA-LINKS-B04-B11-C02-C03-EDITORIAL-DECISIONS-2026-10-17.md` 與`IPHONE-TEST-30-OVERSEAS-BLOCKED-3-ERROR-1-PDF-2026-10-17.md`（後者是歷史測試表，33連線已完成）。
9. `EXPANSION-REMAINING-13-ARTICLES-EDITORIAL-REVIEW-INDEX-2026-10-17.md`、`CITY-22-COUNTIES-SERVICE-DEPTH-TRACKER-2026-10-16.md`及四批城市原始JSON。
10. PR#17自己的`docs/QA-INTEGRATION-ROUND1-FEEDBACK-REPORT-2026-10-17.md`、`docs/QA-EXP-12-OWNER-WITHDRAWAL-2026-10-17.md`、`docs/QA-REVIEW-STATUS-LABEL-INVENTORY-2026-10-17.md`與`CLAUDE.md`已由Claude更新。
11. PR#16 `docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json` 是索引具體直接入口的候選資料，**不是已公開QA**。

## 六、下一視窗收到後的工程與編輯順序

**A. 先查實際最新版** PR#17、PR#16、PR#11、QA head、全部CI、相關文件；上一位ChatGPT已查PR17最新CI（2026-10-17 14:51 台灣前後） push `39009405486` / PR `39009408263`皆success，Chromium/WebKit實際小日曆遮擋0；已查看390px「勞保局生育補助」左右對照圖，改後小日曆不蓋文字。勿在沒檢查分支狀態前對使用者宣稱已部署44篇。

**B. 準備下一批給Claude Code的**「整批整合工程」：從PR#17最新44篇工程基礎建立新獨立整合分支，**不要直接以PR#16舊45篇覆蓋**。精準移植PR#16（11不改、4添一條、39修正、12短提醒），**孕產PR#15專屬四段指南優先保留**；將PR#11原稿修改的B04（2021過時引用）與C03（Open Data及過度技術性授權段落）同步到真正會生成QA的文章資料，保留B11法規、C02典藏搜尋與故宮全文，exp12繼續強制撤稿。視需要納入隱私頁時態勘誤。更新測試斷言、檢查全部54錨點、文章44數／讀利26向光18、搜尋、活動、小日曆、手機320/375/390/1280和WebKit、站內對外連結、QA隔離、release核准sha、original36其餘逐位元組不變。**新分支PR草稿，不合併、不部署。**
 
**C. PR#17這四任務的工程品質已初步通過，可先單獨邀站主決定是否將「撤稿＋日曆＋孕產＋查核標示」更新**公開QA，或待54入口/B04/C03同一批整合後只部署一次。以站主意願為準，**任何PR合入QA會觸發真實部署，需明確授權**，切勿自行合併main或更改release快照。若使用者更在意一次整合，優先一次上最新版。
 
**D. 出具精確「正式公開適用範圍」核准清單**：哪些可納入第一期（經實際核對來源且用途合適的具體原始入口、已通過內容審核的文章）、哪些仍QA未核准、哪幾個具有真實證據風險／需要站主決定。不要要求站主手動逐頁打33個網址，AI負責來源內容交叉核對；不因60個地方候選及13篇未上線內容沒完，就無限阻擋已合格範圍的公開。站主明確發布授權仍必須取得。
 
**E. 尚可深化研究但不阻擋QA的事項**：22縣實際中心與婦女培力、13新住民多語頁、未上線13篇AI來源驗證的受阻深層頁、商標初查與後續可維護性、2027活動時效監控。

### Claude指令固定格式（重要）

每一份真正要給Claude Code直接複製的完整指令，**第一行必須逐字是**：
`先讀 CLAUDE.md`

**最後一行必須逐字是**：
`如果需要其他檔案才能完成，可以自己去讀，但不要整個專案都讀`

兩者之間寫清：網站宗旨和只補有問題的入口、PR17/PR16差異、B04/B11/C02/C03決策、33筆已測勿重問、QA44篇＋禁止重新匯入、檔案／測試／草稿PR交付、不得部署與不得修改release。每次依最終工程狀態撰寫，不用整個專案重新掃一遍，不要叫Claude自行加主題、寫新文章或擅改36原稿。
