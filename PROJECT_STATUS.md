# PROJECT_STATUS｜由己 SELF-AUTHORED

> 更新：2026-10-18（臺灣）。**本檔僅位於 PR #19 正式發布準備 Draft 分支，尚未合併 main；不代表公開網站或核准檔已變動。** 技術發生衝突時，以 GitHub 實際 PR、提交、Actions 和站主驗收紀錄為準。

## 定位與不變原則
免費、非營利、原創的臺灣女性生活、權益、福利與學習資訊指南，六大主題固定；兩個閱讀專欄為 **讀利｜THE CONSIDERED PAGE**、**向望｜TOWARD OPEN SKIES**。無會員、無個資收集、不接單、不承接申請、諮商或個案，不做政治動員。官方資源只做導航，不代表與機關合作；不擅自使用機關 Logo、照片、文章全文。

## 分層狀態（不可混為一談）
| 項目 | 實際狀態／證據 |
|---|---|
| 公開網站 | **QA 測試版，不是正式發布**：https://daycool858000-hue.github.io/morning-light-magazine/。站主已於2026-10-18 iPhone 實際確認「向望」正確顯示。 |
| 已部署 QA 提交 | 分支 `qa/public-nine-articles-20261017`，SHA `1ded1bab63c0d84368bd2ad16ba9339d6514b6ff`；[手動 QA 部署 run 39072357272](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39072357272) success。 |
| 公開 QA 內容 | 44篇文章，讀利26／向望18；六分類、八索引、孕產四段、小日曆、6筆公開活動、12筆長期查詢入口；撤稿 `exp-12` 不可重新上架。 |
| main | 已合併 [PR #23](https://github.com/daycool858000-hue/morning-light-magazine/pull/23)，SHA `e190db07936de8a0b38c7372eb5ff344ffecd2ee`，只補手動 QA 觸發按鈕；**main 不是最新44篇正式可發布版本**。 |
| 54主題新入口 | [PR #24](https://github.com/daycool858000-hue/morning-light-magazine/pull/24) 以「向望」已驗收 QA 當基礎，隔離 staging；**未合併、未公開、未正式核准**。原 [PR #18](https://github.com/daycool858000-hue/morning-light-magazine/pull/18) 基於舊「向光」版且與 QA 有衝突，不可直接合併。 |
| 54主題詳細修正 | 2026-10-18 站主回報育兒津貼申辦候選網址不能公開使用／需要私人權限，已於 PR #24 提交 `c0194e3`：改回站內 `#res-sfaa` 官方機關入口、加制度提示；54總數不變，模式 keep12／supplement4／replace38。22個主題保留舊站內跳轉並加原頁，16個空白主題補入口。 |
| 54主題外部新連結 | 修改後 [Actions 39074828426](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39074828426) 成功：36個不同對外網址，31成功開啟、5阻擋／逾時、0明確404/410。機房超時**不等於網址失效**。整體 CI 與小日曆請以最新 PR #24 SHA 的 Actions 最終結論為準。 |
| 正式版工程 | 此 PR #19 維持 Draft；另 [PR #21](https://github.com/daycool858000-hue/morning-light-magazine/pull/21) 曾在舊正式分支上做更名，不能假設它等於現已部署 QA。正式版目前未部署。 |
| 既有內容核准 | `content/release-approvals.json` 已紀錄基本官方入口16、專線4、110 SMS 1及示意圖9的版本核准，**保留既有核准，不必重新逐項問站主**。 |
| 新正式發布核准 | `content/launch-approvals.json` 的 `approvedArticles`、`approvedFeatures` 仍空；QA 驗收和 AI 來源查核不能冒充正式版每筆版本簽核。 |
| 未公開候選 | 13篇來源已經過先前編輯與隔離測試但未上 QA；22縣市五層完整服務盤點仍0/22；地方與多語研究候選仍待分批檢查，不阻擋已確認主站內容整理。 |

## 2026-10-18 站主最新決定：全量首發（覆蓋本檔歷史的分批／縮量建議）
**首發不是縮水正式版。** 站主要求 44篇既有QA + 13篇未公開候選 + 2篇校園安全 + 3篇全新（市集、經期、更年期）**同次正式首發**；若稿件互相重複只能經編輯核實後合併，不能暗中縮減已同意範圍。按目前互不重複的計畫為至少62篇，其中 exp-07 睡眠稿包含在13篇內、不能重複加總。
同時必須具備54個主題、35筆新增官方資源（23地方＋9開放學習＋3多語，實際前台去重）、原有六大分類與兩專欄、小日曆、活動、城市與福利、既有已驗收功能。**2026-11-01～2027-12-31** 活動視窗涵蓋各式市集、展覽、文創手作、親子及大型展會等；已公布實際活動在期限後自動隱藏，長期官方入口保留，未公布日期不可猜。
這是明確「正式首發範圍批准／需求」，**不是對尚未完成文章版本指紋逐項簽核，也不是立即部署授權**。不得以「可先發布44篇，其他留下一版」代替站主這次要求。完整控制表：`docs/FORMAL-LAUNCH-FULL-SCOPE-OWNER-DECISION-2026-10-18.md`。

## 正式上線阻塞、責任分工
1. **不可直接合併舊 PR #18/#19/#21 進 main**：需以站主驗收的「向望」QA 為基準，逐項移植正式核准範圍。
2. **PR #19 的全有全無上線閘不符現況**：`scripts/assert-production-ready.mjs` 同時要求44篇、54新入口、35新增資源和5組功能全部核准。需改為「44篇經版本核准的原稿＋站主已同意且版本指紋相符的功能／資源」的具體核准範圍，不可為湊齊54/35自行批准。
3. 正式版必須保存目前公開 QA 44篇內容、動線與互動，不因上線成為縮水頁；`exp-12` 撤稿不可復活；正式版須驗證 sitemap、robots、noindex、404、備份／還原與手機頁面。
4. QA 和 production **共用 GitHub Pages URL**。維持 [PR #20](https://github.com/daycool858000-hue/morning-light-magazine/pull/20)＋PR #23 的手動部署安全鎖。任何正式切換需站主**另一次明確同意**，不能因本紀錄或 CI 綠燈就部署。
5. Claude Code 目前持有「上一視窗 PR #18」的交接上下文；下一項已準備交給 Claude 的範圍是 PR #24 隔離版 CI、預覽與必要 UX 交付。**不要重做54主題來源查找，也不要派 Claude 改 PR #19 正式上線工程**。
6. ChatGPT 負責發布範圍、核准流程、尚待查來源與正式版隔離整合；原有44篇和小日曆經站主確認的功能，不要求重新逐項審閱。

## 歷史與延伸
前期工程和決策記錄仍保留在 [PR #18](https://github.com/daycool858000-hue/morning-light-magazine/pull/18)、[PR #19](https://github.com/daycool858000-hue/morning-light-magazine/pull/19)、
`docs/FORMAL-READINESS-GATES-AND-REMAINING-CONTENT-2026-10-17.md`、
`docs/FORMAL-LAUNCH-2026-10-18-RECONCILIATION.md`、
`docs/QA-TOPIC54-CHILDCARE-ORIGINAL-ENTRY-2026-10-18.md`（PR #24）；
舊文件涉及「向光」、舊 HEAD 和舊部署方式的敘述均僅具歷史意義，**不可當最新狀態或重新部署依據**。

## 2026-10-18 直接實作的後續成果（全量首發草稿，仍未部署）
- 站主已確認**44+13+2+3篇完整首發**，54主題＋35新增正式來源入口、活動及既有功能不得縮減。發布工程正式模式最低62篇檢查：PR #19 `e31a785`，測試用44篇fixture保留。**只有完成逐原稿核准才正式發布**。
- [PR #11](https://github.com/daycool858000-hue/morning-light-magazine/pull/11) 新增完整原創初稿 `docs/EDITORIAL-FULL-LAUNCH-THREE-NEW-READINGS-2026-10-18.md`：創意市集、經期觀察、更年期生活3篇；提交 `e7cf074`，隔離候選未上QA、待查核/手機。
- [PR #11](https://github.com/daycool858000-hue/morning-light-magazine/pull/11) 的校園霸凌與校園性騷擾2篇稿在 `docs/EDITORIAL-CAMPUS-BULLYING-AND-GENDER-EVENTS-TWO-DRAFTS-2026-10-18.md`；13篇舊稿都在編輯檔待QA，與62篇總數不能重複計。
- [PR #25](https://github.com/daycool858000-hue/morning-light-magazine/pull/25) 新建**活動隔離草稿**，基於PR#24最新的向望+54主題，新增 2026-11-12 POPUPASIA、11-20 台北新藝術博覽會、12-18 毛孩藝術生活節共3場正式來源公告；從6場→9場。館所永久查詢從12→14，加入松菸、華山；2026-11-01～2027-12-31逾期隱藏自動測試；目前仍有更多市集、親子、攝影、音樂類別須找已正式公告來源。
- PR #25與PR #19的GitHub CI須看各最新SHA最終結果，不可依草稿建立就宣稱全數通過；PR #11新的三篇稿 commit `e7cf074` CI已 success（工程檢查≠文章已刊登）。

## 2026-10-18 54主題實機驗收與城市福利深度待辦
- **已驗收／可歸檔**：站主在 iPhone 打開獨立預覽 `https://daycool858000-hue.github.io/youji-topic54-preview/`，回報「都測試完成，連結都有出現，名字也有改，隨機按也有連到該機構」；獨立 Pages run `39091324335` success、提交 `16068fbe`，原始 PR #24 @ `c0194e3`。這是**站主手機抽測通過**，並非每筆54主題都逐項全網核對。PR #24 本身仍 Draft，沒有與正式版合併或部署。驗收詳情見 PR #24 留言及 `docs/ACCEPTANCE-TOPIC54-PREVIEW-AND-CITY-DEPTH-2026-10-18.md`。
- **下一個真實缺口**：站主指出「城市與福利」現在主要是各縣市社會局／處入口。QA 已有22縣市至少一筆官方入口／地方候選共23筆，另有6篇福利導讀、9個城市服務主題，但不等於22縣市每種具體服務都查完。
- `docs/CITY-22-COUNTIES-SERVICE-DEPTH-TRACKER-2026-10-16.md` 已研究6縣市共17筆不同具體用途URL（臺北、新北、桃園、臺中、臺南、彰化），**只完成六縣市局部原站用途初核，五層全面完成仍0/22，17筆尚未公開QA**。不得聲稱城市內容已全面完成或須站主重驗已確認54主題。
- 待辦：先逐筆評估上述17筆原站是否仍可用，整理成按「縣市＋服務種類」查詢的文字入口；再補另外16縣市的婦女中心/培力、地方社福中心、家庭教育、就業勞動、醫衛長照及新住民專門入口，避免把社會局總頁冒稱直接服務頁。同URL不重複卡，制度導讀與具體機構分開呈現。

## 2026-10-18｜完整62篇獨立子目錄部署成功；待站主iPhone試讀

- **實際網址已部署（獨立未核准QA）**：https://daycool858000-hue.github.io/youji-topic54-preview/full-launch-62/ 。站主在對話中**明確同意**62篇含13篇來源待複核草稿可公開做noindex測試。來源正式站分支 `review/youji-full-launch-integration-20261018` SHA `4ca3fd5`，`dist-qa-all62-city-review`；目標倉庫 `youji-topic54-preview` main `2886c20`（只新增 `full-launch-62/`，共190檔）。
- **部署成功**：[GitHub Pages run 39106678864](https://github.com/daycool858000-hue/youji-topic54-preview/actions/runs/39106678864) success；由原始倉庫GitHub Actions外部實際檢查 [run 39106785306](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39106785306) success（Chromium／WebKit各21項）。62篇、6類、讀利38／向望24、54主題、活動9＋長期入口14、小日曆、六縣市15筆服務入口。13篇仍標來源待複核；撤稿exp-12不復活；每頁未核准+noindex；noindex不等於保密。
- **原54主題首頁未更動：已獨立核驗** 原始根目錄備份 `16068fbe42b70c002d55fbff96e83aaedd5b8ec4` 與新提交的Git tree，原有所有根層檔案及各資源子樹blob SHA完全相同，只多 `full-launch-62/`。備份分支 `backup/topic54-before-full-launch-62-20261018` 已存在。
- **未完成**：站主尚未親自驗收62篇新增閱讀體驗、AI尚須正式來源複核原13篇（不能將QA原稿的 pending 偷改已核准）、城市和福利22縣市五層資料尚未補足、完整首發需正式核准後才允許合併／部署。正式主站 main、公開QA、發布核准檔和 PR#24～28 Draft 全不動。
- Claude工作紀錄：`claude/youji-full-launch-preview-deploy-a224k1` 的 `docs/FULL-LAUNCH-62-SUBPATH-DEPLOY-2026-10-18.md`。這一輪完整首發隔離版工程自動化驗證成功，等待站主**只試讀新增文章及城市服務差異**，不用重新驗收54主題。

## 2026-10-18｜62 篇獨立測試版：站主 iPhone 閱讀／功能驗收通過（最新）
- **站主本輪原話**：「檢查完成 全部功能都正常」。此回報承接 62 篇測試網址（`https://daycool858000-hue.github.io/youji-topic54-preview/full-launch-62/`）的 iPhone 試讀與功能檢查，狀態由「等待手機驗收」更新為**站主抽樣閱讀與功能驗收通過**；未回報功能異常。
- 本輪站主原先被要求檢查首頁與六大分類、讀利／向望、抽樣新文章、城市與福利入口、小日曆遮擋；**不能延伸為 62 篇逐篇全文與每條外部網址人工驗證完成**。此前已驗收的 54 主題不重新要求測試。
- **尚未核准／未完成**：13 篇來源待複核文章的事實與原始來源、城市福利 22 縣市更深資料盤點，以及完整首發文章／功能版本簽核與正式部署獨立授權；`content/release-approvals.json` 與所有 production 閘門不變。
- **下一階段**：由 ChatGPT 先核對 13 篇待複核原稿的官方來源、時效與重複內容，產出逐篇證據／待修清單；接著處理城市與福利服務入口覆蓋度。Claude 僅在需要實際工程修正時才派工，避免重做已驗收內容。

## 2026-10-18｜本輪內容查核進度
- 13篇來源第一輪查核及exp-05官方連結精修，已在 `audit/youji-13-primary-source-20261018` 建檔：`docs/FULL-LAUNCH-13-PENDING-SOURCE-CHECK-2026-10-18.md`（091990cd）。13篇仍屬 pending、待逐句核對，不是正式發布核准。
- 城市與福利17筆研究網址已與62篇預覽中的15筆對照；另外2筆為桃園限期活動、臺南歷史制度資料。記錄：`docs/CITY-22-COUNTY-NEXT-AUDIT-BASELINE-2026-10-18.md`（33604730）。五層深度完成仍0/22。
- 62篇手機功能驗收已通過；正式上線、核准檔、main與既有QA未改。

## 2026-10-18｜第二輪13篇來源複核及兩縣市服務研究
- 13篇待查草稿已進第二輪重要事實及官方來源核對，紀錄存於隔離 `audit/youji-13-primary-source-20261018` 的 `docs/FULL-LAUNCH-13-PENDING-SOURCE-CHECK-ROUND2-2026-10-18.md`（`0743745`）。已重新找到 A3 的教育部官方教材索引及 B3 兩廳院2025歷史活動官方索引；直接抓頁仍有技術限制，不冒稱全面可開。13篇依然 `pending`，須全文與原44篇重疊審查及逐句核對。
- 審稿分支修正：`exp-10` 補 iPhone 安全檢查的系統／雙重認證適用條件（`9105691`）；`exp-07` 增補衛福部食藥署可讀來源並保留受限的原醫院連結（`6bef202`）。此前 `exp-05` 勞動部連結精準化已歸檔。
- 城市與福利擴展至宜蘭、雲林兩縣局部原頁研究，3筆互異政府服務／活動資料（未匯入前台），檔 `docs/CITY-YILAN-YUNLIN-SERVICE-PORTALS-RESEARCH-2026-10-18.json`（`88f430a`）。目前共8縣市有部分深度研究，但全五層完整驗收仍為0/22。
- 無任何正式發布、合併、QA覆蓋或內容核准操作；已驗收62篇手機體驗維持通過。

## 2026-10-18｜13篇與既有44篇主題重疊比對
- 已核對既有44篇標題與13篇待查稿主題，並對照高重疊的主要正文段落；不是57篇全文逐字比對。13篇與44篇閱讀目的比對矩陣已在 `audit/youji-13-primary-source-20261018` 建檔：`docs/FULL-LAUNCH-13-VS-44-EDITORIAL-OVERLAP-2026-10-18.md`（`663a353`）。
- exp-02 消費爭議新稿原本重複舊篇購買前檢查，已改集中在爭議發生後資料存證；exp-04 履歷空白新稿原本重複舊篇就業入口，已縮成必要銜接並保留履歷經歷寫法。兩處修稿提交 `5e738f8`，只在隔離分支。
- 目前無發現13篇與44篇標題、閱讀目的完全同題必須整篇撤稿；仍待最後全文逐句比對及正式核准。13篇sourceCheck仍pending、62篇測試站與正式版皆未改。

## 2026-10-18｜第三輪來源稽核與城市11／22縣市局部資料（最新）
- 已在隔離編輯分支 `audit/youji-13-primary-source-20261018` 完成第三輪重點來源核對：跟騷法、勞動部婦女再就業要點、衛福部長照新制與 Apple 安全檢查適用限制。記錄 `docs/QA-ARTICLE-AND-CITY-VERIFY-ROUND3-2026-10-18.md`（`cb21d887`）。13篇仍pending，未宣稱完成全部逐句核對。
- exp-10數位安全稿補上「Apple安全檢查不涵蓋部分第三方帳號／社群分享」限制，commit `c8c72d87`；exp-07睡眠稿將「爬蟲擷取受限」技術說明從讀者可見來源標籤移回內部查核紀錄，保留衛福部官方替代來源，commit `674401d9`。均只在隔離分支，未重建／部署已驗收62篇測試網址。
- 城市與福利新增基隆、苗栗、新竹縣三縣部分直接服務／機關公告研究，共8筆互異URL、具體服務類別與年份限制：`docs/CITY-KEELUNG-MIAOLI-HSINCHU-2026Q4-PORTAL-RESEARCH.json`（`4805b365`）。連同之前6縣17筆、宜蘭雲林2縣3筆，目前**11／22縣市已有局部具體服務研究、累計28筆研究網址**；其中舊資料、限期公告及專案補助不可直接冒充現行可申請服務。**五層全部完整驗收仍0／22**。
- 未改main、公開QA、獨立62篇網站、PR、發布核准檔；下一步補其餘11縣及進行本批修稿的QA-only建置驗證（獲工程部署授權前不部署）。

## 2026-10-18｜站主新增理財、消費、現實自保、新住民與英文內容方向
- **站主新回報**：「新住民與英文方面呢？」「理財規劃文章消息不夠多」「消費觀念也可以補」「女性自我保護及遭遇壞人時如何自保方面不夠多」。確認的是內容擴充需求，**不是批准任何新稿直接上線**。
- **已撰寫／已存 GitHub，但未匯入 QA、未驗收、未部署**：獨立 `editorial/youji-finance-consumer-safety-multilingual-20261018` 分支新增**11篇原創全文候選**：3篇收入與生活金錢規劃、3篇消費與申訴區分、3篇外出／攔路／熟人威脅的現實自保、2篇新住民與多語資料閱讀。詳細稿件與採納理由見 `docs/EDITORIAL-EXPANSION-DECISION-FINANCE-CONSUMER-PERSONAL-SAFETY-2026-10-18.md`（`0ac53bbb`）。新稿不計入既有62篇，首發範圍目前不擅自更改。
- **英文真實工程進度**：`scripts/lib/qa-english.mjs` 和 `docs/QA-ENGLISH-RESOURCE-DISCOVERY-2026-10-16.json` 已有 QA-only 的3筆移民署英語／多語資源與8筆現有機構卡英文名稱／簡介／關鍵詞覆層；**未做全部文章英文翻譯**。既有 13筆 NI-01～NI-13 新住民跨機關候選仍 `sourceCheck:pending, importToQa:false`，不能說已全部收錄。
- **多語新研究**：已比對移民署1990七語服務與時段、勞動部新住民就業中／英／越／印／泰文資料及國健署孕產手冊中外語版次差異；新檔 `docs/NEW-IMMIGRANT-ENGLISH-OFFICIAL-LANGUAGE-ENTRY-PLAN-2026-10-18.json`（`12a39188`）記載不重複入口、官網語言及必要 QA 條件。不可把英文摘要冒充官方翻譯，不得做未核對的自動全站機翻。
- **下一步**：AI 逐篇複核11篇來源與語氣，與既有62篇去重；逐筆複查 NI 資源原頁語言／適用縣市／年月。資料符合規範後先擬定小批 QA-only 匯入工程，需站主另行授權才修改已公開測試版或正式版。Claude 本輪尚未新派工；原62篇手機功能驗收維持完成。
- **永久歷史新檔**：同分支首次建立 `PROJECT_HISTORY.md`（`def96fe5`），追溯站主採納／否決決策與原檔索引；`CLAUDE.md` 不覆寫。此次只更新研究／歷史紀錄，沒有合併 main 或部署。
