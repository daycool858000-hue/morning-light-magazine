# 由己 SELF-AUTHORED（原晨光生活誌）：開發須知

開始任何開發、修改或驗收工作前，必須先閱讀：

1. 《晨光生活誌 V3.0 完整開發總指令》（網站功能、分類、內容與責任界線）。
2. `docs/VISUAL-STANDARD.md`《晨光生活誌》永久視覺設計規範（視覺風格、素材品質與視覺驗收）。
3. `docs/BRAND.md` 品牌識別（前台品牌為「由己 SELF-AUTHORED」）。

規則：

- 兩份規格共同適用，不得互相取代。
- 未經使用者明確同意，不得覆寫、刪除或變更 `docs/VISUAL-STANDARD.md`，也不得改變品牌識別與視覺方向。
- 每一階段的驗收報告都必須包含「視覺規範符合程度」項目；涉及重大視覺變動時，須提供修改前後截圖供使用者確認。
- 不得僅憑自動化測試通過就宣稱視覺驗收完成。
- 圖片素材的 `status` 只有使用者確認後才能改為「已檢查」；不得為了通過建置而批次核准。
- 未經使用者確認，不得合併 main、不得部署 GitHub Pages、不得正式公開。
- 所有工作回報使用繁體中文（台灣用語）。

---

## 專案概要（給每次新對話快速上手）

- **用途**：《由己 SELF-AUTHORED》是免費、非營利的台灣女性生活、權益與官方資源導覽靜態網站。只整理公開資訊與官方入口，不提供會員、登入、表單、追蹤或付費服務。
- **技術**：Node.js 22 自寫靜態網站產生器（`scripts/build.mjs`），無執行期套件；測試用 Playwright（Chromium、WebKit）。CI 與部署都用 GitHub Actions。
- **分支**：`main` 已合併 PR #7、#8、#9，本輪最新程式 merge SHA `83f0b289d73311038280b7a5ddd4f5744e30ac03`。本次手機＋電腦功能已由站主測試通過，完整測試 run `38884807229` success。未核准內容仍留於 QA，不因工程合併或功能驗收獲得人工發布核准。
- **三種建置模式**：
  - `preview` → `dist`（一般預覽）
  - `production` → `dist-production`（正式版，只含 `content/release-approvals.json` 已核准資料）
  - `qa` → `dist-qa`（公開 QA 測試版＝preview＋未核准候選內容，全部標「未核准測試內容」＋noindex）
- **公開 QA 網址**：https://daycool858000-hue.github.io/morning-light-magazine/
  - 由 `.github/workflows/qa-public-preview.yml` 部署，**只有修改這個檔本身才會觸發**。
  - 部署方式：在檔案最上方加一行日期註解，並視需要補部署前檢查。**每次部署都要站主明確同意。**

### 資料夾結構
| 路徑 | 內容 |
|---|---|
| `config/site.json` | 網站設定（正式版、預覽共用，QA 文案要另外覆寫，不要直接改這裡） |
| `content/` | 正式資料：資源、專線、分類、縣市、照片；`release-approvals.json` 為正式核准快照，**不得修改** |
| `docs/` | 規格、報告、ChatGPT 撰寫的候選文章與資料（QA 載入器只讀指定檔案） |
| `scripts/build.mjs` | 建置主程式（所有頁面樣板） |
| `scripts/lib/qa-*.mjs` | 各批 QA 候選內容載入器：batch2、batch3、batch45、batch6、english、activities（`loadQaNotices` 具體活動＋`loadQaActivities` 12 個長期入口）、expansion（六大主題擴充分批匯入，只讀 `docs/QA-EXPANSION-IMPORT-QUEUE.json`，說明見 `docs/QA-EXPANSION-IMPORT-GUIDE-2026-10-16.md`） |
| `src/qa-assets/js/` | **只複製到 dist-qa** 的腳本：`qa-calendar.js`（全站小日曆）、`qa-activities.js`（活動依臺灣日期隱藏） |
| `scripts/lib/toward-light-editorial.mjs` | 向光八索引與延伸閱讀的文章對應 |
| `scripts/check-links-browser.mjs` | Chromium 外站連結檢查（`--set=batch45`、`batch6`、`activities`、`expansion9`）；結果分四類：正常開啟／下載型連結／海外逾時或受阻／真正失效，`--fail-on-broken` 只在真正失效時 exit 1。**工作流程 success 不等於每個網址都通過，要逐筆看分類** |
| `src/assets/css/main.css` | 全站樣式；`src/icons/` 圖示 |
| `tests/` | `site.test.mjs`（正式版 44 項）、`release-gate.test.mjs`、`qa-batch2.test.mjs`（QA 全部檢查，只核對原 36 篇）、`qa-expansion.test.mjs`（擴充匯入機制，用 `tests/fixtures/qa-expansion/` 範例佇列）、`qa-expansion-first-four.test.mjs`（第一批四篇暫存模擬）、`qa-expansion-nine.test.mjs`（九篇 45 篇整合暫存模擬，CI 另跑 WebKit）、`mobile-webkit.test.mjs`、`qa-webkit.test.mjs` |

### 常用指令
- 全部測試：`npm test`（WebKit 本機沒有安裝，由 CI 執行）
- 本機看 QA：`npm run qa-preview`
- CI 狀態：`curl -s "https://api.github.com/repos/daycool858000-hue/morning-light-magazine/actions/runs?branch=<分支名稱>&per_page=5"`

## 最新工作｜2026-10-17 生活與家庭 01「懷孕與生育相關福利」實質內容（QA-only 工程暫存，本節最新）

