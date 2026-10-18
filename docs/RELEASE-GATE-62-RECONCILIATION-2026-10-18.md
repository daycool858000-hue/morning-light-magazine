# 正式發布安全鎖 × 62 篇預覽 相容修正（2026-10-18，隔離工程，未部署）

- 分支：`release/youji-launch-gate-62-reconcile-20261018`，基於站主手機功能驗收通過的 62 篇預覽來源 `review/youji-full-launch-integration-20261018` @ `4ca3fd5`（承接 PR #24～#28）。
- 不合併 main、不部署、不觸發 GitHub Pages、不動 `content/release-approvals.json`、不改任何文章原稿或佇列狀態、不重做 UI。
- `content/launch-approvals.json` 沿用 PR #19 的空白檔（`approvedArticles`、`approvedFeatures` 皆為 `{}`），沒有填入任何核准。

## 差異盤點：PR #19 正式發布工程 vs 62 篇預覽

| 項目 | PR #19（`6a9723a`，基於 PR #18 舊「向光」版） | 62 篇預覽（`4ca3fd5`） | 處理 |
|---|---|---|---|
| 專欄名稱 | 程式基底仍是「向光」，只靠硬閘擋 | `config/site.json` 已是「向望」 | 以 62 篇為基底，硬閘的名稱檢查改為一律執行 |
| 54 主題 | 用舊 PR #18 入口資料 | PR #24 `c0194e3` 版（育兒津貼回社家署、keep12／補42） | 沿用 62 篇資料，正式版顯示需 `topic54` 指紋簽核 |
| 文章 | 44 篇；指紋清單寫死 44／讀利26／向光18；讀預設佇列（8 篇擴充） | 62 篇＝36＋26 擴充，讀利38／向望24；佇列為 `QA-FULL-LAUNCH-ALL-62-WITH-CITY-SERVICES` | 指紋清單改讀 62 篇佇列並檢查 62／36／26／38／24 |
| 13 篇待複核 | 無此概念（`editorialReviewPending` 不存在） | 13 篇 `sourceCheck: pending` 只能在隔離預覽 | 指紋清單列為阻塞；`approvedLaunchArticle` 一律拒絕；正式建置遇到待複核直接中止 |
| 活動 | 公告固定 6 筆、長期入口 12 筆 | 公告 9 筆（建置時剔除已結束）、長期入口 14 筆 | 長期入口改 14；公告改用同一載入器計算「今天仍應顯示」的數量逐筆核對 |
| 城市服務 | 沒有 | 六縣市 15 筆直接服務入口（佇列 resources） | 新增 `cityServices` 功能指紋，正式版需簽核才顯示 |
| build.mjs 正式版接線 | 有（SHOW_* 依指紋決定） | 沒有（全部 `IS_QA` 才顯示） | 移植 PR #19 接線到 62 篇 build.mjs |
| 正式部署 workflow | 有 prepare＋assert 硬閘 | 與 main 相同，**沒有硬閘** | 補回硬閘，並禁止帶入任何隔離測試環境變數；仍需手動輸入「確認公開」 |
| QA 手動部署保護（PR #20／#23） | 有 | 有（相同） | 不動 |

## 實際修改

- `scripts/lib/launch-approval.mjs`：PR #19 指紋驗證；新增 62 篇範圍常數、固定首發佇列（僅 `LAUNCH_TEST_ONLY=1` 測試能換成 `docs/.launch-fixture-*.generated.json`）、拒絕待複核草稿、新增 `cityServices`。
- `scripts/lib/launch-inputs.mjs`（新）：build、指紋清單、測試共用同一份功能原始資料讀取。
- `scripts/prepare-launch-article-batch.mjs`、`scripts/prepare-launch-feature-batch.mjs`：改為 62 篇／14 長期入口／9 公告／15 城市服務。
- `scripts/assert-production-ready.mjs`：改為 62 篇首發硬閘（篇數完全相等、待複核 0、六組功能全簽、各頁數量與預覽一致、無測試標示／noindex、sitemap／搜尋完整、exp-12 不復活）。
- `scripts/build.mjs`：移植 PR #19 正式版接線（文章、福利文章、擴充文章逐篇簽核；活動、日曆、孕產、54 主題、資源目錄、城市服務逐功能簽核）；正式版拒絕 `QA_PENDING_REVIEW_MODE`／`QA_TOPIC_GUIDES_STAGING`。
- `scripts/lib/qa-english.mjs`、`scripts/lib/toward-light-editorial.mjs`：PR #19 同款的正式版容錯選項（預設行為不變）。
- `.github/workflows/deploy-pages.yml`：補硬閘；`.github/workflows/launch-article-batch-preflight.yml`（新，不部署）。
- `tests/launch-approval.test.mjs`、`tests/launch-approval-integration.test.mjs`：單元＋隔離模擬。

## 測試結果（本機）

- 核准檔為空時，`dist`、`dist-production`、`dist-qa`、`dist-qa-all62-city-review` 四種輸出與 `4ca3fd5` **逐位元組相同**（已驗收 UI、日曆、手機版面未變）。
- `npm test` 全部通過（WebKit 由 CI 執行）。
- `tests/launch-approval.test.mjs` 20 項通過。
- `tests/launch-approval-integration.test.mjs`：真實佇列（13 篇待複核）即使誤簽一筆，正式建置中止；模擬「13 篇完成查核」後：單篇簽核只輸出一篇、指紋錯一碼不輸出、只簽文章時活動／日曆不出現且硬閘擋下、全部簽核時硬閘放行且 62 篇正文與預覽逐字相同、各頁活動／入口／54 主題／城市服務數量與預覽相同；少一項功能即擋下。測後還原核准檔並刪除模擬檔。
- 現況（無簽核、13 篇待複核）執行硬閘：擋下（「仍有來源待複核的文章，禁止正式發布」）。

## 仍有的發布阻塞

1. 13 篇 `sourceCheck: pending`：須完成來源複核並更新佇列，指紋才會重算。
2. 62 篇文章與 6 組功能尚無站主逐項版本簽核（`content/launch-approvals.json` 為空）。
3. 正式版與 62 篇預覽唯一刻意的差異：原有 18 筆入口中，未在 `release-approvals.json` 核准的 2 筆不進正式版（保持原有核准）。
4. 正式版 sitemap／robots／404／備份還原、GitHub Pages 由 QA 切換為正式版，均需站主另行明確同意。

## CI 結果（commit `42af69f`）

- 不部署的版本檢查 run `39121971621`：success（無簽核時硬閘正確擋下；隔離模擬通過；核准檔 diff 為空）。
- 完整 CI run `39121971624`：test、full-launch success。calendar 第一次失敗 1 處（WebKit 320px，公開 QA 版 `articles/exp-choosing-open-courses.html` 一個捲動停點），該 `dist-qa` 與 `4ca3fd5` 逐位元組相同且基準 run `39100866169` 通過；依規則只重跑一次（attempt 2）→ success。此停點偶發，日後若再出現應另案處理小日曆避讓時序，本分支不改已驗收的日曆。

## 另需注意

- 查核分支 `audit/youji-13-primary-source-20261018` 已修改 exp-02、exp-04、exp-07、exp-10，尚未進入 62 篇預覽；併入後這幾篇指紋會改變，站主應簽核併入後的新版本。
