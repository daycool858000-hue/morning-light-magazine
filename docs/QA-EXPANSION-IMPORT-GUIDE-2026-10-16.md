# 六大主題擴充｜QA 分批匯入機制說明（工程第一階段）

**日期：2026-10-16｜工程分支：`claude/qa-expansion-import-20261016`（自 main `51de294` 開出）**
**狀態：只完成網站整合的技術準備。佇列中 22 篇文章、13 項新住民資源全部 `importToQa: false`，目前不會出現在任何網站版本。未部署 QA、未合併 main、未修改 `content/release-approvals.json`。**

## 一、PR #11 候選資料的接入方式（任務一檢查結果）

| 候選資料 | 數量 | 接入位置 | 與既有內容的關係 |
| --- | --- | --- | --- |
| 新寫文章 exp-01～exp-12 | 12 篇 | 原稿 `EXPANSION-BATCH10-…-DRAFT` 以 `# 01｜標題` 分篇，解析器已試跑 12 篇全部可解析 | slug 一律 `exp-` 開頭，不會與既有 `batch2-`～`batch6-` 36 篇衝突；建置時另比對標題不得完全相同 |
| 歷史候選 A1～A4、B1～B6 | 10 篇 | A1～A3 用第三輪原稿、A4 用第二輪、B1～B6 用第二輪；`### 官方來源…` 清單式來源與「編輯對應／建議閱讀入口」行都能處理（後者不進網頁） | A4、B6 在佇列標註「暫緩」，修稿後才能開啟 |
| 新住民 NI-01～NI-13 | 13 項 | NI-01～07 全國性 → 所屬主題頁「更多官方入口」簡潔文字列；NI-08～13 縣市專屬 → 城市頁縣市篩選 | 已比對 `content/resources.json`、第二批 23 筆、第三批、英文 3 筆、12 個長期入口及 6 筆活動公告：**13 筆都沒有完全相同網址**，各自獨立呈現。NI-02 與 act-02、NI-12 與臺南社會局只是同網域不同網址，依站主規則分開 |
| 22 縣市追蹤表 | 22 縣市 | 查到的地方服務以佇列 `resources` 加入，`regions` 填縣市 id（`content/counties.json`），自動進城市頁篩選 | 第二批 23 筆既有地方入口不重複建卡；同網址會被判定為「補充原卡」 |

**與 PR #10 的關係**：PR #10 改的是 12 個長期官方查詢入口的主題頁文字列（`qaPortalSection`）。本分支不改那段程式；新資源若與 12 個長期入口或活動公告同網址，建置會直接失敗並請編輯決定，不會重複出現。已用 `git merge-tree` 確認本分支與 PR #10 可無衝突合併。

## 二、匯入佇列：`docs/QA-EXPANSION-IMPORT-QUEUE.json`

建置 QA 時只讀這一個檔（載入器 `scripts/lib/qa-expansion.mjs`）。一般預覽與正式版完全不讀。

### 文章欄位

| 欄位 | 說明 |
| --- | --- |
| `id` | 編輯編號（exp-01、A1…），全佇列唯一 |
| `slug` | 文章網址 `articles/<slug>.html`，必須 `exp-` 開頭；**上 QA 後不要再改** |
| `title` | 必須與原稿 `# NN｜` 後的標題完全相同（防止改錯篇） |
| `category` | 六大分類 id：`life-family`、`career`、`health`、`law`、`city`、`learning`；原稿若有分類行須一致 |
| `sourceFile`、`heading` | 原稿路徑（docs/ 內）與兩位數編號 |
| `directory` | `none`（只在六大主題、文章頁、搜尋）／`readli`（另接在讀利 23 篇之後）／`toward`（另接在向光 13 篇之後）。未經站主確認一律 `none` |
| `related` | 相關閱讀 slug（必須是已存在的文章） |
| `sourceCheck` | `pending` 或 `source-checked` |
| `sourceCheckedOn` | 來源查核日期（YYYY-MM-DD），會顯示在文章頁 |
| `sourceCheckRecord` | docs/ 內的查核紀錄檔路徑 |
| `importToQa` | 只有 `true` 且完成查核才會進 QA |

