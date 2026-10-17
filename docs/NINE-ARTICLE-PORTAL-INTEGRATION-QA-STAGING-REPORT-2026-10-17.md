# 九篇擴充文章＋PR #10 官方查詢入口｜整合 QA 暫存報告（2026-10-17 更正版：九篇全部進暫存，45 篇）

**日期：2026-10-17｜工程分支：`claude/nine-articles-portal-qa-6i6jys`（承接 PR #13 `claude/qa-nine-articles-portals-staging-20261017` 的 `52685ab`）**
**狀態：只完成整合與獨立暫存環境模擬。未部署 GitHub Pages、未合併 main、正式匯入佇列九篇仍 `importToQa: false`／`pending`、未修改 `content/release-approvals.json`。**
**本報告是 AI 工程端驗收；不等於站主人工審稿，也不是正式發布核准；CI 成功不等於內容核准。**

## 零、本次更正摘要

- PR #13 原本只放 7 篇（43 篇），A1、B5 列為「來源待修」。ChatGPT 直接開啟官方原文的獨立複核（`docs/EXPANSION-A1-B5-B4-INDEPENDENT-PRIMARY-SOURCE-RECHECK-2026-10-17.md`）證明那些待修理由是 Claude 容器無法連外造成的誤判；B4 的日期修改建議也被經濟部原文推翻。來源查核紀錄 `docs/NINE-ARTICLE-QA-STAGING-SOURCE-REVIEW-2026-10-17.md` 已全面改寫。
- **九篇全部進入獨立暫存：共 45 篇；讀利 26、向光 19。** B4 依站主指示由向光改放讀利。
- 編輯版本同步（只取 PR #11 最新文章修正與查核紀錄）：`f8e4f3a`（A1 第三輪來源標「非政府網域」）、`7abb900`（B4「自行訂製服裝」）、`d5fe0ae`＋`1190f1e`（獨立複核紀錄）。PR #11 之後新增的城市研究（`66f6443`、`02e265e`）**未同步**，兩分支不再逐位元組相同；日後若合併，需核對城市資料、文章修正與 CLAUDE.md，避免覆寫最新編輯成果。歷史版本原稿全部保留。
- 連結檢查器改為四類分類，並修正「有未開啟網址仍 exit 0」造成的誤讀（見第四之二節）。

## 一、三個 PR 與暫存分支的合併檢查（PR #13 建立時紀錄）

| 來源 | 最新提交 | 合併結果 |
| --- | --- | --- |
| PR #10 `feature/qa-portal-single-url-20261016` | `2592afd` | **無衝突**。`scripts/lib/qa-portal-routing.mjs`、`build.mjs` 的 `qaPortalSection`、`main.css` 文字列樣式、QA／WebKit 斷言全部帶入 |
| PR #11 `editorial/youji-full-six-topics-expansion-20261016` | `c9a5111` | **僅 `CLAUDE.md` 衝突**，已保留雙方最新段落（見第二節）；30 份 docs／manifest 全部帶入 |
| PR #12 `claude/qa-expansion-v2-reconcile-20261017` | `8dce66c` | 已包含在第一批暫存分支內，無需另外合併 |
| `claude/first-four-articles-qa-staging-l0ntyf` | `37a3cc8` | 作為整合基底，第一批四篇工程、測試與截圖原封保留 |

**原稿版本一致性**：`BATCH9-PRIORITY-THREE-ROUND3-…`（A1／A2 第三輪）、`BATCH9-FIRST-FOUR-ARTICLES-ROUND2-…`（A4 第二輪）、`BATCH7-9-REMAINING-SIX-ARTICLES-ROUND2-…`（B4／B5 第二輪）、兩份 V2 與 22 篇 manifest，與 PR #11 最新版**逐位元組相同**（`git diff` 無差異），沒有使用較舊的複本。（此為 PR #13 建立當時的狀態；本輪只再同步 `f8e4f3a`、`7abb900` 兩處文章修正，PR #11 之後新增的城市研究未同步，現已不再全部逐位元組相同，見第零節。）

## 二、CLAUDE.md 衝突處理

衝突區只有一處（第 53–105 行）。兩側都是新內容，**全部保留、沒有用任何一方覆蓋整份文件**：

- 保留 PR #10 的「12 筆長期查詢入口第二階段｜站主決定與 QA 工作中」整段。
- 保留 PR #11 的六段：2026-10-17 PR #12 驗收與第一批 QA 編輯決策、城市研究與 Claude 接軌、第二輪內容編輯進度、編輯工作實際進度、最新編輯分支狀態。
- 另在檔案最前面新增「最新權威狀態｜2026-10-17 九篇文章＋PR #10 入口整合暫存」，說明本輪範圍與界線。

## 三、九篇文章的實際整合狀態