**分支 `claude/pregnancy-benefits-content-8sjgqh`，以已部署公開 QA 的 `qa/public-nine-articles-20261017`（`15a4621`）為基礎，草稿 PR 的 base 也是該 QA 分支。未部署公開 QA、未合併 main、未修改 `content/release-approvals.json`、未覆寫 PR #11。查核都是 AI（ChatGPT 編輯＋Claude 工程），不是站主核准。**

- 編輯權威：PR #11 `docs/LIFE-FAMILY-PREGNANCY-OFFICIAL-ENTRY-EDITORIAL-PLAN-2026-10-17.md`（未合併到 QA 分支，只讀取）。資料轉成 `docs/QA-LIFE-FAMILY-PREGNANCY-GUIDE-2026-10-17.json`（`candidate-not-approved`），載入器 `scripts/lib/qa-pregnancy-guide.mjs`。
- 前台（只在 QA）：主題 01 保留標題與 `#pregnancy`，「整理中」改為「查看孕期與生育資訊整理 →」連到同頁 `#pregnancy-guide`；閱讀區四段（產檢 PG01–02、生育給付 勞保/國保/無保別 PG03–05、工作權益 PG06–07、出生登記與地方補助 PG08–09），育兒津貼／托育／產假詳細制度用 `#childcare`、`#daycare`、`law.html#parental-leave`、`law.html#pregnancy-protection`、`city.html` 站內連結。無新卡片、圖片、表單、分類。preview／production HTML 與搜尋索引逐位元組不變。
- 測試：新增 `tests/qa-pregnancy-guide.test.mjs`（16 項，已加入 `npm test`）、`tests/qa-pregnancy-browser.test.mjs`（Chromium 在 `npm test`、WebKit 在 `test:webkit-qa`，320／375／390／1280 各 12 項）；CI 上傳截圖 artifact `qa-pregnancy-guide-screenshots`。外站連結檢查：`node scripts/check-links-browser.mjs --set=pregnancy`，工作流程 `.github/workflows/qa-links-pregnancy.yml`。
- **尚未核對的外部連結**：Claude 容器被代理擋下 `.gov.tw`，本機一筆都沒開成。PG01、PG02（國健署）在 ChatGPT 端也未完整開啟，維持「待驗」；九筆都未經站主臺灣實機點開。GitHub Actions run `39000239040`（美國機房 Chromium）九筆都 200、標題相符，但不等於臺灣實機或站主核對；報告見 `docs/QA-LIFE-FAMILY-PREGNANCY-GUIDE-ACCEPTANCE-2026-10-17.md`。CI（`cae89bc`）push `39000238984`、pull_request `39000254287` success，WebKit 48 項通過；草稿 PR #15（base 為 QA 分支）。地方生育獎勵未逐縣市核對。
- **下一步：停止，等 ChatGPT 工程驗收與站主同意**後才更新公開 QA（修改 `qa-public-preview.yml` 觸發）；正式發布另走 release-approvals 流程。

## 最新權威狀態｜2026-10-17 九篇全部進暫存（45 篇）更正版（上一節之前的最新狀態）

**工程分支 `claude/nine-articles-portal-qa-6i6jys`（承接 PR #13 `52685ab`），草稿 PR #14。未部署 GitHub Pages、未合併 main、未修改 `content/release-approvals.json`、正式匯入佇列 `docs/QA-EXPANSION-IMPORT-QUEUE.json` 九篇全部仍 `importToQa: false`／`pending`。全部查核為 AI（Claude＋ChatGPT）完成，不是站主審閱；CI 成功不等於內容核准。**

- **來源查核更正**：ChatGPT 直接開啟官方原文的獨立複核（`docs/EXPANSION-A1-B5-B4-INDEPENDENT-PRIMARY-SOURCE-RECHECK-2026-10-17.md`，編輯分支 `d5fe0ae`／`1190f1e`）推翻 PR #13 對 A1、B5 的待修判斷與對 B4 日期的修改建議：A1 受託團體原頁明載「預定於116年1月」成果發表及展示（屬受託單位預定計畫，不是政府確定開放的一般民眾活動，文章已如此界定）；B5 國教院第 270 期第 2 段確有真實片段錯置的敘述、新聞稿發布單位確為國教署；B4《服飾標示基準》第七點明載 2023-05-18 生效，**原稿日期正確，不改**。`docs/NINE-ARTICLE-QA-STAGING-SOURCE-REVIEW-2026-10-17.md` 已全面改寫，不保留被原文推翻的待修理由。Claude 容器仍無法連外直開原文，紀錄中已誠實註明。
- **暫存 45 篇**（`docs/QA-EXPANSION-STAGING-NINE-2026-10-17.json`，`stagingOnly`）：讀利 **26**＝原 23＋exp-01、exp-08、**B4**；向光 **19**＝原 13＋exp-11、exp-12、A1、A2、A4、B5。B4 由向光改到讀利（正式佇列 `directory` 同步改，仍未開啟）。六大分類不變；向光八索引與原文章順序不變；桌機向光最後一列 3 張屬正常排列。
- **同步的編輯版本**：只 cherry-pick PR #11 的 `f8e4f3a`（A1 第三輪 taoyuanwdc 標「非政府網域」）、`7abb900`（B4「自行訂製服裝」）、`d5fe0ae`、`1190f1e`（查核紀錄）。**未同步** PR #11 新增的城市研究（`66f6443` 四縣十筆入口、`02e265e` 22 縣市追蹤表），所以兩分支**不再逐位元組相同**；日後合併須核對城市資料、文章修正與 CLAUDE.md，不得互相覆寫。
- **連結檢查**：前次 run `38990419022`＝正常 21、下載型 1、海外逾時 1、失效 0。本分支新版四類檢查器重跑 run `38992645473`＝正常 20、下載型 1（exp-12 PDF，HTTP 200、application/pdf、約 3 MB）、海外逾時／受阻 2（A2 familyedu 逾時；B4 第二筆法務部「歷史參考」頁回 200 但標題 Error，前次正常）、真正失效 0。兩筆都不刪除、不替換，待臺灣網路再確認。
- **測試**：本機 `npm test` 133 項全部通過（Chromium）；CI（提交 `8f99457`）push `38992640310`、pull_request `38992663319` success，含 WebKit 合計 177 項全部通過。草稿 **PR #14**（承接 PR #13，不合併）。截圖 `docs/qa-media/nine-staging-45-2026-10-17/`（A1、A2、A4、B4、B5 文章頁 390／1280px，讀利／向光新增卡片段）。報告 `docs/NINE-ARTICLE-PORTAL-INTEGRATION-QA-STAGING-REPORT-2026-10-17.md`。
- **下一步：停止，等 ChatGPT 獨立驗收與站主授權。** 站主同意後才開正式佇列、才部署公開 QA；正式發布另走 release-approvals 流程。

