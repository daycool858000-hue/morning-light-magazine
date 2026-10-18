# 第一批四篇擴充文章｜QA 暫存模擬報告

**日期：2026-10-17｜工程分支：`claude/first-four-articles-qa-staging-l0ntyf`（含 PR #12 `8dce66c` 全部提交）**
**依據：PR #11 `docs/FIRST-FOUR-EXPANSION-ARTICLES-EDITORIAL-QA-DECISION-2026-10-17.md`（編輯分支 `c9a5111`）**
**狀態：只完成獨立暫存環境模擬。未部署 GitHub Pages、未合併 main、正式匯入佇列四篇仍 `importToQa: false`／`pending`、未修改 `content/release-approvals.json`。**

## 一、本次修改

| 項目 | 內容 |
| --- | --- |
| V2 原稿同步 | 自 PR #11 帶入兩份 V2 最新版：exp-11「教育部終身學習資源平臺」段改為官網實際欄位（課程名稱、地區／縣市、出處單位、日期、報名／連結），不再宣稱可依主題篩選；exp-12 新增來源「國立臺灣科學教育館｜《科學研習》2022 年控制變因與科學思考教育討論」。同步帶入 manifest 與編輯決策文件。其他 20 篇原稿未變。 |
| 第一批選文與目錄 | 正式佇列 `docs/QA-EXPANSION-IMPORT-QUEUE.json`：exp-01、exp-08 `directory: readli`；exp-11、exp-12 `directory: toward`；四篇加註 `firstQaBatch: EXP-QA-01-20261017`。其餘 18 篇維持 `none`。 |
| 新網址代號 | exp-11 → `exp-choosing-open-courses`（舊 `exp-open-course-certificates`）；exp-12 → `exp-compare-everyday-experiments`（舊 `exp-reading-popular-science`）。舊代號只記在 `previousUnpublishedSlug` 供追溯；從未上線，不需轉址。exp-01、exp-08 沿用原 slug。 |
| 暫存佇列 | 新增 `docs/QA-EXPANSION-STAGING-FIRST-FOUR-2026-10-17.json`（`stagingOnly: true`）：只含這四篇，供測試建置獨立的 `dist-qa-staging-first-four`。公開 QA 部署不讀此檔；`build.mjs` 會拒絕把暫存佇列輸出到 `dist-qa`。 |
| 測試 | 新增 `tests/qa-expansion-first-four.test.mjs`，已加入 `npm test`（CI 同時跑 Chromium 與 WebKit）。 |

## 二、暫存模擬檢查結果（本機 Chromium；WebKit 由 CI 執行）

| 檢查 | 結果 |
| --- | --- |
| 暫存佇列與正式佇列、manifest 編輯決策一致；正式佇列四篇仍未開啟 | ✔ |
| V2 同步：exp-11 修正句、exp-12 新來源 | ✔ |
| 暫存佇列不能建置到公開 QA 用的 `dist-qa` | ✔ |
| 四篇全文逐行出現；標題、分類（生活與家庭／身心健康／學習與活動×2）、查核日期、未核准標示、noindex、搜尋索引；參考來源筆數與標題完整（exp-12 共 3 筆）；內部編輯註記不外露 | ✔ |
| 正文只有一份：讀利、向光、分類頁只放連結 | ✔ |
| 讀利 23 → 25（新兩篇接在最後）；向光 13 → 15（新兩篇接在最後），八索引不變；兩目錄互不重複 | ✔ |
| 原 36 篇文章頁、首頁、支援、活動、搜尋、城市、職涯、法律頁與 `dist-qa` 逐位元組相同 | ✔ |
| 舊 slug 不出現在任何頁面、搜尋索引或網站地圖 | ✔ |
| 320／375／390／1280px：無水平溢位、內文 ≥ 15px、來源與表格不超出畫面；新卡與原卡同寬、可點高度 ≥ 44px；搜尋可找到並開啟四篇；無 JavaScript 錯誤 | ✔ |

完整 `npm test`：正式版 44 項、第二批 QA 51 項、擴充匯入機制 18 項、第一批暫存 9 項，全部通過。

## 三、視覺規範符合程度

- 四篇沿用既有文章頁樣板、讀利精簡清單、向光文章卡，未新增樣式、顏色或版面元件；品牌識別不變。
- 截圖（Chromium，供站主後續驗收參考；**不代表站主已驗收**）：`docs/qa-media/first-four-staging-2026-10-17/`
  - `390-*.png`、`1280-*.png`：四篇文章全頁
  - `390-readli-tail.png`、`1280-readli-tail.png`：讀利清單末端
  - `390-toward-tail.png`、`1280-toward-tail.png`：向光文章卡末端
- 觀察（請站主看過再決定，未擅自調整）：
  1. 電腦版向光四欄格線：原本 13 張最後一列 1 張，現在 15 張最後一列 3 張。
  2. 讀利清單的摘要取原稿第一句，exp-01 為「家裡的錢不只有水電帳單。」、exp-08 為「有時候一個人很願意幫忙，但同時也需要自己的時間。」，比既有卡片短。
  3. 全站 QA 提示列文字仍是原版（未提到擴充文章）；如四篇上公開 QA，是否補一句說明待站主決定。

## 四、尚未做、需站主另行確認

1. 站主看暫存結果（截圖或本機 `QA_EXPANSION_QUEUE=docs/QA-EXPANSION-STAGING-FIRST-FOUR-2026-10-17.json node scripts/build.mjs --mode=qa --out=dist-qa-staging-first-four && node scripts/serve.mjs dist-qa-staging-first-four`）。
2. 站主明確同意後，才把正式佇列這四篇改為 `source-checked`、`importToQa: true`，再另行同意部署公開 QA。
3. 正式發布仍須另走 `content/release-approvals.json` 核准流程；AI 來源初核不等於站主審稿。
