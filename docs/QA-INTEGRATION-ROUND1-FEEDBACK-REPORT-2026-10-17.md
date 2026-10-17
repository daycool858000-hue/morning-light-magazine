# 第一輪公開 QA 試讀回饋｜整合驗收報告（2026-10-17）

> 工程整合分支：`claude/morning-light-qa-integration-kd06lm`（以 PR #15 `7c921a5` 為基礎）。
> **未部署公開 QA、未合併 main、未修改 `content/release-approvals.json`、未動 PR #11、未匯入其他 13 篇或 60 筆城市研究候選。**
> 所有內容仍是「未核准測試內容」＋ noindex；CI 與 AI 查核都不等於站主核准。

## 一、四項任務完成情形

| 任務 | 狀態 | 重點 |
|---|---|---|
| 一、正式撤下 exp-12 | 完成 | 佇列停用＋站主撤稿紀錄；載入器擋下重新匯入；44 篇（讀利 26／向光 18） |
| 二、小日曆遮擋 | 完成 | 一般連結改避開「每一行實際文字」；捲動中不移動、停下 0.12 秒後一次調整 |
| 三、懷孕與生育入口整合 | 完成（沿用 PR #15，未改寫內容） | 整合後 16＋48 項測試全過；九筆官方入口保留 |
| 四、「待查核」標示 | 完成盤點＋QA-only 說明文字 | 59 筆分三層；資料狀態與核准規則未變 |

## 二、任務一：exp-12 撤下

- 決定紀錄：`docs/QA-EXP-12-OWNER-WITHDRAWAL-2026-10-17.md`（站主主動撤稿，屬編輯決定；保留原稿、AI 查核紀錄與曾上公開 QA 的歷史：部署 run `38995630481`）。
- 佇列 `docs/QA-EXPANSION-IMPORT-QUEUE.json`：exp-12 `importToQa: false`＋`qaWithdrawal`（`withdrawn-by-owner`、`doNotReimport: true`）；新增一條規則說明。
- 載入器 `scripts/lib/qa-expansion.mjs`：有 `qaWithdrawal` 卻被改回 `importToQa: true`，或撤稿紀錄缺漏，建置直接失敗（測試已驗證）。
- 公開 QA 建置中已不存在：文章網址 `articles/exp-compare-everyday-experiments.html`（部署後回 404，不提供正文）、向光文章格、學習與活動分類頁、站內搜尋索引、相關文章／推薦連結、任何頁面文字；dist-qa 原本就沒有 sitemap（robots `Disallow: /`）。全站 dist-qa 檔案掃描 slug、標題、「生活實驗」皆 0 筆。
- 頁首 QA 提示列「最新擴充 9 篇」改為「8 篇」。
- 其餘八篇：文章本體（標題、查核標示、正文、來源）與撤稿前 45 篇暫存版逐位元組相同；原 36 篇整頁逐位元組相同。
- 測試與部署檢查更新：`tests/qa-public-nine.test.mjs`（12 項：八篇啟用、撤稿紀錄、重新匯入被擋、44 篇、讀利 26／向光 18、全站無殘留、其餘正文未改寫）、`tests/prepare-public-qa-legacy.mjs`（歷史基線仍關閉九篇）、`tests/qa-expansion.test.mjs`（記憶體解析試跑保留 exp-12 原稿解析，不代表匯入）、`.github/workflows/qa-public-preview.yml`（8 篇／44 篇／向光 18、exp-12 不存在、懷孕閱讀區四段且不進 production）。
- 歷史暫存測試（第一批四篇、九篇 45 篇）保留原斷言，只在隔離資料夾模擬當時狀態，不部署。

## 三、任務二：小日曆避讓

**原因**：`src/qa-assets/js/qa-calendar.js` 對一般連結只保護中央 8×8px；長連結（例如 390px 的「勞保局｜未參加相關社會保險者生育補助 Q&A」）中央在左邊，右側文字仍被蓋住。

**修正（只改這支 QA-only 腳本，外觀、尺寸、3 秒進場與常駐行為不變）**：

1. 一般連結改用文字節點的實際行框（`Range.getClientRects()`），每一行都避開；裁切到連結本身範圍，被省略號截掉的隱形文字不算。
2. 依序嘗試：完整避開 → 縮成既有的 44px 圖示 → 退回原本「只避開中央」→ 縮小後只避開中央，確保不會比舊版差。
3. 捲動中不移動，停下約 0.12 秒後一次調整到位（避免邊捲邊跳）；頁面高度改變（搜尋結果、展開收合）時用 ResizeObserver 重新檢查。
4. 只檢查與小日曆同一欄的元素，效能負擔小。

**驗證**：新增 `tests/qa-calendar-avoid.test.mjs`（`npm run test:calendar`，CI 另開並行工作 `calendar`）。15 頁（5 篇文章含長來源連結、六大主題頁、讀利、向光、活動、首頁）＋3 組搜尋結果＋懷孕與生育閱讀區，320／375／390／1280px 逐段捲動並停下檢查。