| 編號 | 文章 | 網址（slug） | 原稿版本 | 分類（不變） | 目錄 | 狀態 |
| --- | --- | --- | --- | --- | --- | --- |
| exp-01 | 一起生活，家庭共同費用與自己的錢怎麼分開記？ | `exp-household-shared-budget` | V2 | 生活與家庭 | 讀利 | 暫存開啟 |
| exp-08 | 朋友、家人和工作夥伴之間，界線可以怎麼說清楚？ | `exp-personal-boundaries` | V2 | 身心健康 | 讀利 | 暫存開啟 |
| B4 | 「棉 100%」就一定好穿嗎？看懂衣物成分與洗標的兩種用途 | `exp-clothing-labels` | 第二輪（含 `7abb900`） | 生活與家庭 | **讀利** | 暫存開啟 |
| exp-11 | 一門免費課程適不適合自己？可以先試學一小段 | `exp-choosing-open-courses` | V2 | 學習與活動 | 向光 | 暫存開啟 |
| exp-12 | 同一個生活實驗，換了條件，結果還能直接比較嗎？ | `exp-compare-everyday-experiments` | V2 | 學習與活動 | 向光 | 暫存開啟 |
| A1 | 婦女中心有什麼課可以學？體驗、講座與培力的差別 | `exp-women-center-courses` | 第三輪（含 `f8e4f3a`） | 學習與活動 | 向光 | **暫存開啟（待修理由已撤銷）** |
| A2 | 家庭教育只談教養孩子嗎？成年家人之間也有要學的事 | `exp-family-education-adults` | 第三輪 | 生活與家庭 | 向光 | 暫存開啟 |
| A4 | 地方活動不只有節慶：走進展覽、講座與工作坊，各能帶回什麼？ | `exp-local-events-formats` | 第二輪 | 學習與活動 | 向光 | 暫存開啟 |
| B5 | AI 回答得很完整，為什麼來源仍要自己打開？從一則生活資訊談查證 | `exp-ai-answer-verification` | 第二輪 | 學習與活動 | 向光 | **暫存開啟（待修理由已撤銷）** |

**暫存環境共 45 篇**＝原 36 篇＋九篇。來源逐項證據見來源查核紀錄第一、二節。

## 四、PR #10 官方查詢入口整合與去重結果

- **11 筆不同網址**的長期官方查詢入口，依 `scripts/lib/qa-portal-routing.mjs` 的唯一映射回到六大主題頁，以**精簡文字列**（`.qa-portal-list`，44px 可點）呈現，不新增大型機構卡：職涯與創業 `act-01`／`act-02`／`act-03`；生活與家庭 `act-04`／`act-08`；法律與權益 `act-05`；身心健康 `act-06`／`act-07`；學習與活動 `act-10`／`act-11`／`act-12`。
- **1 筆同網址**：`act-09` 文化部藝文活動平台與既有 `open-culture-events` 卡網址完全相同 → **不建新卡**，沿用原卡並在 QA 補一句用途；活動頁該筆連結改指向 `learning.html#res-open-culture-events`。
- 自動化斷言：同一網址不得在同一主題頁出現超過一次；`act-09` 不得另建文字入口；文字入口數必須正好 11 筆。整合後與新增九篇文章並存，無衝突。
- 讀利、向光的視覺設計與既有六大主題版面未變動。

## 四之二、連結檢查（run `38990419022`，GitHub 美國機房 Chromium）

九篇來源共 **23 個不同網址**：

| 類別 | 筆數 | 說明 |
| --- | --- | --- |
| 正常開啟 | 21 | 含 A1 六筆、B5 兩筆、B4 兩筆全部成功 |
| 下載型連結 | 1 | exp-12 `ntsec.gov.tw/article/FileAtt.ashx?id=6193`：Playwright 回報「Download is starting」，屬檔案下載，不是網址失效 |
| 海外逾時／受阻 | 1 | A2 `familyedu.moe.gov.tw/faqList.aspx?pid=1071&uid=1072`：美國 runner 逾時；臺灣 iPhone 曾驗收可正常開啟家庭教育資源網，**不刪除、不替換** |
| 真正失效 | 0 | — |

**舊版檢查器即使有未開啟網址仍 exit 0，所以該 run 的 success 不代表 23 個網址全部通過。** 本輪修正 `scripts/check-links-browser.mjs`：
- 每筆標示 ✔ 正常開啟／⇩ 下載型連結／… 海外逾時或受阻／✘ 真正失效，結尾列四類數量。
- 下載型連結改用 HTTP 讀取狀態、檔案類型與大小（不輸出內容）。
- 只有 404／410、網域不存在、憑證錯誤才算真正失效；逾時、403、防護頁一律歸「海外逾時／受阻」，不得據此刪除來源。
- 新增 `--fail-on-broken`，`qa-links-browser.yml` 九篇步驟使用（只有真正失效才讓步驟失敗）；其他組別維持只報告。
- 本機以臨時 HTTP 伺服器驗證：下載回應確實丟出「Download is starting」，改用 HTTP 讀取得到 `200 application/pdf`；404 正確判為真正失效。