## （已被上一節取代，歷史保留）2026-10-17 九篇文章＋PR #10 入口整合暫存（43 篇版）

**工程分支 `claude/qa-nine-articles-portals-staging-20261017`：已把 PR #10（官方查詢入口）、PR #11（編輯原稿與來源紀錄）、PR #12（V2 解析器與分批匯入）及第一批四篇暫存工程合併到同一個暫存環境。未部署 GitHub Pages、未合併 main、未修改 `content/release-approvals.json`、正式匯入佇列仍全部 `importToQa: false`／`pending`。**

- **合併結果**：PR #10 自動合併無衝突；PR #11 只有 `CLAUDE.md` 衝突，已**保留雙方最新段落**（PR #10 的 12 筆入口決定段 ＋ PR #11 的六段編輯進度），未用舊檔覆蓋。`claude/first-four-articles-qa-staging-l0ntyf`（`37a3cc8`）已含 PR #12 全部提交，第一批四篇工程原封保留。PR #11 的五份原稿與 22 篇 manifest 與編輯分支最新版**逐位元組相同**。
- **暫存共 43 篇**（不是 45 篇）＝原 36 篇 ＋ 第一批 4 篇 ＋ 第二批 **3 篇**（A2 家庭教育、A4 地方活動、B4 衣物洗標）。
- **A1（婦女中心課程）與 B5（AI 查證）列入待修、不進本輪暫存**，但**待修項目已因 CI 實際開頁而縮小**：
  - A1 剩 2 項：①「2027 年 1 月預定成果發表」只有受託團體 `wfwp.org.tw` 公告，內文未能逐字確認；②來源區標題寫「官方來源」卻含兩個非政府網站（`wfwp.org.tw`、`taoyuanwdc.org`）。**三個桃園網址經 CI 開頁證實存在且標題相符**（115-116 年度婦女福利與權益工作計畫、115 年 10-12 月婦女中心活動一覽表、先培力再提案），原先「網址無法確認」的判斷已更正。
  - B5 剩 1 句：第 270 期該篇內文是否含「真實片段／錯置脈絡」待逐字核對。**篇名、期數與國教署新聞稿網址經 CI 開頁全部證實**，原先「發布單位應為教育部」的判斷已更正。
  - 詳細問題與修法建議：`docs/NINE-ARTICLE-QA-STAGING-SOURCE-REVIEW-2026-10-17.md`。**不得為了湊滿 45 篇把這兩篇標成 source-checked。**
- **第二批五篇暫定目錄**：正式佇列 A1／A2／A4／B4／B5 的 `directory` 改為 `toward`（向光），`importToQa` 仍 false；分類保留原本六大分類（A2、B4 生活與家庭；A1、A4、B5 學習與活動）。向光原八索引與既有 13 篇順序完全不動，新文章只接在文章卡最後（13→18 張）；讀利 23→25。
- **本次環境限制（重要）**：這個雲端容器的網路政策只開放 GitHub 與套件來源，**所有 `*.gov.tw`、`event.culture.tw`、`epaper.naer.edu.tw` 都被代理擋下（403）**，無法在本機實際開啟官方連結。改以伺服器端搜尋複核敘述，並新增 `node scripts/check-links-browser.mjs --set=expansion9`，由 `qa-links-browser.yml`（GitHub runner）實際開啟九篇全部來源網址（含未匯入的 A1、B5）。**run `38990419022` success：23 個網址中 21 個 200 可開啟**；未開啟的兩個是 exp-12 的科教館 PDF（直接下載，非失效）與 A2 的 `familyedu.moe.gov.tw`（海外逾時，既知狀況，不重查、不替換）。
- **新增／修改檔案**：`docs/QA-EXPANSION-STAGING-NINE-2026-10-17.json`（暫存佇列，`stagingOnly`）、`docs/NINE-ARTICLE-QA-STAGING-SOURCE-REVIEW-2026-10-17.md`（第二批來源查核紀錄）、`docs/NINE-ARTICLE-PORTAL-INTEGRATION-QA-STAGING-REPORT-2026-10-17.md`（整合報告）、`tests/qa-expansion-nine.test.mjs`（已加入 `npm test`）、`scripts/lib/qa-expansion.mjs`（`建議歸類` 歸類行不進正文）、`scripts/check-links-browser.mjs`、`.github/workflows/qa-links-browser.yml`、`docs/QA-EXPANSION-IMPORT-QUEUE.json`（只改第二批五篇的 directory 與 editorNote）、`tests/qa-expansion.test.mjs`、`tests/qa-expansion-first-four.test.mjs`（第二批目錄斷言）、`package.json`、`.gitignore`。
- **CI**：`38990378606`（push）success、`38990412620`（pull_request）success、`38990419022`（連結檢查）success；草稿 PR #13。
- **下一步只等站主確認**：①A2／A4／B4 是否適合放向光（B4 屬生活技能，也可改放讀利）；②A1、B5 交回編輯依查核紀錄修稿；③站主同意後才把正式佇列對應文章改 `source-checked`／`importToQa: true`，再另行同意部署公開 QA。正式發布仍須另走 release-approvals 流程。

