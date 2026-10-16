# 第四組三篇導讀｜QA 匯入映射與去重規格（2026-10-16，只寫規格）

- 對應：GitHub Issue #1 工作 C。
- 來源稿：`docs/BATCH4-ART-CULTURE-INSURANCE-CASHFLOW-DRAFTS-2026-10-16.md`（ChatGPT 撰寫，AI 第一輪查核）。
- **狀態：只準備規格，沒有寫載入器，沒有放進 QA 建置、`content/`、核准快照或公開 QA。** 站主同意這三篇的具體批次後，才依本規格實作。
- 另有 `docs/BATCH4-SIX-GUIDES-ART-FINANCE-BUSINESS-2026-10-16.md` 六篇；不在本 Issue 的工作 C 範圍，本文件未處理。

## 一、現有 QA 文章資料模式（實作時沿用）

第三批文章在 `docs/BATCH3-OPEN-ACCESS-CONTENT-2026-10-15.json` 以 JSON 儲存，載入器 `scripts/lib/qa-batch3.mjs` 會檢查下列欄位：

| 欄位 | 第三批範例 | 第四組建議 |
|---|---|---|
| `slug` | `batch3-learn-free`（須符合 `^batch3-[a-z0-9-]+$`） | `batch4-…`，見下表 |
| `category` | 六大分類 id（`learning` 等） | 見下表；不新增分類 |
| `title`、`summary`、`body` | 原創正文 | 標題取原稿 `# NN｜` 後文字；摘要取正文第一句；正文只取各篇小標與段落 |
| `sourcesList` | `[{title, url}]` | 取各篇「參考來源」清單 |
| `status`／`publishApproval`／`qa` | `待確認`／`not-approved`／`true` | 相同，不得改為已核准 |
| `checkedOn`／`updated`／`published` | `2026-10-15`／`2026-10-15`／`2026-10` | `2026-10-16`／`2026-10-16`／`2026-10` |

## 二、三篇的映射

| 原稿 | 建議 slug | 分類（id） | 主題（既有 topic id） | 來源數 | 圖片 |
|---|---|---|---|---|---|
| 01｜在家也能逛故宮？從線上典藏開始看一件文物 | `batch4-npm-online-collection` | 學習與活動（`learning`） | `open-learning` | 3 | 無；不使用故宮典藏圖、館徽或截圖 |
| 02｜保險到底在保障什麼？先分清壽險、醫療險、意外險與儲蓄型商品 | `batch4-insurance-basics` | 生活與家庭（`life-family`） | `family-finance` | 4 | 無；不使用保險業者商標 |
| 03｜生意有營業額，為什麼還會缺現金？從帳款、庫存與週轉理解 | `batch4-business-cashflow` | 職涯與創業（`career`） | `startup-guidance` | 3 | 無 |

文章卡片採現有純文字樣式（`story-text`），與第二、三批相同。

## 三、轉換規則（原稿格式與第二批不同，實作時要另寫）

1. 篇與篇以 `# NN｜標題` 分隔；「## 上 QA 前的批次驗收要求」以後整段**不匯入**。
2. 分類行格式為 `**分類：** 學習與活動　**形式：** …　**發布：** 待核准`（冒號在粗體內、全形空白分隔），只取分類名稱，整行不進正文。
3. 來源標題行有三種寫法：`**官方參考來源（…）：**`、`**官方／專業法人參考來源（…）：**`、`**官方來源（…）：**`，其後為 `- [標題](網址) — 說明` 清單。清單轉為 `sourcesList`，破折號後的說明不進標題；這幾行不進正文。
4. 以下編輯備註**不進正文**：`**尚待核定：**`、`**編輯說明：**`、`**待核准事項：**`、原稿分隔線 `---`。
5. 第 02 篇的「保發中心是專業法人，不直接視為金管會官網」屬給站主的編輯說明，不公開；正文中的機構描述照原稿保留。

## 四、去重結果（程式比對，2026-10-16）

比對範圍：正式 18 筆（`content/resources.json`）、QA 第二批 23 筆、QA 第三批 9 筆與 5 篇文章來源、`docs/` 內第三批候選 JSON（多元、人身安全）、理財／創業與第四組六篇文稿的來源。

| 第四組來源網址 | 與既有資料完全相同 | 處理建議 |
|---|---|---|
| `digitalarchive.npm.gov.tw/Collection` | 無（同網域見於規劃文件） | 只作文章來源 |
| `digitalarchive.npm.gov.tw/opendata/` | 同一網址見於 `NEXT-CONTENT-DEPTH…` 規劃文件 | 只作文章來源 |
| `www.npm.gov.tw/` | 無 | 只作文章來源 |
| `www.tii.org.tw/tii/comsumer/what/index.html` | 同一網址見於規劃文件 | 只作文章來源 |
| `www.tii.org.tw/tii/insurance/insurance7/index.html` | 無 | 只作文章來源 |
| `insprod.tii.org.tw/` | 無 | 只作文章來源 |
| `law.fsc.gov.tw/` | 無 | 只作文章來源 |
| `startup.sme.gov.tw/…/faq/detial.php?sId=198` | 同一網址見於 `FINANCE-ENTREPRENEURSHIP-STARTER…` 文稿 | 只作文章來源 |
| `startup.sme.gov.tw/…/news/detial.php?sId=1343` | 無（同網域見於理財／創業文稿） | 只作文章來源；原稿已註明為歷史文章 |
| `startup.sme.gov.tw/…/faq/detial.php?sId=243` | 無（同網域見於理財／創業文稿） | 只作文章來源 |

結論：

- **與正式 18 筆及 QA 已上線的 23＋9 筆資源，0 筆網址重複。**
- 3 個網址與其他 docs 研究文稿相同，屬同一官方來源被不同文章引用，可以各自在文章中引用，**不需要也不建議**另建資源卡。
- 本規格**不新增任何資源卡**；第 03 篇可在文末文字提及既有正式資源「經濟部」，不另造卡片。
- 「詳細」拼字 `detial` 是新創圓夢網實際網址的寫法，不要「修正」。

## 五、站主同意後的實作清單（預估改動範圍）

1. 新增 `scripts/lib/qa-batch4.mjs`：只讀上述原稿，依第三節規則轉成文章物件，檢查 3 篇、slug 格式、分類、來源皆為 https、狀態未核准；正式與一般預覽模式不呼叫。
2. `scripts/build.mjs`：`--mode=qa` 時加入第四組文章（與第二、三批同一路徑）。
3. `tests/qa-batch2.test.mjs`：隔離標記加入第四組標題與 slug；檢查三篇頁面、分類、來源、搜尋索引、讀利專欄連結數、無編輯備註。
4. **不修改** `qa-public-preview.yml`；公開 QA 是否重新部署由站主另行決定。
5. CI（Chromium、QA、WebKit）全部通過後，才給站主 iPhone 驗收新文章頁。