| Chromium（本機） | 修正前（舊版 dist） | 修正後 |
|---|---|---|
| 320px | 61 處蓋住連結文字 | 0（停點 341，暫縮 44px 2 次） |
| 375px | 66 處 | 0（停點 309） |
| 390px | 55 處 | 0（停點 301） |
| 1280px | 4 處 | 0（停點 159） |
| 連續捲動中位置不變 | 320／375px 停下後仍蓋住 | 四種寬度皆不動、停下後不重疊 |

另：`tests/qa-batch2.test.mjs` 原本捲動後只等 40ms 就檢查，配合「停下後才調整」改等 260ms（檢查條件不變）。WebKit 結果見下方 CI。

**截圖（同一連結、同一畫面高度，左＝修正前、右＝修正後，390px）**：`docs/qa-media/calendar-avoid-2026-10-17/`

- `calendar-390-pregnancy-labor-insurance-before-after.png`：懷孕與生育「勞保局｜未參加相關社會保險者生育補助 Q&A」
- `calendar-390-pregnancy-egov-before-after.png`：「我的E政府｜安心懷孕及友善生養」
- `calendar-390-article-sources-before-after.png`：文章頁參考來源長連結
- `calendar-390-health-articles-before-after.png`：身心健康主題頁文章標題連結

CI 另上傳 Chromium／WebKit 各寬度懷孕閱讀區截圖（artifact `qa-calendar-avoid-screenshots`）。

## 四、任務三：懷孕與生育入口

沿用 PR #15 全部內容，未重寫。整合後檢查：主題 01「整理中」已改為「查看孕期與生育資訊整理 →」、點擊到 `#pregnancy-guide`；四段、九筆官方原頁連結（另開新視窗、附用途）保留；育兒津貼 `#childcare`、托育 `#daycare`、產假／孕婦保護 `law.html#…`、城市福利站內連結目標都存在；閱讀區無資源卡、圖片、表單；文章總數 44 不含任何新文章；preview／production 不含閱讀區。`tests/qa-pregnancy-guide.test.mjs` 16 項、`tests/qa-pregnancy-browser.test.mjs` Chromium 48 項全過（WebKit 見 CI）。外站連結沿用 PR #15 的 run `39000239040` 結果，本次未改連結。

## 五、任務四：「待查核」標示

詳見 `docs/QA-REVIEW-STATUS-LABEL-INVENTORY-2026-10-17.md`（59 筆逐筆證據）。摘要：① 尚未完成來源查核 3 筆（維持「待查核」）、② AI 已核對、待站主審閱 35 筆（改顯示「AI 已核對來源｜尚未經站主審閱」）、③ 已依既有程序確認 21 筆（顯示與正式版相同的「…已核對（AI 協助）」＋站主整批核准範圍）。只改 QA 畫面說明，`status`／`checkedAt`／`release-approvals.json` 全部未改；一般預覽與 production HTML 逐位元組不變。查核資格或核准規則的變更列為待決，未擅自處理。

## 六、整批驗收

| 項目 | 結果 |
|---|---|
| `npm test`（本機 Chromium） | 215 項全過，exit 0（含 site 44、release-gate、qa-batch2 51、擴充 19、四篇 9、九篇 9、公開QA 12、懷孕 16、查核標示 6、懷孕瀏覽器 48） |
| `qa-calendar-avoid`（本機 Chromium） | 16 項全過 |
| QA 部署前檢查（本機模擬，不部署） | 通過；並修正 `! grep` 在 `set -e` 下不會讓步驟失敗的問題（加上 `|| exit 1`，已用假殘留檔確認會失敗） |
| WebKit 320／375／390／1280 | 由 CI 執行（本機無 WebKit），結果見 CLAUDE.md 與 PR |
| production 隔離 | dist-production HTML 與修改前逐位元組相同（僅 main.css 多一個未使用的 `.badge-ai`）；release-approvals blob `5c4d0532…` 不變 |

## 七、視覺規範符合程度

- 小日曆外觀、尺寸、色彩、圖示、進場動畫與常駐行為完全未改；只改位置判斷。暫縮成 44px 圖示是原本就有的退回狀態。
- 新增 `.badge-ai` 沿用既有徽章形狀，低彩度橄欖綠、虛線外框，與「已確認」「待查核」可區分，對比約 7:1。
- 文章、目錄、主題頁版面未改；撤稿只是少一張向光卡與一張學習與活動文章卡。
- 自動化測試與截圖不等於站主視覺驗收；仍需站主 iPhone 實機確認。

## 八、是否具備更新公開 QA 的條件

工程面具備（待 CI 全綠）。**注意**：本分支修改了 `.github/workflows/qa-public-preview.yml`，一旦併入 `qa/public-nine-articles-20261017`，該工作流程就會觸發公開 QA 部署；因此必須等 ChatGPT 最後確認、站主明確同意後才能合併草稿 PR。