## 12 筆長期查詢入口第二階段｜站主決定與 QA 工作中（2026-10-16）

- 站主最新規則：「有相同網址的就不用再新增；可以改成文字敘述在同一個格子裡面；如果不是的話就不用」。**只以完整 URL 字串是否相同判定資料去重**，不同網址即使同品牌也不用硬塞同格。
- 原來源 `docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json` 12 筆原值不改；唯一完全同網址的是 `act-09` 文化部藝文活動平台，沿用 `open-culture-events` 卡，QA 中補一句用途。其他 11 筆依各自主要分類以小型文字列呈現，不增加巨型機構卡。
- 新程式在 `feature/qa-portal-single-url-20261016`：`scripts/lib/qa-portal-routing.mjs` 為 ID／分類唯一映射、`scripts/build.mjs` 只在 QA 生成文字入口且更新搜尋索引，`src/assets/css/main.css` 限定新文字列樣式；QA、WebKit 測試新增必要斷言。
- 文章與八索引、已驗收的手機桌機畫面、六筆活動及全站小日曆都不更動；preview／production 無新資料，原始 release-approvals.json 不得修改。
- **這一階段尚未公開 QA 部署或合併 main**；先跑 CI，通過後依站主確認的發佈流程處理，不可宣稱網頁已變動。
## 2026-10-17 PR #12 驗收與第一批 QA 編輯決策（本節最新）

- PR #12 `claude/qa-expansion-v2-reconcile-20261017` 的提交 `8dce66c` 已核對 push CI `38975868799` 和 pull_request CI `38975900065` success；PR 仍開放草稿、`mergeable_state=clean`，沒有合併、沒有部署，22 篇／13 項佇列仍全部關閉且 pending。
- 第一批先選 **exp-01／08／11／12 四篇**，且僅為來源審查後供獨立 QA 暫存試讀。讀利 `readli`：exp-01、exp-08；向光 `toward`：exp-11、exp-12。其他 18 篇暫維持 `directory:none`。
- 第 11 篇 slug **`exp-choosing-open-courses`**（原 `exp-open-course-certificates` 停用）；第 12 篇 slug **`exp-compare-everyday-experiments`**（原 `exp-reading-popular-science` 停用）。尚未公開 QA，現在改名無既有網址相容問題。
- 官方原頁與逐段查核證據、與原 36 篇的不同閱讀目的及開發詳細限制：`docs/FIRST-FOUR-EXPANSION-ARTICLES-EDITORIAL-QA-DECISION-2026-10-17.md`；22 篇 manifest 的 `firstQaBatchEditorial` 已標記上述四篇。
- **重要版本同步**：exp-11 2026-10-17 修正文句，避免未經證實「教育部平台一定能以主題篩選」；exp-12 新增科教館 2022 年科學教育原始資料連結。Claude 工程分支中的兩份 V2 複本曾取自較舊編輯 commit，真正準備 QA 暫存前需從 PR #11 最新檔同步、重跑 22 篇解析與全文回歸測試。
- 目前已做的是 AI 來源與逐段編輯審查，**不能等同站主審閱**。Claude 不得據此自行開真實 `importToQa`、自行合併 PR #10／#11／#12 或觸發 GitHub Pages，待獨立 QA 暫存驗收報告及站主明確同意才有下一步。

## 2026-10-17 城市研究與 Claude 接軌工作更新（本節優先於下方舊版 2/22）

- 站主已把「V2 文章佇列與解析器修復」指令交給 Claude；工程分支 `claude/qa-expansion-import-20261016` 舊 CI `38967525534` success，但仍待 Claude 將 12 篇 V2 真正接入、校正 7 篇改名與來源解析負向測試。**不要代替 Claude 在此編輯分支更新 build.mjs 或把任何佇列開關打開。**
- 供 Claude 的最新工程修正文件：`docs/CLAUDE-V2-QUEUE-RECONCILIATION-2026-10-17.md`；正式原稿是兩個 V2 檔，V1 只保留歷史。PR #10／#11 不可自行合併、不可觸發 GitHub Pages 部署。
- 22 縣市深度工作：**6／22 縣市有部分新增官方服務／中心／學習資料**，合計 **17 筆不同 URL**（彰化4、新北3、臺北3、桃園2、臺中2、臺南3），索引 `docs/CITY-SIX-COUNTIES-17-SERVICE-ENTRY-INDEX-2026-10-17.json`。這不是 6 縣已完整驗收（五層完整驗收仍 0/22），其餘 16 縣待深入。已有候選皆未公開 QA。
- 資源分類：同一官網名錄列出多個中心時只保留**一個該 URL 的查詢入口**；同機關的其他不同網址用途可保留簡潔文字連結。桃園 2026 Q4 北南婦女中心活動 `validThrough: 2026-12-31`，不可永久顯示為「近期活動」。臺南歷史服務新聞不作 2026 當期時刻。
- 文章內容仍由 ChatGPT 負責逐篇校核和地方資料；Claude 只需完成 V2 解析、佇列及技術回歸驗收，除非收到站主新指示，不新增尚未查核的服務卡或任何正式版內容。

## 2026-10-17 第二輪內容編輯最新進度（此節優先於下方第一輪六篇／七項進度）

