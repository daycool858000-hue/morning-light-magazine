# exp-12 站主撤稿紀錄（2026-10-17）

> 本檔是編輯決定紀錄，不是來源查核結果，也不是正式發布核准。`content/release-approvals.json` 未因此變更。

## 撤下的文章

| 欄位 | 內容 |
|---|---|
| 文章編號 | exp-12 |
| 標題 | 同一個生活實驗，換了條件，結果還能直接比較嗎？ |
| Slug | `exp-compare-everyday-experiments`（舊未上線 slug `exp-reading-popular-science`，從未公開） |
| 原目錄／分類 | 向光（toward）／學習與活動（learning） |
| 原稿 | `docs/EXPANSION-BATCH10-REMAINING-SIX-ARTICLES-V2-2026-10-17.md` 第 12 篇（**保留，不刪除**） |
| 歷史查核紀錄 | `docs/FIRST-FOUR-EXPANSION-ARTICLES-EDITORIAL-QA-DECISION-2026-10-17.md`（AI 編輯查核，**保留**） |

## 決定

- **決定者**：站主（網站擁有人）。
- **日期**：2026-10-17。
- **理由**：站主完成第一輪公開 QA 試讀，已閱讀本篇全文，確認不需要保留。屬站主主動撤稿的**編輯決定**，不是來源查核失敗，也不代表原稿有事實錯誤。

## 曾經上架的紀錄（保留，不抹除）

- 本篇曾隨「九篇公開 QA 試讀」上公開 QA：QA 分支 `qa/public-nine-articles-20261017`，部署工作流程 run `38995630481`（提交 `d13ee71`）success，之後的 QA 分支最新提交為 `15a4621`。
- 當時公開 QA 共 45 篇（讀利 26、向光 19）。

## 撤下後的狀態

- 匯入佇列 `docs/QA-EXPANSION-IMPORT-QUEUE.json`：exp-12 改為 `importToQa: false`，並加上 `qaWithdrawal`（`status: withdrawn-by-owner`、`doNotReimport: true`、指向本檔）。原本的 AI 查核欄位（`sourceCheck`、`sourceCheckedOn`、`sourceCheckRecord`）保留為歷史，不改寫。
- 載入器 `scripts/lib/qa-expansion.mjs`：有 `qaWithdrawal` 的項目若被改回 `importToQa: true`，QA 建置直接失敗，避免日後自動匯入時重新出現。
- 公開 QA 建置（dist-qa）中**不再產生**：文章獨立頁 `articles/exp-compare-everyday-experiments.html`（GitHub Pages 更新後此網址回 404，不提供正文、也不另做轉址頁）、向光文章格卡片、學習與活動分類頁文章卡、站內搜尋索引項目、任何頁面的連結或推薦。dist-qa 原本就沒有 sitemap.xml（`robots.txt` 為 `Disallow: /`），所以不需另外移除。
- 撤下後公開 QA 為 **44 篇**：原 36 篇＋八篇擴充（讀利 exp-01、exp-08、B4；向光 exp-11、A1、A2、A4、B5）；讀利 **26**、向光 **18**。
- 歷史暫存測試（`docs/QA-EXPANSION-STAGING-FIRST-FOUR-2026-10-17.json`、`docs/QA-EXPANSION-STAGING-NINE-2026-10-17.json` 及對應測試）只在隔離輸出資料夾模擬當時狀態，保留不改；不會部署。
- 不影響 PR #11 編輯研究分支；本檔只在工程整合分支新增。

## 若日後要恢復

必須由站主另行明確同意：移除 `qaWithdrawal`、恢復 `importToQa: true`，並更新公開 QA 部署檢查中的數量與啟用清單。不得由自動化流程或 AI 自行恢復。
