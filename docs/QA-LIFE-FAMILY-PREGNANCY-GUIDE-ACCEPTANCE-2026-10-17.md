# 生活與家庭 01「懷孕與生育相關福利」QA 工程暫存與驗收報告（2026-10-17）

**狀態：工程暫存、等待 ChatGPT 工程驗收及站主確認。未部署公開 QA、未合併 main、未修改 `content/release-approvals.json`。**
本報告的「通過」只代表自動化工程驗收；不是站主人工核准，也不代表逐篇內容可正式發布。

## 一、工作版本

| 項目 | 內容 |
|---|---|
| 工程基礎 | `qa/public-nine-articles-20261017` 最新提交 `15a4621`（已部署公開 QA 的工程版本） |
| 工作分支 | `claude/pregnancy-benefits-content-8sjgqh`（草稿 PR，base 為 `qa/public-nine-articles-20261017`） |
| 編輯權威 | PR #11 分支 `editorial/youji-full-six-topics-expansion-20261016`：`docs/LIFE-FAMILY-PREGNANCY-OFFICIAL-ENTRY-EDITORIAL-PLAN-2026-10-17.md`（未合併、未覆寫，只讀取） |
| 未使用 | PR #13、#14 的較舊工程，不覆寫現有公開 QA |

## 二、實作內容（只在 QA 模式）

1. `life-family.html` 主題索引 01 保留原標題「懷孕與生育相關福利」及 `#pregnancy` 錨點；摘要改為編輯規劃文字，「官方入口整理與查核中。」改為可點擊的「查看孕期與生育資訊整理 →」，連到同頁 `#pregnancy-guide`。
2. 主題索引之後、官方資源卡之前新增單欄閱讀區「懷孕與生育，可以先查哪些資訊？」，四段依序：
   - 01 懷孕期間的產檢與健康照護（PG01、PG02）
   - 02 生育給付：先分清楚自己的保險類型（PG03 勞保、PG04 國保、PG05 未參加相關社會保險；寫明「合計」補足每胎 10 萬元，不是每人另外再領，也不是各保別各領一次）
   - 03 正在工作：產檢假、產假與育嬰留停（PG06、PG07；詳細權益連到 `law.html#parental-leave`、`law.html#pregnancy-protection`）
   - 04 孩子出生後：出生登記與地方生育獎勵（PG08、PG09；地方查詢連到 `city.html`）
   - 結尾站內導流：`#childcare`（育兒津貼）、`#daycare`（托育）、回到 `#pregnancy`；固定說明採編輯規劃原文。
3. 每個官方連結都是實際原頁，附用途說明、機關與適用層級；九個網址彼此不重複，也不與既有資源卡同網址；沒有新增資源卡、圖片、表單或導覽分類。
4. QA 站內搜尋新增「孕期與生育資訊整理」（`life-family.html#pregnancy-guide`），原 `#pregnancy` 主題搜尋保留。
5. 內容資料：`docs/QA-LIFE-FAMILY-PREGNANCY-GUIDE-2026-10-17.json`（`candidate-not-approved`）；載入器 `scripts/lib/qa-pregnancy-guide.mjs` 會擋下：狀態被改成已核准、四段順序變動、非 https 原頁、重複網址、與既有資源卡同網址、非既有錨點的站內連結、「每人另領 10 萬」類錯誤說法。

### 編輯規劃轉成前台文字的處理

規劃中寫給工程的限制句（例如「請不要把公費檢查項目寫成所有自費項目都免費」「不可寫每個人一律再領 10 萬元」）已改寫為給讀者的說明，意思不變；其餘段落、標題、網址、固定說明照規劃使用。

## 三、未變動範圍

- 一般預覽 `dist` 與 production `dist-production`：HTML 與搜尋索引跟修改前逐位元組相同（只有 `main.css` 多出 QA 才用到的選擇器）；仍顯示原本的「官方入口整理與查核中」。
- 公開 QA `dist-qa`：只有 `life-family.html`、`assets/data/search-index.js`、`assets/css/main.css` 改變；45 篇文章頁、讀利（26 篇）、向光（19 篇與八索引）、首頁、小日曆、活動頁及其他分類頁逐位元組相同。
- 生活家庭其他九個主題索引（02～10）的順序與內容逐字不變。
- `content/release-approvals.json`、PR #11 編輯資料、原始文章皆未修改。

## 四、工程驗收