- **新增 12 篇均已完成 V2 正文**，分為兩檔：`docs/EXPANSION-BATCH10-SIX-REVISED-ARTICLES-V2-2026-10-17.md`（02／03／04／09／10／11）及 `docs/EXPANSION-BATCH10-REMAINING-SIX-ARTICLES-V2-2026-10-17.md`（01／05／06／07／08／12），舊 V1 永久保留。
- 第一輪與第二輪官方來源及原 36 篇主題重疊追蹤皆在 `docs/EXPANSION-BATCH10-12-ARTICLE-SOURCE-AND-OVERLAP-AUDIT-2026-10-17.md`；法規／醫療／求職／金融資訊仍須依 2026 年發布時點再審，完整 36 篇正文逐段比對及 Safari 外站測試尚未完成。**V2 不是已核准／已公開。**
- **NI-01～NI-13 全部 13 項已完成至少一輪官方來源用途初核**，更新 `docs/NEW-IMMIGRANT-13-OFFICIAL-RESOURCE-CANDIDATES-2026-10-16.json`；其中 NI-11 臺中主頁工具讀取出錯，已有臺中市民政局原始官網及官方搜尋索引佐證。各外語文件逐份驗證仍待；所有資源不予自動上 QA。
- **地方服務深度新增兩縣**：彰化 `docs/CITY-CHANGHUA-WOMEN-IMMIGRANT-FOUR-PRIMARY-PORTALS-2026-10-17.json` 4 筆、新北 `docs/CITY-NEW-TAIPEI-WOMEN-LEARNING-SOCIAL-PRIMARY-PORTALS-2026-10-17.json` 3 筆；新北新住民 NI-08 與社會局來源已交叉核對，只有一個對應入口，勿另做同址卡。其他 20 縣市仍需補深度，**不是 2 縣已全部完工**。
- 舊十篇 A4 地方活動／B6 日常創作第二輪稿原本已處理主要問題，詳 `docs/BATCH7-9-A4-B6-FOLLOWUP-SOURCE-CHECK-2026-10-17.md`；待站主審閱、QA 實開即可評估入站。
- **當前須由 Claude 處理的是 QA-only 分批匯入機制與前台驗收**，內容來源只使用最新 V2 快照和 manifest；**不要自行合併 PR #11／PR #10、修改 `release-approvals.json`、觸發公開 QA 部署**。編輯稿件核對與新縣市來源繼續由 ChatGPT 負責。

## 2026-10-17 編輯工作實際進度（最新，優先於 10/16 舊未完成敘述）

- 新 12 篇已做原 36 篇標題／閱讀定位重疊排查，核對紀錄在 `docs/EXPANSION-BATCH10-12-ARTICLE-SOURCE-AND-OVERLAP-AUDIT-2026-10-17.md`；其中 02／03／04／09／10／11 **六篇已重寫 V2 完整正文並核對主要官方來源**：`docs/EXPANSION-BATCH10-SIX-REVISED-ARTICLES-V2-2026-10-17.md`。第 11 篇因原稿和既有第五批 MOOC 幾乎同題，已改成「如何試學與選課」。
- 原十篇中 A4「地方活動」、B6「日常創作」曾列為問題稿，2026-10-17 實讀較新的第二輪全文與官方原頁後，發現「同網址重複、著作權／肖像未區分」**此前已在第二輪正文修正**；詳 `docs/BATCH7-9-A4-B6-FOLLOWUP-SOURCE-CHECK-2026-10-17.md`。目前剩 QA 真實瀏覽器外連與站主全文審稿，別重改舊已修部分。
- 新住民 13 項候選中，**NI-01～NI-07 七筆**已追加 2026-10-17 官方網頁用途或語種清單查核欄；其中 NI-03、NI-05、NI-06 還未逐一開啟全部 PDF／深層頁。NI-08～13 尚待新一輪個別實查，所有 13 筆皆未核准。
- 22 縣市深度補查已有**彰化縣**第一批 4 筆具體官方不同 URL：彰化夢想館、田中區婦女中心、Women 學習護照、彰化新住民家庭服務中心，文件 `docs/CITY-CHANGHUA-WOMEN-IMMIGRANT-FOUR-PRIMARY-PORTALS-2026-10-17.json`。其餘縣市尚待相同深度，不可宣稱全台已完成。
- **這些工作只在編輯分支 PR #11 的 docs／manifest／CLAUDE.md 中進行，未加入 QA 前台、未部署、未取得文章正式發布核准，也沒有覆寫 release-approvals。** PR #10 的工程仍須獨立處理。

## 最新編輯分支狀態｜2026-10-16 六大主題內容擴充

- 站主已明確要求：生活與家庭／職涯與創業／身心健康／法律與權益／城市與福利／學習與活動的所有指定方向都增加，並保留 13 項新住民多語資料、原 10 篇成人候選，以及繼續擴充 22 縣市。原來 QA 的 36 篇文章保留，不要把 36 篇分散至六類誤當完成內容深度。
- **本編輯分支** `editorial/youji-full-six-topics-expansion-20261016`：已建立 30 個主題工作包總表、撰寫新增 12 篇原創完整候選稿、移入並保留較新版本原十篇候選及審查紀錄、整理 22 篇文章未核准 manifest、13 項多語新住民官方連結候選 JSON、22 縣市服務深度追蹤表、2027 活動研究資料。**目前只做候選稿與來源追蹤，尚未把新稿加入 QA 前台、未測試新稿頁面、未公開部署、未經站主逐篇發布核准。**
- 詳細檔案及開發驗收程序先讀：`docs/FULL-SIX-TOPICS-CONTENT-EXPANSION-PLAN-2026-10-16.md`、`docs/CLAUDE-ALL-SIX-TOPICS-EXPANSION-IMPLEMENTATION-2026-10-16.md`，只再讀當次工程會碰到的檔案。
- **去重規則**：網址完全相同才沿用既有格子並補一句用途；網址不同，即使是同品牌／同機構也不用硬併，可以各自保留精簡文字入口。13 項來源都是不同 URL，現有 3 筆移民署類 QA 卡需一同檢查不要重複。
- 原第九批 A4 地方活動、B6 日常創作需要根據稽核完成修訂；保留方向、不在未查前直接匯入。
- 其他工程分支 PR #10 的 12 個長期官方查詢入口單獨進行，**不可推定它已合併**；本編輯 PR #11 也仍為草稿。
- 下一步：從這 22 篇與 13 個來源做逐句事實核對與去重，逐批 QA-only 匯入、CI、手機／桌機驗收；城市 22 縣市持續按層補婦女中心／地方課程／社福據點。QA 不等於 production 核准，`release-approvals.json` 不動。

