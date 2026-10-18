# PROJECT_STATUS｜由己 SELF-AUTHORED

> 更新：2026-10-18（臺灣）。**本檔為預設 main 分支的專案長期狀態紀錄**，首次由 `release/youji-production-promotion-prep-20261017` 已有版本完整承接、只補充最新交辦與交接說明；**不是 PR #19 已合併、文章獲核准或網站已正式部署**。技術發生衝突時，以 GitHub 實際 PR、提交、Actions 和站主驗收紀錄為準。

## 2026-10-18 晚間最新｜Claude 62 篇正式發布安全鎖工程完成、已核對（僅工程，不發布）
- **已修改／已測試／已驗收工程階段**：Claude 隔離分支 `release/youji-launch-gate-62-reconcile-20261018`，工程 commit [`42af69f`](https://github.com/daycool858000-hue/morning-light-magazine/commit/42af69fe8f5af400e681679e8b2dc451074883a6)，紀錄 commit [`3e04586`](https://github.com/daycool858000-hue/morning-light-magazine/commit/3e04586b23edbd5fb9a3b10ddd8f75155119647d)（只改該分支 `CLAUDE.md`、`docs/RELEASE-GATE-62-RECONCILIATION-2026-10-18.md`）；ChatGPT 已核對 GitHub 提交及 CI，**判定此單工程任務驗收通過／已結案**。沒有合併 main、沒有部署、沒有簽核文章／功能。
- **驗證證據**：不部署的預檢 [run 39121971621](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39121971621) success；完整 [run 39121971624](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39121971624) attempt 2 整體 success，`test`、`full-launch`、`calendar` 全部成功。calendar 第一次 WebKit 320px `exp-choosing-open-courses` 單一捲動遮擋失敗，基準輸出由 Claude 比對宣稱逐位元組相同，重跑一次通過；**標註可能偶發、不將其當成已證實根因**，此輪不重做日曆。紀錄 commit `3e04586` 推送後引發的新例行 CI run `39124235565` 當前正在執行（純文件變更，不假稱已通過）。
- **工程結果**：以已驗收62篇預覽原始提交 `4ca3fd5` 為基底，對齊讀利38／向望24、54主題、9活動公告＋14長期查詢入口、15城市直接服務入口；正式發布包含精確文章及6組功能指紋核准和手動部署硬閘，空白核准與13篇 pending 皆正確擋住正式發布；隔離模擬已通過，核准資料仍全空。
- **最後待辦而非 Claude 待回報**：13篇仍要來源全文最終複核；其中 `exp-02`、`exp-04`、`exp-07`、`exp-10` 的審稿修正只在 `audit/youji-13-primary-source-20261018`，**尚未進已驗收62篇測試版**，未來採用修正版需重新計算並核准指紋（不可提前套用舊版指紋）。62篇文章和6組功能的發布版本簽核尚未取得；2筆未核准舊官方入口依現有核准制度不進正式版。最後仍需備份／還原、sitemap／robots／404／noindex 確認及站主另行授權正式部署。
- **下一步分工**：ChatGPT優先完成13篇正式來源查核及四篇修正的內容版次核對，並保留另11篇新草稿及NI多語資源為獨立擴充；**目前 Claude 此輪工程已回報結案，勿重派相同工作**。要進下一個 Claude 新階段時先讀 main 本檔與該隔離分支 `CLAUDE.md` 的最新節及專門報告，按當次任務需要讀特定檔案，不重掃 repo。建立 Draft PR 可留作工程審閱選項，非當下正式發布必要條件。
- **文件位置糾正**：Claude 所稱「`PROJECT_STATUS.md`、`PROJECT_HISTORY.md` 只在 PR #19 分支，main沒有」是其工作階段取得的**過時狀態**；兩檔先前已由 ChatGPT 單純新增到 `main`（`b60a108`、`ca94602`），此次持續增量更新。本次只更新根目錄紀錄，不修改任何網站程式或已有驗收頁面。


## 2026-10-18｜13篇來源第4輪實做：11篇核心來源原頁可核、2篇官方索引與瀏覽器限制
- **執行成果（ChatGPT，非Claude交辦）**：本輪確實讀取13篇原稿所對應4份V2／Round2/3文稿及前三輪來源報告、13對44篇內容重疊矩陣，重開／搜尋官方原始來源，補做原稿權利界線。第四輪報告已建立在 `audit/youji-13-primary-source-20261018`：[`docs/FULL-LAUNCH-13-ROUND4-PRIMARY-SOURCE-AND-COPY-DECISION-2026-10-18.md`](https://github.com/daycool858000-hue/morning-light-magazine/blob/audit/youji-13-primary-source-20261018/docs/FULL-LAUNCH-13-ROUND4-PRIMARY-SOURCE-AND-COPY-DECISION-2026-10-18.md)，commit `a9ee317`。
- **第4輪證據分類，絕不可誤作內容發布核准**：13篇中11篇主要可核事實有可讀原始機關／機構頁，另2篇 `A3` 教育部2024分齡教材、`B3` 兩廳院2025已結束的學校專用職人講堂有**官方搜尋索引**支持，但工具直接打開分別逾時／需JavaScript；`exp-07` 臺中醫院舊頁仍403，已保留可讀衛福部／臺大醫院替代資料。**13篇仍全是 `sourceCheck:pending`、正式核准0篇**，不能把核心事實查核說成逐句全審或13篇正式驗收。
- **實際修稿**：本輪在上述審稿分支的 B6 日常創作稿補上「肖像權不等於著作權」的警示與智財局官方問答，commit `53f15d1`。截至本輪，**相對已驗收預覽來源 `4ca3fd5`，審稿分支只有3份既有原稿MD發生文字差異**：`docs/EXPANSION-BATCH10-SIX-REVISED-ARTICLES-V2-2026-10-17.md`（exp-02/04/10）、`docs/EXPANSION-BATCH10-REMAINING-SIX-ARTICLES-V2-2026-10-17.md`（exp-07）、`docs/BATCH7-9-REMAINING-SIX-ARTICLES-ROUND2-EDITORIAL-DRAFT-2026-10-16.md`（B6）；`exp-05`精準官方URL修正已在舊版本，不能重複算新差異。比對使用 GitHub compare `4ca3fd5...audit/youji-13-primary-source-20261018`，不需要整倉重新讀。
- **下一步明確工作項目**：A3/B3做一次有JS的瀏覽器／台灣端實際連結驗證（不能以海外爬取失敗當404）；對13篇形成逐篇最終來源版次證據，再由人工完成編輯發布核准決策；之後由Claude只處理3份差異稿件的**隔離QA整合**、佇列源查狀態變動的有證據核准及新版本指紋／必要測試；目前 **不派Claude、不改62篇部署網址、不簽核、不中途發布**。審稿分支13篇源查與內容修改已在GitHub保存，待最後關卡決定。


## 2026-10-18｜第四輪後已建立3檔差異的62篇隔離修稿分支（不發布）
- **實作完成／已儲存**：從站主已驗收的62篇原始來源提交 `4ca3fd5450fbe7b041a5a9752223039c45aeedda` 新建 `review/youji-13-final-copy-isolated-20261018`，只把 `audit/youji-13-primary-source-20261018` 中**真正有差異的3份原稿MD**逐檔搬入、保留前面三輪與第四輪的核對修訂。依序提交 `57663df`、`038bb25`、`e485a42`。
- **精準差異實證**：GitHub compare `4ca3fd5...review/youji-13-final-copy-isolated-20261018` 狀態 `ahead 3, behind 0`，**僅3檔 modified**：`docs/EXPANSION-BATCH10-SIX-REVISED-ARTICLES-V2-2026-10-17.md`（exp-02／04／10）、`docs/EXPANSION-BATCH10-REMAINING-SIX-ARTICLES-V2-2026-10-17.md`（exp-07）、`docs/BATCH7-9-REMAINING-SIX-ARTICLES-ROUND2-EDITORIAL-DRAFT-2026-10-16.md`（B6）；沒有搬入額外城市資料或改網站JS/CSS、正式／QA部署工作流程。
- **狀態區分**：目前是**已整理修正原稿並建立隔離分支**，不是來源13篇全審完成、不是13篇 sourceCheck變更、不是逐頁測試／站主驗收，更不是將已驗收的正式公開預覽或production覆蓋。13篇保持`pending`，62篇文章與6功能的正式發佈核准仍空。GitHub CI 若因這3次文字提交自動啟動，須等其結果才可稱自動測試通過。
- **下一步**：查核 A3 教育部／B3 兩廳院實際瀏覽器原頁後，定稿逐篇來源證據和文章修正版；再讓 Claude 僅針對此隔離分支做 QA 與版本指紋生成工作，不重做已驗收版面。站主未明確授權前不部署、不合併main、不修改核准。

## 2026-10-18 晚間續辦｜A3/B3官方頁內容核對與13篇可審稿交接完成
- **正式首發維持至少62篇、未正式部署**。站主原62篇獨立預覽的手機功能抽測通過，不重新做 UI／小日曆。
- **本輪最新自動測試證據**：修稿隔離分支 `review/youji-13-final-copy-isolated-20261018` 最終3份原稿修改提交 `e485a42` 的 [完整 CI run 39125290962](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39125290962) **success**（`test`、`full-launch`、`calendar` 都成功）。前一中途提交 `57663df` 的 CI 失敗不代表最後版本失敗；不要重跑已成功的最終版本。同分支較晚僅增一份文件的提交需獨立核對CI狀態，不冒稱已通過。
- **兩筆官方來源疑點補查**：A3教育部2024-09-02「113學年家長日宣導手冊」官網索引**確有原文及分齡附件清單**，但直接讀頁工具逾時、附件未逐份下載；B3國家兩廳院2025「職人大講堂」官網索引**確有原文、學校申請資格及活動結束標籤**，直接讀頁回傳需要JavaScript。可核對事實、**不宣稱完成實際Safari或JS瀏覽器開頁驗證**，不視為404；沒有因此刪掉歷史來源或謊稱當期招生。補充紀錄 [第4輪查核檔](https://github.com/daycool858000-hue/morning-light-magazine/blob/audit/youji-13-primary-source-20261018/docs/FULL-LAUNCH-13-ROUND4-PRIMARY-SOURCE-AND-COPY-DECISION-2026-10-18.md)，commit `2bd3ec9`。
- **新建可供精準交接的13篇逐筆證據表**：[`docs/13-ARTICLE-SOURCE-AND-VERSION-HANDOFF-2026-10-18.json`](https://github.com/daycool858000-hue/morning-light-magazine/blob/review/youji-13-final-copy-isolated-20261018/docs/13-ARTICLE-SOURCE-AND-VERSION-HANDOFF-2026-10-18.json)，隔離分支 commit `9efbcec`，包含13篇原稿slug、已核核心事實、原頁限制、5篇變動ID `exp-02/04/07/10/B6`、3份實際修改MD、原62篇基準、CI與待簽核要求；**13篇 sourceCheck仍pending，0篇正式簽核**，沒有更動原QA佇列或任何核准檔。
- **下一個真正有效的工作**：先以本清單做13篇的最終逐篇文字／引用版次複核，A3/B3待一般JS瀏覽器網址測試（若不能驗再用有證據的官方目錄備援）；再以既有隔離分支整理修訂後62篇版本、重新產生文章指紋並進行必要的最小範圍QA。Claude前一份發布安全鎖工程已結案，**尚未發出新Claude任務**。正式發布仍須62篇與6組功能明確核准及單獨部署授權，不合併、不部署、不改main網站程式。

## 2026-10-18｜原62篇中的13篇正式審稿板已整理完成
- **本輪實際成果**：ChatGPT 對照13篇最終隔離原稿、三輪歷史核查與第4輪重點，逐項以官方／機構原始頁再確認行政院消保會申訴流程、衛福部長照喘息／聘外看、勞動部部分工時、智財局第12條與肖像權、跟騷法3至5條、Apple安全檢查、衛福部性影像受理、經濟部女性創業人物、食物銀行自述數字，以及A3/B3歷史資料。建立 **13篇逐篇「可以送站主內容試讀，但未獲正式核准」對照表**：[`docs/FINAL-62-ARTICLE-EDITORIAL-REVIEW-BOARD-2026-10-18.md`](https://github.com/daycool858000-hue/morning-light-magazine/blob/review/youji-13-final-copy-isolated-20261018/docs/FINAL-62-ARTICLE-EDITORIAL-REVIEW-BOARD-2026-10-18.md)，commit `89692ef`。
- **剩下的真實邊界**：A3教育部歷史教材官網全文可由搜尋索引確認但直接抓頁逾時、附件未逐件開；B3兩廳院歷史職人大講堂有官網索引而直接抓頁要JavaScript，**兩網址尚未經一般JS瀏覽器實測**；exp-04勞動部法規原頁本輪逾時但前輪有原始法規及行政院公報佐證，正式刊登日需再核日期。B2約220家是協會當期自述；B1人物經營狀況為官方網站刊載的專訪非獨立審計。
- **不可越權**：即使13篇均可開始編輯試讀，13個 `sourceCheck` 仍是pending；正式文章及6組功能版本簽核仍為零；不合併main、不部署、不改已有62篇獨立預覽。已通過修稿隔離版本 `e485a42` 的 [CI run 39125290962](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39125290962) 不需要重新跑。最近只新增檔案所產生的CI若仍執行，勿聲稱已通過。
- **下一步**：13篇最終試讀、必要時實際JS瀏覽器驗證A3/B3，再提交最終文章精確版本簽核；如需工程只操作 `review/youji-13-final-copy-isolated-20261018` 與已完成發布安全鎖分支，控制範圍為新指紋與最小回歸，**Claude目前沒有未回報的新指令**。

## 2026-10-18｜下一輪 Claude 隔離整合任務準備完成（尚未交辦）
- **上一輪工程已結案**：`release/youji-launch-gate-62-reconcile-20261018` commit `3e04586` 的例行 CI run `39124235565` 為success，先前工程 `42af69f` 與隔離預檢／WebKit也已核對通過；不得再派 Claude 重做發布安全鎖或已驗收小日曆。
- **新輸入成果**：`review/youji-13-final-copy-isolated-20261018` 已修訂5篇（exp-02/04/07/10、B6），**實際只有3份既有MD發生文字差異**；`e485a42` 源碼版CI run `39125290962`成功；後來13篇證據JSON與審稿板依序為 `9efbcec`、`89692ef`。證據清單：`docs/13-ARTICLE-SOURCE-AND-VERSION-HANDOFF-2026-10-18.json`、`docs/FINAL-62-ARTICLE-EDITORIAL-REVIEW-BOARD-2026-10-18.md`。最後純文件CI是否完成應以實時run為準。
- **下輪建議交Claude，但目前僅準備好指令／待使用者實際貼給Claude**：以已完成發布安全鎖 `release/youji-launch-gate-62-reconcile-20261018` 為基準**新建隔離工作分支**，只從上述修稿分支挑3份MD文字差異，保持13篇 `sourceCheck:pending`、62篇原定範圍、6組功能、`content/launch-approvals.json`空白，建置私有QA隔離輸出，針對5篇全文差異及其餘57篇不變、小日曆／54主題／9活動＋14長期入口／15城市服務無退化做必要測試；生成**僅供審稿的候選版本指紋／diff**，不得寫入核准檔或解除安全鎖。若既有瀏覽器工具可使用，順帶限縮檢查A3教育部與B3兩廳院2個官方原頁可用性，不重查全站網址。
- **驗收與權限**：要看Claude推送的精確commit、差異與CI，未回報前不另發第二道指令。不得改 `main`、公開QA、已驗收的62篇預覽網址或 GitHub Pages；不得合併、正式部署、改`release-approvals.json`、`launch-approvals.json`、把13篇自動升級source-checked。13篇最終稿件與62篇6功能的正式核准、備份與正式部署是獨立的後續關卡。

## 新工作階段優先讀取｜2026-10-18 快速現況
1. 專案為 **daycool858000-hue/morning-light-magazine**，唯一網站為**由己 SELF-AUTHORED**；不要混用其他專案。先看本節，再按任務讀下文、`PROJECT_HISTORY.md` 與原 `CLAUDE.md`；既有細節不要每次全倉庫重掃。
2. **已完成且站主已驗收**：62 篇獨立 QA 預覽 [full-launch-62](https://daycool858000-hue.github.io/youji-topic54-preview/full-launch-62/) 功能及手機抽測、54 主題；Pages run `39106678864` success、外部 Chromium/WebKit run `39106785306` success；獨立預覽來源 `4ca3fd5`，部署 `2886c20`。**絕不等於正式發布核准。** 既有小日曆、讀利、向望不因換視窗重做。
3. **目前確定未完成**：原 62 篇中 13 篇為 `sourceCheck:pending`，已三輪核心查證但未逐句／發布版簽核；22 縣市五層資源正式完整驗收為 0／22，11 縣市已另作局部來源研究；13 筆 NI 新住民多語資源未匯入；PR #19 發布安全工程仍 Draft、正式版未部署；新 11 篇理財／消費／自保／多語全文**只在隔離編輯分支** `editorial/youji-finance-consumer-safety-multilingual-20261018`，尚未QA或核准。
4. **Claude 最新已交辦且待回報**：2026-10-18 站主已將「第一次設定省額度工作習慣，寫入專案根目錄 CLAUDE.md」交給 Claude Code；包含每完成功能並推 GitHub 就增量更新 CLAUDE.md、提醒新工作階段、只讀本任務相關檔案。**尚未收到 Claude 完工回報與新提交核對結果；先等待、核驗，不重複交辦，也不要此時由 ChatGPT 覆寫 CLAUDE.md。** 上一個 Claude 62 篇預覽工程已完成，不能再列為待做。沒有可證的本 repo Codex 待回報任務。
5. **下一步**：ChatGPT 先核實舊 13 篇與新增 11 篇來源、NI-01～NI-13 語言及官方版次，持續地方資料篩選；Claude 本輪只處理已交辦的 CLAUDE.md 使用習慣並回報。若後續派 Claude 工程，先確認此次回報已驗收，再按已準備的發版隔離／QA 工作範圍交辦。**沒有站主明確批准，不合併 main、不覆寫現有預覽或公開QA、不執行 GitHub Pages 部署。**
6. **分支關係**：本檔已同步到 `main`，而未合併的 PR #19 release 分支仍保留舊版狀態紀錄。以後跨視窗**優先讀 main 的本檔**；其他分支文件是來源與工程追溯，不因檔案同步而合併程式。
7. **缺乏證據／待補**：本專案較早已封存或不可見的逐字聊天歷史未完整取得；所有人工全文驗收、所有新住民外語 PDF 逐語核驗、站主正式發布簽核及 Claude 本次設定的實際完工回報仍待確認。不可稱為完整私人聊天備份。


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

## 2026-10-18｜截至本輪核對：未完工清單與 Claude 派工門檻
- 站主本輪詢問「未完成、已規劃未上線、已查證未驗證、哪些交Claude部署」；ChatGPT直接重讀本分支 `PROJECT_STATUS.md`、`PROJECT_HISTORY.md`、已完工的Claude 62篇交接、原始62篇隊列及目前GitHub PR，做狀態核對。**沒有發出新的Claude指令、沒有證據顯示另有執行中的Claude任務**。
- **已部署／站主功能驗收通過**：獨立 `youji-topic54-preview/full-launch-62/` 62篇、54主題、9個活動＋14個長期入口、6縣15項具體地方服務、手機抽驗；不重派Claude重建舊入口或動小日曆。
- **已查證未完驗證**：原62篇中13篇 `sourceCheck:pending`（三輪核心來源AI核對、部分文稿已修，尚未逐句及最終版本核准），13筆NI-01～NI-13新住民官方跨機關候選（仍pending、not imported）；城市資料最近11／22縣市有部分深度研究、28個不同網址，其中15已於獨立預覽，另外13留研究層（含不宜直接刊登的限時或歷史資料），五層服務正式驗收仍0／22。先前另有22縣市60筆研究名錄，和這28筆用途層級不同，**不可相加當93筆上線**。QA已有3筆移民署英語／多語資源＋8筆英文覆層，不等於完整英文站。
- **已規劃／有草稿未上線**：2026-10-18另開 `editorial/youji-finance-consumer-safety-multilingual-20261018`，存11篇全文候選（理財3、消費3、安全3、多語2）與官方外語入口規格；11篇均未加入62篇、未跑工程QA、未正式來源全審或取得內容發布授權。更多2027年活動待官方公布再核實。
- **正式版阻塞**：PR #19 仍Draft，原 `content/launch-approvals.json` 沒有本輪62篇精確核准登記，正式版來源分支及 gate 要與「向望」最新實測版整合；仍需備份復原、robots/sitemap/404、noindex移除及權限確認。GitHub此輪共14個開啟PR且皆Draft，**不是14項待Claude重做的任務**。
- **對Claude建議順序（未派工，僅排程）**：A. 先由ChatGPT完成13篇來源最終核對及新11篇來源、NI-01～NI-13多語版次查核，整理「可進QA」清單；B. Claude才在既有62篇功能基礎上**只建立新的隔離QA建置分支與預覽檔**，優先將核對通過的11篇與新住民英文資源分批匯入並測試重複、搜尋、六分類、英文語言、noindex、Chromium/WebKit與已驗收功能無退化；不自行覆蓋現有GitHub Pages。C. 完成整批正式首發核准與工程安全門檻，站主明確允許後，Claude再做正式合併／部署。**本次沒有授權Claude推送任何正式部署或發布新未核准內容**。
- **上線範圍仍以既定至少62篇完整首發決策為準**；額外11篇若要同次納入，必須由站主另定具體範圍，不可自行改成73篇首發。

## 2026-10-18｜Claude 正式發布工程 CI：日曆 WebKit 320px 重跑中
- **最新 Claude 交付執行中／待回報**：GitHub 分支 `release/youji-launch-gate-62-reconcile-20261018`、提交 `42af69fe8f5af400e681679e8b2dc451074883a6`，處理62篇正式發布安全閘工程；並非已獲正式發布許可。前次「省額度 CLAUDE.md 設定」是否已由 Claude 明確完工回報，仍以 Claude 最終回報核對，不可由其他工程推定。
- [正式發布文章版本預檢 run 39121971621](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39121971621) **success**，僅表示該項檢查通過。
- [完整 CI run 39121971624](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39121971624) 第一次執行有**唯一一處 calendar WebKit 320px：QA 文章 exp-choosing-open-courses 捲動停點遮擋失敗**。Claude 比對宣稱輸出與基準 `4ca3fd5` 逐位元組相同，暫懷疑不穩定時序，**不能自行當成已證實或已通過**。
- ChatGPT 即時核對 run 39121971624 第二次嘗試（`run_attempt=2`）狀態：`test` 與 `full-launch` jobs success，`calendar` job **in_progress**。Claude 已啟動唯一一次重跑，**不得重複派工或重新測試已通過的舊功能**。等待該次重跑結果與 Claude 寫入分支紀錄／提交的最終回報，核對後再更新本檔。
- 目前不修改日曆程式、不合併PR、不部署正式版／公開QA、不改內容核准檔。若重跑失敗，再依同一分支既有故障證據限縮至 WebKit 320px 捲動定位穩定性。