| 檢查 | 結果 |
|---|---|
| 原有 `npm test`（site 44、release-gate、qa-batch2 51、擴充 19／9／9、公開 QA 雙驗收 8） | 本機全部通過，未刪改任何既有測試 |
| 新增 `tests/qa-pregnancy-guide.test.mjs`（靜態 16 項） | 本機通過 |
| 新增 `tests/qa-pregnancy-browser.test.mjs --browser=chromium`（320／375／390／1280，48 項） | 本機通過 |
| 同一測試 `--browser=webkit` | 本機沒有 WebKit，由 CI `npm run test:webkit-qa` 執行，結果見下方 CI 紀錄 |

瀏覽器測試每個寬度都檢查：`#pregnancy` 直接開啟不被頁首遮住、十項索引排列不變、點擊跳到 `#pregnancy-guide`、九個官方連結可見且點擊區 ≥ 44px 不超出畫面、站內延伸連結 ≥ 44px、無水平捲動、點勞保局連結另開分頁前往原網址（以攔截方式確認，不連外站）、`#childcare`／回到索引／`law.html#parental-leave` 導覽、搜尋「產檢」點擊後到達 `#pregnancy-guide`、無 JavaScript 錯誤。

### 截圖（Chromium，本機）

- 修改前後主題 01：`docs/qa-media/pregnancy-topic01-before-390-2026-10-17.png`、`…-after-390-…`、`…-before-1280-…`、`…-after-1280-…`
- 閱讀區全段：`docs/qa-media/pregnancy-guide-chromium-320-2026-10-17.png`、`…-390-…`、`…-1280-…`；手機第一畫面 `…-390-viewport-…`
- WebKit 四種寬度截圖：CI artifact `qa-pregnancy-guide-screenshots`（保存 14 天）

## 五、外部官方連結查核（不得虛構成功）

Claude 雲端容器的網路政策擋下 `.gov.tw`（代理回 403），**Claude 本機未能開啟任何一個官方網址**。下表 AI 證據欄是 PR #11 中 ChatGPT 的紀錄；CI 欄是 GitHub Actions（美國機房）Chromium 的結果，只代表當下能否開啟，不等於臺灣 iPhone／Chrome 實機結果。

| ID | 網址 | ChatGPT 紀錄 | GitHub Actions Chromium | 狀態 |
|---|---|---|---|---|
| PG01 | https://www.hpa.gov.tw/194/s | 官方索引片段；open 曾 internal error | 待 CI | **待驗** |
| PG02 | https://www.hpa.gov.tw/Pages/List.aspx?nodeid=195 | 官方索引可讀；Chrome／Safari 待驗 | 待 CI | **待驗** |
| PG03 | https://www.bli.gov.tw/0109643.html | 原頁可開，2026-07-08 更新 | 待 CI | AI 已開啟 |
| PG04 | https://www.bli.gov.tw/0109942.html | 原頁可讀，2026-06-22 更新 | 待 CI | AI 已開啟 |
| PG05 | https://www.bli.gov.tw/0109943.html | 原頁可讀；當期適用條件仍須核 | 待 CI | AI 已開啟 |
| PG06 | https://www.mol.gov.tw/1607/28162/28166/28268/28270/29101 | 原頁可開 | 待 CI | AI 已開啟 |
| PG07 | https://www.mol.gov.tw/1607/28162/28166/28284/28294/84873/post | 原頁可讀，2026-03-20 更新 | 待 CI | AI 已開啟 |
| PG08 | https://www.gov.tw/News_Content_2_371547 | 原頁可開 | 待 CI | AI 已開啟 |
| PG09 | https://www.gov.tw/News_Content_26_635581 | 原頁可開；逐項地方獎勵日期未核對 | 待 CI | AI 已開啟 |

**全部九筆都尚未經站主臺灣手機或電腦實際點開確認**；PG01、PG02 另有 AI 端無法完整開啟的紀錄。地方生育獎勵未逐縣市核對，頁面也未列任何縣市金額。

## 六、視覺規範符合程度

- 沿用既有暖米白底、陶土橘編號與連結、鼠尾草綠目標高亮、主題索引同樣的細分隔線；無新圖片、無新卡片、無新顏色。
- 手機單欄、正文 0.95rem／行高 1.75，官方連結以左側淡陶土色細線歸組；桌機維持閱讀寬度 760px，不拉成滿版。
- 主題 01 由灰字「整理中」改為一行可點連結，屬小範圍視覺變動，已附修改前後截圖；**視覺最終以站主實機觀感為準，自動化測試通過不等於視覺驗收完成。**

## 七、下一步（需人工決定）

1. ChatGPT 工程驗收本分支與草稿 PR。
2. 站主同意後才更新公開 QA；不得自行部署、合併 main 或寫入正式核准。
3. 站主實機點開九個官方網址（尤其 PG01、PG02），再更新本表。