## 最新權威狀態｜2026-10-16（優先於下方歷史工作紀錄）

**本輪手機與電腦功能已驗收通過，公開 QA 部署完成，工程已合併 main。不要因下方舊紀錄的「尚未部署／等待驗收」而重做或撤回已完成工作。**

- 站主先說「已測試」，再明確回覆「都有功能電腦也測試」，故標記為手機及電腦**功能實機驗收通過**，不延伸宣稱逐篇內容已獲正式發布核准。
- 範圍包括：讀利 23 篇緊湊手機清單、向光 13 篇單欄手機閱讀卡及原八索引；六大主題對應文章，其中五類文章提前至大型官方入口之前；五類小型頁內捷徑、城市福利獨立功能、全站小日曆及「學習與活動」六筆公告同步。
- QA 部署 GitHub Actions run `38884247463` success；PR #9 已合併 main，merge SHA `83f0b289d73311038280b7a5ddd4f5744e30ac03`；main 完整 CI run `38884807229` success。
- 站主功能驗收檔：`docs/QA-OWNER-MOBILE-DESKTOP-ACCEPTANCE-2026-10-16.md`（正式歸檔）。
- **邊界**：36 篇文章、活動資料的 QA「未核准測試內容」及 noindex 不變；`content/release-approvals.json` 未因此核准。未經另行確認，不自行上架第七到九批研究候選。
- **第二階段研究已完成初步編輯分類（2026-10-16）**：新增 `docs/ACTIVITIES-PORTALS-12-SIX-TOPICS-EDITORIAL-MAPPING-2026-10-16.md`，盤點 12 筆長期官方查詢入口、對應六大主題及原始網址；確認 `act-09` 與現有 `open-culture-events` 完全同網址，`act-02`／`act-07` 與現有機構卡功能重疊，應優先沿用卡片或加簡潔連結。主分類暫定生活 2、職涯 3、健康 2、法律 1、城市 0、學習 4；臺北專屬兩筆不可當作全國資料。**編輯映射尚待站主確認，本階段未改前台、未部署 QA、未合併工程**。
- **接下來的工作**：待站主確認十二個長期入口對應表後，才開始 QA-only 實作、去重與搜尋路徑調整；然後處理 2027 新公告、新住民多語資源及月度官方連結報告。不再重做已驗收的手機／桌機版面。

## 歷史開發紀錄（保留供查核，已過時內容不可作為新指令）

### 最新優先記錄：2026-10-16 手機導覽與近期活動修正（本節覆蓋下方舊說法）
- 全站小日曆及活動消息已公開 QA、合併 main（PR #7）；讀利／向光文章分流、向光 13 篇文章、讀利 23 篇文章及城市福利加兩篇已公開 QA、合併 main（PR #8，main SHA `e174da9f`）。
- 本輪新修改尚在開發分支、未公開：**向光手機**從兩欄四方格改單欄上下滑動的低彩度紋理文章卡；**讀利手機**從大文章卡改精簡單欄清單。桌機視覺保留原狀；讀利 23 篇、向光 13 篇、全文與搜尋及八索引都不改。
- 其他五個生活主題（生活家庭、職涯創業、身心健康、法律權益、學習活動）把導讀文章移到主題介紹下方、官方資源之前；**城市與福利**原本六篇福利卡、縣市查詢和兩篇附加導讀都保留。
- **學習與活動**「近期活動」改讀同一份 `docs/QA-ACTIVITIES-NOTICES-2026Q4-2027-2026-10-16.json` 六筆已公告活動；與小日曆共用 `noticeHtml` 模板及 `qa-activities.js` 臺灣日期隱藏，不複製資料、不編造報名狀態。
- 其他五個主題手機介紹文字下方新增 44px 可點的純文字捷徑：四個連 `#need-title`「從你想了解的事開始 ↓」，學習活動連 `#topics-title`「直接探索學習主題 ↓」。城市不加、桌機不顯示；不改讀利原有跳轉。
- 新增 QA + WebKit 測試涵蓋全 36 篇分類、六筆公告、日期處理、手機兩目錄樣式及五個頁首錨點。待最新 CI 全通過才可部署此輪公開 QA；測試通過不代表站主 iPhone 視覺已驗收。
- **發布界線**：QA 仍有「未核准測試內容」、noindex；不改 `content/release-approvals.json`、正式版快照、原始文章。第七至九批仍未核准，暫不匯入。


- **本輪最新：讀利／向光文章分流及向光全文章格（僅工程分支，尚待 QA 發布與站主手機觀感確認）**：
  - 專屬歸檔：`docs/READLI-TOWARD-EDITORIAL-SEPARATION-QA-2026-10-16.md`。
  - QA 全部 36 篇保留原始 slug、來源、六大分類頁及搜尋。讀利只顯示 23 篇制度／健康／權益／安全／財務等文章，八篇具普遍實用性的內容置前；向光只顯示 13 篇學習／藝文／創業／培訓等文章，八索引下方直接展示全部文章卡，手機兩欄、桌機最多四欄，兩目錄不可互相重複卡片。
  - 城市與福利在原本六篇福利文章後，再呈現兩篇既有社福窗口文章，原六篇順序及縣市選擇不動。
  - 只更動 `scripts/lib/toward-light-editorial.mjs`、`scripts/build.mjs`、`src/assets/css/main.css`、`tests/qa-batch2.test.mjs`、`tests/qa-webkit.test.mjs` 及本次歸檔；不更動 `content/release-approvals.json`、原稿或正式已核准快照。**本輪尚未部署公開 QA，不要將開發分支提交當成正式版已發布**。
