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