## 五、技術與視覺測試結果

| 測試 | 內容 | 本機結果 |
| --- | --- | --- |
| `tests/site.test.mjs` | 正式版 44 項 | ✔ 44／44 |
| `tests/release-gate.test.mjs` | 發布閘門 | ✔ 通過 |
| `tests/qa-batch2.test.mjs` | QA 全部檢查（原 36 篇、城市、活動、小日曆、PR #10 入口） | ✔ 51／51 |
| `tests/qa-expansion.test.mjs` | 匯入機制 | ✔ 19／19 |
| `tests/qa-expansion-first-four.test.mjs` | 第一批四篇暫存（第二批目錄斷言改為 B4 讀利） | ✔ 9／9 |
| `tests/qa-expansion-nine.test.mjs` | 九篇 45 篇整合暫存（見下） | ✔ 9／9 |
| WebKit（`test:webkit`、`test:webkit-qa`、九篇測試的 WebKit 段） | Safari 模擬 | 由 CI 執行（本機無 WebKit） |

本機 `npm test` 合計 **133 項全部通過（exit 0）**。CI 結果見草稿 PR。

`qa-expansion-nine.test.mjs` 涵蓋：
1. 九篇正文與最新原稿逐行一致（A1／A2 第三輪、A4／B4／B5 第二輪、exp 四篇 V2），並確認 A1「非政府網域」標示、B4「自行訂製服裝」與「2023 年 5 月 18 日生效」原樣出現。
2. 九篇來源筆數（1／2／2／3／6／3／2／2／2）、標題、網址完整且順序一致，合計 23 個不同網址。
3. 編輯註記（建議閱讀入口、編輯對應、交叉顯示、候選未核准、佇列欄位等）不外露。
4. 原 36 篇文章頁與首頁、支援、活動、搜尋、城市、職涯、法律頁和 `dist-qa` 逐位元組相同。
5. 讀利 23→26（exp-01、exp-08、B4 接最後），向光 13→19（exp-11、exp-12、A1、A2、A4、B5 接最後），八索引不變，兩目錄互不重複。
6. 六大主題分類頁連結與搜尋索引都有九篇；搜尋以標題關鍵字可找到並開啟九篇。
7. PR #10 官方入口 11 筆文字入口＋`act-09` 沿用文化部卡（11＋1）去重保留。
8. 暫存佇列不可建置到 `dist-qa`；`dist-production` 與 `dist-qa` 都不含九篇任何一篇；正式佇列九篇仍關閉。
9. 九篇都有「未核准測試內容」、AI 查核日期與 `noindex, nofollow`；暫存版 robots 全站 Disallow。
10. Chromium（CI 另加 WebKit）320／375／390／1280px：九篇文章、讀利、向光、生活與家庭、身心健康、學習與活動、城市頁無水平溢位、內文 ≥ 15px、來源與官方入口不超出畫面且點擊高度 ≥ 44px、新卡與原卡尺寸一致、無 JavaScript 錯誤。

### 視覺規範符合程度

- 未改品牌、色彩、字級與已驗收的手機／桌機架構；未新增樣式；新文章沿用既有文章頁、讀利精簡清單、向光低彩度文章卡。
- 桌機向光 19 張四欄排列，最後一列 3 張屬正常，未為填滿而新增或重複內容。
- 截圖（Chromium，**不代表站主已驗收**）：`docs/qa-media/nine-staging-45-2026-10-17/`
  - `chromium-390-*.png`、`chromium-1280-*.png`：A1、A2、A4、B4、B5 文章全頁（exp 四篇內容未變，截圖見 `docs/qa-media/nine-staging-2026-10-17/`）
  - `chromium-390-readli-tail.png`、`chromium-1280-readli-tail.png`：讀利最後一張原卡＋三張新卡
  - `chromium-390-toward-tail.png`、`chromium-1280-toward-tail.png`：向光最後一張原卡＋六張新卡
- 舊 43 篇版截圖保留於 `docs/qa-media/nine-staging-2026-10-17/` 供對照。

## 六、發布界線與下一步

**本輪沒有做**：合併 main、部署 GitHub Pages、開啟正式 QA 匯入佇列、修改 `content/release-approvals.json`、把 AI 查核寫成站主審閱、把 CI 成功當成內容核准。

**下一步（全部需站主或 ChatGPT 先確認）**：
1. ChatGPT 獨立驗收本暫存與截圖。
2. 站主試讀並明確同意後，才把正式佇列對應文章改為 `source-checked`／`importToQa: true`；部署公開 QA 另行同意。
3. 臺灣 iPhone 實際開啟 exp-12 PDF 下載與 A2 家庭教育資源網。
4. 若要合併 PR #11 與本分支，先核對城市研究新增檔與 CLAUDE.md。