- **先前已結案的小日曆與活動公開 QA、main 合併**：QA GitHub Pages 部署 run `38877637058` 成功；main PR #7 已合併，合併 SHA `732175a4568c34dc4a91505424676a75c1d0d8c8`，main CI run `38878161558` 成功。上輪已獲站主確認影片無問題。所有未核准 QA 文章、活動仍需維持 noindex 及測試標示。

- **全站小日曆＋近期活動消息頁（分支 `claude/homepage-activities-animation-uzm9aa`，未部署、待站主 iPhone 驗收）**：依編輯分支唯一規格 `docs/CANONICAL-CORRECTION-TIMED-CALENDAR-2026Q4-2027-ANNOUNCEMENTS-2026-10-16.md` 重做；`e5034a6` 三張紙卡已撤回（程式還原成 `e22da7c`，舊錄影刪除）。
  - 小日曆：`layout()` 在**每個 QA 頁面**頁尾後放一個 `.act-entry`（右下角 fixed、約 60×56px、「近期活動」）。首次進站約 3 秒後柔和浮現一次，之後不自動消失；同一分頁換頁直接顯示、不重播（`sessionStorage` 只存首次進站時間與已浮現旗標，無個資）。捲動時遇到求助電話、有急事、切換畫面、搜尋框、表單、按鈕或連結中央會往上避讓，沒空位時暫縮成 44px 圖示。減少動態設定：一樣延遲 3 秒、無動態。首頁快捷區下方的靜態活動卡已移除。正式版與一般預覽**沒有**小日曆（HTML 與 `e22da7c` 逐位元組相同，只有 main.css 多了用不到的 QA 選擇器）。
  - 活動頁 `activities.html`「近期活動與講座」：主要內容是 `docs/QA-ACTIVITIES-NOTICES-2026Q4-2027-2026-10-16.json` 六筆官方已公告的具體活動（科學節、國圖冬季講座、台北國際書展、動物園昆蟲特展、好湯嘉年華、2027 技能競賽計畫＝詳情待公告），欄位含日期、地區、主辦、說明、官方公告連結；建置時剔除已過期項目，訪客瀏覽時再依臺灣日期隱藏（搜尋索引同步剔除）。12 個長期官方查詢入口資料與連結不變，移到頁面下方「想自己查更多」次要區。
  - 錄影與截圖：`docs/qa-media/calendar-*`、`activities-notices-*`（2026-10-16）。
- 教育部家庭教育資源網：**站主已確認臺灣 iPhone 可正常開啟**，12 個官方連結全部可用，不要再重查或要求站主再點。

- 公開 QA 已部署到 `a49b80a`（內容來源 `707a000`）：36 篇未核准 QA 文章、城市福利「先了解有哪些福利」、讀利快捷入口、向光八個兩欄索引，以及讀利、向光頁首文案。**站主已用 iPhone 驗收讀利與向光，兩個目錄結案，不再修改。**
- （歷史紀錄；**公開 QA 目前仍是這一版**，新的小日曆版尚未部署。新版因每頁都有小日曆，讀利、向光 QA 頁不再與 `a49b80a` 逐位元組相同，但版面未改。）開發分支：首頁「活動與講座」小入口＋`activities.html` 官方查詢頁（`3265b4b`），已依編輯審查做部署前修正：只放 12 個長期官方查詢入口（移出國家圖書館冬季講座與 2027 全國技能競賽兩筆時間性活動，原始來源留在編輯分支研究文件）、拿掉狀態圖例、全站 QA 提示列恢復 `a49b80a` 原文（讀利、向光等既有 QA 頁與 `a49b80a` 逐位元組相同）。資料在 `docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json`，載入器只接受 `type: portal`。**已獲站主同意並於 2026-10-16 更新公開 QA**：觸發提交 `d439d437`，部署工作 `38865986288` 成功，部署前檢查確認活動頁只有 12 筆長期官方查詢入口與未核准／noindex 標示。**目前等待站主 iPhone 驗收首頁動畫、活動頁及教育部家庭教育網連結，並未核准正式上線**。
- `familyedu.moe.gov.tw` 在 GitHub 美國機房偶爾逾時，但臺灣 iPhone 已可開啟；不要刪除、替換或重查。
- 第七至九批十篇成人候選文章只在 `docs/`，**未核准，不得匯入**。

## 下一步（2026-10-16 功能實機驗收後）