### 官方資源欄位

`id`、`name`、`url`、`category`、`regions`（`["national"]` 或縣市 id 清單）、`purpose`、`caution`、`languages`（選填，實際有該語言內容才填）、`sourceCheck`、`sourceCheckedOn`、`sourceCheckRecord`、`importToQa`；縣市資源另需 `serviceTypes`（既有服務類型）與 `entryType`（入口層級）。

### 三種資源呈現（依站主網址規則自動判斷）

1. **網址與既有卡片完全相同** → 不建新卡，在原卡加一行「補充：…」與未核准標示，搜尋併入原卡。
2. **網址不同、全國性** → 所屬主題頁官方資源區下方的「更多官方入口」文字列（44px 可點、另顯示地區／語言／注意事項／查核日期）。
3. **只服務特定縣市** → 城市頁資源卡，選該縣市時才在「在地服務」出現。

## 三、下一批文章交付後怎麼直接整合

1. 編輯把修好的原稿放在 docs/（沿用 `# 01｜標題`；分類行 `**建議分類：生活與家庭｜…**` 可有可無；來源用單行 `**正式來源**：[名稱](https://…)；…` 或 `### 官方來源…` 清單皆可）。原稿最後若有批次說明，在佇列 `sourceFiles` 填 `stopAt`。
2. 為該批寫一份查核紀錄（docs/），列出逐句核對結果與日期。
3. 在佇列只把這一批改成 `sourceCheck: "source-checked"`、填日期與紀錄檔、`importToQa: true`；`directory` 依站主決定。
4. 執行 `npm run qa-preview` 本機看，`npm test` 跑全部測試。建置若有任何格式、分類、標題、網址重複問題會直接停下並列出原因。
5. 開 PR、等 CI（含 WebKit）全綠 → 站主手機／電腦試讀 → 站主另行同意才部署公開 QA。**正式發布仍需另走 release-approvals 流程。**

## 四、保護既有網站

- 佇列全部未開啟時，dist-qa／dist／dist-production 的所有 HTML、搜尋索引、腳本與 main 逐位元組相同，只有 main.css 多了 QA 才用到的樣式。
- 讀利 23 篇、向光 13 篇與八索引順序不變；擴充文章只在 `directory` 指定時接在最後。
- 首頁小日曆、活動頁、城市福利六篇與縣市查詢不變。
- 擴充內容一律「待確認／not-approved」，頁面顯示「未核准測試內容」、全站 noindex；正式版即使誤設 `QA_EXPANSION_QUEUE` 環境變數也不讀佇列。

## 五、測試

新增 `tests/qa-expansion.test.mjs`（已加入 `npm test`），以 `tests/fixtures/qa-expansion/` 的範例佇列建出 `dist-qa-expansion` 驗證：獨立網址、來源、日期、分類、搜尋、相關閱讀、讀利／向光接續、三種資源呈現、城市篩選、未查核項目不出現、12 種錯誤情境會擋下、Chromium（CI 另加 WebKit）320／375／390／1280px 無水平溢位。原有 QA 測試改為只核對原 36 篇，開啟擴充文章後仍可直接通過。

## 六、尚待確認

- 各文章 slug 為工程暫定，開啟前請站主／編輯確認（上 QA 後不宜再改）。
- 擴充文章是否放入讀利或向光（`directory`），需站主逐篇決定。
- NI-08～13 的 `serviceTypes` 暫填「綜合政府服務」、`entryType` 暫填「縣市新住民服務入口（層級待查核）」，查核時請改成實際層級。
- 測試通過不等於站主手機視覺驗收，也不等於正式發布核准。
