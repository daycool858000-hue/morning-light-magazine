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