1. 現有網站手機／電腦功能已結案，除非站主回報新問題，不重跑整批視覺修改、不自行啟動 Claude 工作。
2. 已完成十二個長期官方查詢入口的初步分組、原始網址盤點及去重提案（詳見 `docs/ACTIVITIES-PORTALS-12-SIX-TOPICS-EDITORIAL-MAPPING-2026-10-16.md`）；**下一步等站主核對這個方案，再開始 QA-only 實作／測試**，不增加重複卡或改動已驗收的版面。
3. 再依序考慮 2027 新活動已發布的官方公告補充、新住民多語官方資源，以及每月官方連結檢查報告；候選文章仍獨立查核。
4. 若下一輪要改網站，維持 GitHub Pages 公開 QA 與 production 發布閘門的分離，功能驗收不能替代文章／來源及著作權核准。
5. **PR #11 工程第一階段（分支 `claude/qa-expansion-import-20261016`，未部署、未合併）**：已完成 QA 分批匯入機制。佇列 `docs/QA-EXPANSION-IMPORT-QUEUE.json` 列出 22 篇文章（exp-01～12、A1～A4、B1～B6）與 NI-01～13，**全部 `importToQa: false`**，網站輸出與 main 相同（只多 CSS）。之後每批文章完成來源查核，只在佇列開啟該批（填 `sourceCheck`、日期、查核紀錄）即可，不需再改程式。slug 與讀利／向光歸屬（`directory`）待站主確認。
6. **PR #11 V2 佇列校正（分支 `claude/qa-expansion-v2-reconcile-20261017`，自上一項開出，草稿 PR、未部署、未合併）**：依 `docs/CLAUDE-V2-QUEUE-RECONCILIATION-2026-10-17.md`，exp-01～12 改讀兩份 2026-10-17 V2（02／03／04／09／10／11 → `…SIX-REVISED-ARTICLES-V2…`，stopAt `**QA 編輯狀態：`；01／05／06／07／08／12 → `…REMAINING-SIX-ARTICLES-V2…`，stopAt `## 本批編輯校核門檻`），7 篇改題並以 `originalDraftTitle` 保留 V1 標題。來源標題改為固定名稱白名單 `SOURCE_LABELS`，「用公開官方入口延伸探索」等正文小標不再被截斷。為讓 CI 用真實原稿回歸測試，從 PR #11 編輯分支逐位元組複製兩份 V2、manifest 及原有十篇的三份原稿到 docs/（與 PR #11 內容相同，合併時不會衝突）。22 篇與 13 項資源**仍全部 `importToQa: false`／pending**；slug 沿用暫定值（exp-11、exp-12 改題後 slug 字面意義已不完全貼合，開啟前請站主決定是否改名）。

7. **第一批四篇 QA 暫存模擬（分支 `claude/first-four-articles-qa-staging-l0ntyf`，含 PR #12，未部署、未合併）**：依 PR #11 `docs/FIRST-FOUR-EXPANSION-ARTICLES-EDITORIAL-QA-DECISION-2026-10-17.md`，同步 exp-11 平台欄位修正與 exp-12 科教館 2022 年來源；正式佇列 exp-01、exp-08 → `readli`，exp-11 → `exp-choosing-open-courses`、exp-12 → `exp-compare-everyday-experiments` 並 → `toward`（舊 slug 記在 `previousUnpublishedSlug`）。**四篇在正式佇列仍 `importToQa: false`／pending。** 模擬用 `docs/QA-EXPANSION-STAGING-FIRST-FOUR-2026-10-17.json`（`stagingOnly`，建置到 `dist-qa-staging-first-four`，`build.mjs` 拒絕輸出到 `dist-qa`），測試 `tests/qa-expansion-first-four.test.mjs`。報告與截圖：`docs/FIRST-FOUR-EXPANSION-QA-STAGING-REPORT-2026-10-17.md`、`docs/qa-media/first-four-staging-2026-10-17/`。**下一步：站主看暫存結果並明確同意後，才開啟正式佇列四篇；部署公開 QA 再另行同意。**

### 已過時的原待辦（歷史保留，勿照做）

1. 先確認此輪最新工程分支的全部 QA 與 WebKit CI 通過；通過才觸發公開 QA，仍須保留未核准測試標示與正式版隔離。
2. 站主 iPhone 實際看新版「向光」單欄、「讀利」緊湊閱讀、五個主題捷徑以及「學習與活動」的六筆近期活動；如外觀不滿意只修手機局部樣式。
3. 本輪經確認後再整理工程分支與 main 合併紀錄，往後安排十二個長期入口六大主題移轉、新住民多語資源等後續任務。
1. **先完成本輪讀利／向光文章分流的完整 CI、320／375／390 WebKit 測試，站主手機實際驗收**；在視覺或互動確認前不要擅自新增文章內容。驗收通過後再將小範圍更改部署至公開 QA，必要時建立 PR 合併 main，仍不得擅自把 QA 候選轉正式核准。
1. 等站主看小日曆錄影與 iPhone 驗收；通過前**不要部署公開 QA、不要併回、不要修改正式版**。
2. 規格第二階段：12 個長期官方查詢入口搬回既有六大分類／搜尋（只在 QA 資料層、同一網址不重複建卡、不改讀利與向光版面）；先列預計讀的分類資料檔請站主確認。
3. 之後陸續加入新的「官方已公告」具體活動（只改 QA 活動消息 JSON，未公布的日期留空）。
4. 新住民跨主管機關入口＋英文／多語輔助（規格見編輯分支 `editorial/batch7-9-source-review-20261016` 的 `docs/CLAUDE-NEXT-STAGES-HOMEPAGE-ACTIVITIES-AND-NEW-IMMIGRANT-MULTILINGUAL-2026-10-16.md`）。
5. 每月一次的官方連結檢查（GitHub Actions，只產生報告）。

## 省額度的工作習慣（每次對話都要遵守）

1. **只讀這次任務需要的檔案**，不要整個專案都讀。先看本檔的資料夾結構，再用搜尋找到要改的地方。
2. **每完成一個功能並推上 GitHub 後**：
   - 更新本檔的「目前進度」和「下一步」，並一起推上去。
   - 明確告訴使用者：「這個任務完成了，請開一個新的工作階段繼續」。
3. **對話變很長時**（例如來回超過約 15～20 次、已經做完一個段落，或系統開始壓縮先前對話），要主動提醒使用者開新的工作階段，並先把目前進度寫進本檔、推上 GitHub。
4. 提醒時用簡單的中文說明原因，例如：「對話太長會比較耗額度、也容易忘記前面的細節；進度已經寫進 CLAUDE.md，開新的工作階段後我會從這裡接著做。」
