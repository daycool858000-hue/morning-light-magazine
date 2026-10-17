# 《由己》PR #14｜九篇全數獨立暫存工程與內容獨立驗收

**查核日期：2026-10-17（臺灣）｜查核者：ChatGPT（AI）**  
**狀態：工程可進行「下一階段公開 QA 方案準備」，尚未獲使用者公開 QA 部署及 main 合併授權；非正式發布核准，也非站主試讀。**

## 驗收標的與版本

- 工程草稿 PR #14：https://github.com/daycool858000-hue/morning-light-magazine/pull/14
- 分支 `claude/nine-articles-portal-qa-6i6jys`，提交 `fab25fbc2b5f3b9062c5deb474c0b9471362c847`。
- 基礎 PR #13 `52685ab`；與後續持續增加內容研究的 PR #11 **不可視為完全同步**。
- 兩個 CI：push `38993674532`、pull_request `38993679314`，均實際查得 test job completed / success。
- 外站新版分類檢查 run `38992645473` completed / success；但需以逐筆分類為準。

## 獨立查得的工程事實

1. `docs/QA-EXPANSION-STAGING-NINE-2026-10-17.json` 九篇 `importToQa: true` 僅是 `stagingOnly: true` 的獨立暫存；對應真實佇列 `docs/QA-EXPANSION-IMPORT-QUEUE.json` 九篇仍全為 `importToQa: false`、`sourceCheck: pending`。其餘候選也未開啟。
2. `content/release-approvals.json` 在 PR #14 與 main 的 Git blob SHA 均為 `5c4d0532d87581383045f5e017fe4ddef4d81df9`，確定沒有變更。
3. 測試檔 `tests/qa-expansion-nine.test.mjs` 包含正文逐行對照、來源 23 個不同網址、九篇唯一 slug／分類、搜尋、老36篇頁面逐位元組一致、暫存與實際 QA/production 隔離、未核准標示、noindex、手機 WebKit／Chromium 四種寬度及 PR #10 十一加一去重。
4. 讀利 26（23舊＋exp-01、exp-08、B4）；向光 19（13舊＋exp-11、exp-12、A1、A2、A4、B5），向光原八索引不變。九篇新文章暫存合計45篇。
5. GitHub Actions job log 在 PR CI 可直接看到安裝 WebKit、`WebKit 320／375／390／1280px` 九篇瀏覽器驗收通過，以及 `test:webkit` 15項、`test:webkit-qa` 28項成功，**不僅是 workflow 綠燈**。
6. **測試項目統計小誤差**：當次 PR CI 原始 log 顯示 site44、QA51、擴充20、第一批10、九篇10、WebKit15、WebKit QA28，逐組相加為 **178**，但 Claude 報告寫 **177**；需請 Claude 修正統計描述，並不影響全部測試實際通過。發布前需再比對最新一輪 CI 的總數。
7. 獨立調取並檢視新的 390px/1280px 向光、390px讀利、新 A1/B5 文章全文截圖：排版、卡片延續、標題及來源可讀，未見足以阻擋 QA 試讀的視覺問題。截圖的第一個 QA 提示列還是既有舊批次說明，**公開 QA 納入九篇之前應更新說明以包含擴充篇章，但保留未核准與 noindex**。
8. 原有 PR #10 11筆不同網址入口與同網址 act-09 沿用資源卡的整合測試正常；沒有重新設計已驗收目錄。

## 官方連結及引用

- 新版 run `38992645473`：23 個不同來源 URL＝HTML可讀20、PDF下載1、海外逾時／錯誤頁2、確認失效0。
- exp-12 `https://www.ntsec.gov.tw/article/FileAtt.ashx?id=6193` 已在 GitHub runner 確認 HTTP 200、application/pdf、約3MB；ChatGPT 網頁工具也可識別其為16頁科教館PDF。
- B4 法務部歷史參考 `https://www.moj.gov.tw/2204/2473/2492/11362/`：新版 CI 一次 200 但標題 Error；舊 CI 曾正常。ChatGPT 網頁原頁可得標題及網站內容，但再次擷取時也會逾時。**屬穩定性／外站存取風險，非已證實404，主要法規證據仍由經濟部法規原文支持**。可暫保留，公開QA試讀前可重新核對；不要把偶發海外受阻直接當作壞連結。
- A2 `familyedu.moe.gov.tw/faqList.aspx` 美國機房逾時；已有歷次臺灣使用者 iPhone 可開啟家教網站的報告，個別FAQ仍建議臺灣環境再驗。
- 經濟部現行 `https://law.moea.gov.tw/LawContent.aspx?id=GL000482` 原文第七點明載**民國112年5月18日（2023-05-18）**生效，原 B4 日期正確，「自行訂製服裝」已依第二點修正。
- A1與B5出處及原文複核詳 `docs/EXPANSION-A1-B5-B4-INDEPENDENT-PRIMARY-SOURCE-RECHECK-2026-10-17.md`，都已免除舊版待修疑義。

## 公開 QA 的新部署前必做事項（工程已通過，但尚未執行）

**目前 main 的 `.github/workflows/qa-public-preview.yml` 仍是舊部署流程：**

