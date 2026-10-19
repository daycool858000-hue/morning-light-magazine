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

## 2026-10-19 修正版隔離整合（分支 `claude/62-article-reconcile-isolated-tigh4j`，未部署、未合併）

- 基底：本安全鎖分支 `3e04586`。只從 `review/youji-13-final-copy-isolated-20261018`（`89692ef`）逐檔取入 3 份原稿 MD，其內容與修稿分支完全相同：
  `docs/EXPANSION-BATCH10-SIX-REVISED-ARTICLES-V2-2026-10-17.md`、`docs/EXPANSION-BATCH10-REMAINING-SIX-ARTICLES-V2-2026-10-17.md`、`docs/BATCH7-9-REMAINING-SIX-ARTICLES-ROUND2-EDITORIAL-DRAFT-2026-10-16.md`。
- 程式、佇列（`QA-FULL-LAUNCH-ALL-62-WITH-CITY-SERVICES`）、`content/`（含 `launch-approvals.json`、`release-approvals.json`）、CSS／JS、workflow 都沒有改。13 篇 `sourceCheck: pending` 不變。

### 修正前後建置比對（`3e04586` vs 本分支，同一指令建置）

- `dist`、`dist-production`、`dist-qa`、`dist-qa-topic54`：**逐位元組相同**。
- `dist-qa-all62-city-review`、`dist-qa-all62-review`：只有 6 個文章頁不同，其餘 56 篇、分類頁、讀利／向望目錄、搜尋索引、活動、小日曆、54 主題、城市服務檔案全部逐位元組相同。
- **與交接文件不一致之處**：交接 JSON／審稿板寫「5 篇變動、exp-05 與基準無新差異」，但實際建置顯示 **exp-05 也有變動**：來源連結「勞動部｜部分工時與工讀生勞動條件基準」由 `https://www.mol.gov.tw/1607/28690/87756/87780/nodelist` 改為 `https://www.mol.gov.tw/1607/28690/87756/`（`EXPANSION-BATCH10-REMAINING-SIX` 第 60 行；正文不變）。新網址與交接 JSON 的 exp-05 `coreFactSourceUrl` 一致，判斷為審稿刻意修正，故保留修稿分支原檔；若不採用，只需還原這一行。

| 文章 | 實際差異 |
|---|---|
| exp-02 | 「消費之前」段改為「發生爭議後，先確認當初約定了什麼」兩段，加連往既有下單前檢查文章的說明 |
| exp-04 | 「怎麼看求職與再就業資源」改為「履歷寫法與再就業獎勵分開處理」兩段 |
| exp-05 | 只改上述 1 個勞動部來源網址 |
| exp-07 | 來源清單新增衛福部／食藥署「夜夜好眠」1 筆 |
| exp-10 | Apple 安全檢查補 iOS 16、雙重認證條件，並說明不涵蓋非 Apple 帳號與部分社群平台 |
| B6 | 補肖像權與著作權分屬不同權利的提醒，來源新增智財局官方問答 1 筆 |

### 候選版本指紋（僅供後續審稿紀錄，**未寫入任何核准檔、不解除安全鎖**）

由 `scripts/prepare-launch-article-batch.mjs` 產生（輸出在不入版控的 `artifacts/`）：62 篇、讀利 38／向望 24、待複核 13、已核准 0。56 篇指紋與 `3e04586` 相同；變動 6 篇：

| 文章 | slug | 修正前 sha256 | 修正後候選 sha256 |
|---|---|---|---|
| exp-02 | `exp-consumer-dispute-records` | `20dac52b7c569ff8cde3c99caee3f70003d6c207c003ea93cdb16aa976021f4d` | `2af8960c703cb59b4e0490cfd3d7566a882ec16310de9878e0299a696bb20421` |
| exp-04 | `exp-career-gap-resume` | `b942818caa18642dafb42c371b9a73cc53dd37d3cf01d5ee2378e646471ae736` | `210b5d55b488318131384e6f3ff80a099f28461cff367e2966efc35cf515a187` |
| exp-05 | `exp-first-interview-questions` | `e76917e4e8b89729cefa549068eacd280e8e93750558bce035c5cb3c99244cb3` | `8a1a3f9fd8e83d0db63b75c23d44eedf474ee697b0c2d6cf87e6b315493ff7c1` |
| exp-07 | `exp-sleep-habits-health` | `29eaeca01a393c73ef19758ff5aa44585b469343c87561ea16fa17e1af86f6c5` | `d73a3d1b028006d710797fb600f3fdc391710504c54bd93d643468ad18e90929` |
| exp-10 | `exp-digital-safety-three-risks` | `bb67490f298da7d2fa57591c4e996c7513c1a8ae65d2be0d9c0e0893fdc78e8b` | `24470b57736a8b003d4cda6620eeba110ca59d4357210d1363a66ba4b96d1e33` |
| B6 | `exp-everyday-creative-works` | `70747fad185b6c0ea77df72067efe88937113de4a907ced52f475b681f4b9000` | `b6269231d9fc781c93e5ec6cc5005b4e2a7fc406dc592c4931f3e36a9255cedf` |

這 6 篇仍是 `pending`，指紋只會在來源複核完成、佇列更新後由同一腳本重算，屆時應以重算值為準。

### 本機測試（沿用既有測試，未新增）

- `npm test`：全部通過（含 62 篇隔離版、13 篇待複核標示、54 主題、9 公告＋14 長期入口、15 城市服務、讀利／向望、搜尋索引）。
- `tests/launch-approval.test.mjs` 20 項通過；`tests/launch-approval-integration.test.mjs` 通過（真實佇列中止、模擬全簽 62 篇與預覽逐字相同）。
- `scripts/assert-production-ready.mjs`（無簽核）：exit 1，「仍有來源待複核的文章，禁止正式發布」——安全鎖仍有效。
- Chromium：`qa-full-launch-browser` 8／8、`qa-calendar-avoid`（62 篇隔離版）16／16。WebKit 由 CI 執行。

### A3／B3 官方原頁（Playwright Chromium 各試一次）

- A3 教育部 `https://familyedu.moe.gov.tw/docDetail.aspx?docid=307524&pid=27&uid=3159`：**待驗證**。
- B3 兩廳院 `https://npac-ntch.org/events/9984?lang=zh-TW`：**待驗證**。
- 原因：本雲端工作環境的網路政策拒絕連到這兩個網域（proxy CONNECT 403），瀏覽器根本沒連上網站；這不代表網頁失效或 404，需在臺灣一般瀏覽器實測。未重試。