- 只接受 `claude/morning-light-visual-v2` 分支的 workflow 檔修改觸發，**不會因 PR #14 CI 成功而部署**。
- 原有部署 gate 仍寫死 `dist-qa` 36篇文章、向光13張卡片，若把九篇開啟後直接用舊流程，將因舊數量斷言不符而失敗。
- 應先由 Claude 設計最小變更、保存舊版與發布規範，將 gate 配合新 QA 明確改為45篇、向光19、讀利26，查九篇+11入口、來源、搜尋、noindex、原36不變及 production 隔離。**不得只為通過 CI 刪除 gate。**
- `docs/QA-EXPANSION-IMPORT-QUEUE.json` 僅在正式取得站主 **公開 QA 與必要整合/部署操作** 授權後，才可為指定九篇寫 `source-checked`、日期、可追溯證據與 `importToQa: true`。
- 公開 QA 任何知道網址的人都能閱讀，`noindex` 不等於私人測試環境。正式上線 `content/release-approvals.json` 仍無授權，保持不變。
- 尚有 PR #11 最新地方研究已達14／22縣市、41個原始候選URL及A3/B1/B2/B3來源審核，PR #14 沒有帶入；日後整合不能直接覆寫編輯分支 `CLAUDE.md` 或漏資料。

## 查核結論

**工程、暫存內容與視覺可進入公開 QA 準備階段**，但不等同九篇全部獲站主逐篇正式內容核准。公開 QA 前應獲使用者明確同意，並安排現行 workflow gate 的最小安全更新；部署後由站主 iPhone＋電腦讀稿驗收，再決定正式內容核准。本文僅為 PR #11 編輯分支研究歸檔，未修改 PR #14、main、任何正式核准檔或公開站點。


## 2026-10-17｜站主同意公開 QA 後的實際部署結果（取代本檔先前的「待授權」階段）

站主於對話明確同意九篇試讀與必要部署操作，並表示僅在確實必要時可合併 main。確認舊 Pages QA workflow 可以從獨立分支部署，**因此不需也沒有合併 main**。由 ChatGPT 透過 GitHub 連線執行以下步驟：

- 從已驗收 PR #14 `fab25fbc2b5f3b9062c5deb474c0b9471362c847` 建立**獨立 QA 專用分支** `qa/public-nine-articles-20261017`。
- 僅將指定九篇資料在該 QA 分支的真實佇列設為 `source-checked`、`importToQa: true`，保留 AI 查核日期與查核紀錄；原剩餘13篇與13項新住民候選全部關閉。
- QA 頁首說明補充本批九篇及 11 筆長期官方查詢入口，仍顯示「未核准測試內容」。
- 將 QA workflow 的舊觸發來源由舊開發分支改為 `qa/public-nine-articles-20261017`，舊 36 篇／13 卡的部署檢查對應更新 45 篇／向光19／讀利26，同時增設九篇來源記錄、正式版隔離及 `content/release-approvals.json` Git blob SHA 不變檢查。觸發仍限 workflow 檔變更，不會因一般編輯提交自行部署。
- 第一次預部署試跑缺 Playwright；第二次缺建置 `dist` 的 preview 輸出；均在部署步驟前中止，未改公開網站。修正後第三次完整通過。
- **最終部署成功**：GitHub Actions run `38995630481`（job `117287443426`），所有步驟含 production 獨立建置、QA 45 篇、九篇僅 QA 開啟、11＋1 官方入口、原站檢查、Pages artifact 與 `deploy-pages@v4` 均 success。部署工程 SHA `d13ee71bd4617a50c09887d50d85d37d3082e44f`。
- GitHub Actions 輸出的公開網址：`https://daycool858000-hue.github.io/morning-light-magazine/`。GitHub 已回報部署成功；**ChatGPT 的外部網頁讀取工具暫時無法直接抓取該 GitHub Pages 域名，因此未冒稱已親自用 iPhone 或瀏覽器驗證線上畫面**。
- PR #11、PR #14、main 及正式 `content/release-approvals.json` 均未改動；此次歸檔僅追加到 PR #11 編輯分支。正式發布及站主逐篇審稿仍未核准。

**「待查核」狀態說明**：原 `content/resources.json` 的18筆基本資源在來源上已有 AI 核對／部分站主核准用途紀錄，但原始 `status` 仍全為「待確認」，QA 畫面因此顯示「待查核」。這不會隨公開 QA 或未來正式版自然變成「已確認」；應按原驗收規則分開更新資源的實際查核範圍、AI 查核與站主核准，不可為了改掉標籤就冒稱人工逐頁查驗。本輪**沒有改資源查核狀態**。


**公開 QA 分支的一般 CI 尚需版本兼容修正（已定位，不影響完成的 Pages deploy gate）**：run `38995630418` 的一般「檢查與測試」在 `tests/qa-expansion.test.mjs` 有 2／20 項失敗；一項原樣預期真實佇列全部 `importToQa: false`，另一項原樣要求 `health.html` 在樣本來源切換時逐位元組不變。這些斷言適用於尚未公開任何九篇的工程暫存，但在合法開啟九篇的獨立公開 QA 分支已不成立。**不能把這兩項測試失敗冒稱為網站已部署頁面故障，也不能以刪除測試方式遮掩**；後續應使測試能嚴格區分「尚未獲准公開九篇」與「僅 QA 獲准公開九篇」兩種模式，保留所有安全限制。同時 PR #14 原審核版 CI 仍為成功，實際 Pages deploy 前安全 gate `38995630481` 已成功。
