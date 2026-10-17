# PR #18 54 主題入口｜獨立驗收與官方網址補查（2026-10-17）

**此次檢查僅為 ChatGPT 編輯／工程驗收，不是站主發布同意。** 不修改 QA、main、PR #18、`content/release-approvals.json`，也不要求 Claude 重跑已完成整站自動測試。

## 1. 最新版本與實際自動測試

- 新版整合 PR：[#18](https://github.com/daycool858000-hue/morning-light-magazine/pull/18)，分支 `claude/pr16-qa-integration-sjzq42`、提交 `e00c3295921c0e7c1d5c37c44f1244166f822066`；以 44 篇 QA (`54f96b6`) 為基礎，不直接合併舊的 45 篇。
- 已核對 Actions：
  - [run 39016699540](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39016699540) `test` 與 `calendar` **均 success**（已包含 Chromium＋WebKit）；
  - [run 39016699547](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39016699547) 54 主題官方網址稽核 **success**；
  - [run 39016687039](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39016687039) 推送測試 **success**。
- QA 開放給大眾的原址沒有部署此 PR 的 54 新入口：目前獨立 `QA_TOPIC_GUIDES_STAGING=1`、`dist-qa-topic54`；既有 QA 44 篇、日曆與孕產版保持不動。
- 已檢視 PR #18 `scripts/build.mjs` 主要邏輯：54 主題依 `keep / supplement / replace` 分流，`pregnancy` 完全優先用 PR #17 的孕產導覽。

## 2. 最新 37 個不同官方網址（不是 54 個獨立網址）

依 run 39016699547 source-check job **原始日誌**，本輪實際結果為：

| 類別 | 個數 | 含意 |
|---|---:|---|
| `OK 200` | **32** | GitHub 美國端 Chromium 成功讀取，頁名與機關／用途大致相符；不代表所有資格、開放名額已核實 |
| `BLOCKED` | **5** | 403 Cloudflare 一筆、timeout 四筆。**沒有證據顯示是 404 或失效** |
| `REVIEW` 或 `BROKEN` | **0** | 此次未確認 404／410、明顯錯誤網址或失效頁面 |

PR #16 舊報告所稱「35 個網址、29 正常、6 受阻」是**先前測次**；新的 PR #18 是**37 個網址、32 正常、5 受阻**。不應把兩種測試數字混在一起。

## 3. 五筆 GitHub 機房當下無法直接讀取網址的獨立交叉佐證

下列是對**網址對應頁面身分與公開目的**的查核，不冒充同一次 Chromium／iPhone Safari 實開，也不保證使用者在手機一定可達。

| 類別／連結 | CI 問題 | 另查到的原始官方或正式機關佐證 | 判斷 |
|---|---|---|---|
| 女性創業飛雁《找課程》 `https://www.sme.gov.tw/women/article-women-3327-18767` | HTTP 403、Cloudflare | 該**同一網址**的公開索引顯示「找課程 Find Courses」、發布日 2025-08-27、創業知能課程與中小企業網路大學校。另有署方 2026-08-19 `https://www.sme.gov.tw/article-tw-2891-13903` 女性創業計畫總覽。 | 官網頁身分明確；機器人受阻，不當成網址壞掉；實際開課以當期公告 |
| 未滿 2 歲育兒津貼 `https://twbaby.sfaa.gov.tw/home/index` | timeout | **同一網址**有「首頁｜未滿2歲兒童育兒津貼」官方公開索引；社家署 `https://www.sfaa.gov.tw/sfaa/list/detail/5e0/5KZ` 明確載線上申辦 `twbaby.sfaa.gov.tw`；臺中市社會局和臺南市官方說明亦可查制度。 | 來源身分與對應業務可交叉確認；**不能保證線上系統當下連通**。建議把社家署說明頁當備用入口 |
| 教育部家庭教育資源網 `https://familyedu.moe.gov.tw/front.aspx/index.aspx` | timeout | **同一網址**的公開正文索引明確列出「教育部家庭教育資源網」、各縣市家庭教育中心及社會大眾學習資源入口。 | 官方資源目的可確認；自動瀏覽器 timeout 不等於失效 |
| 職場霸凌《防治措施準則》第8條 `https://laws.mol.gov.tw/FLAW/FLAWDOC01.aspx?flno=8&id=FL106701` | timeout | **同一網址**官方法規公開索引顯示「職場霸凌防治措施準則（115年6月23日訂定）第8條」；亦有官方列印版 `https://laws.mol.gov.tw/FLAW/PrintFLAWDOC01.aspx?flno=8&id=FL106701` 可對照原文。 | 官方法規來源可信；要留意法規更新及原頁的「最新動態」，勿僅用舊截圖 |
| 高雄市政府社會局婦女館 `https://women.kcg.gov.tw/` | timeout | **同一網址**官方網頁可由外部擷取讀得「高雄市政府社會局婦女館」，有服務內容、服務時間、婦女培力方案、月活動資訊等導覽。 | 官方機關與用途可信；特定日期課程、現場營運、時間需點官方當期頁面 |

## 4. 主題入口變更範圍：已發現需注意的使用體驗差異

PR #18 的 54 個主題分為 **11 保持原畫面、4 只補入口、39 更換入口**；39 項中原本 16 項是「官方入口整理中」，另外 **23 項原本有站內資源卡快速跳轉**。

- 23 項新的主題索引改成一至兩筆「直接到官方原頁」的短連結，原本跳到下方卡片的**索引捷徑**可能被取代；但原本資源卡與其連結**仍在頁面下面**，並未刪除。
- 這是有意的用途修正：避免「想看某個制度，卻只跳到不夠精確的機關首頁」；現有編輯需求的方向基本符合。
- **不建議無差別把所有舊連結都補回主題索引**（手機可能過長，且部分舊連結用途不貼切）。只針對實際發現「原本有用的入口消失、沒有替代」的主題做點狀補回。後續先抽查 `family-finance`、`official-complaints`、`workplace-bullying` 和 `childcare` 的手機體感即可，不必重新造 54 份查核工作。
- 此次 QA 工程報告的測試雖通過，但**是否把獨立 staging 併入公開 QA，仍需站主明確同意**；目前不自行發布。

## 5. 接下來的最小工作

1. PR #18 可先當作 **技術整合與來源核對通過的候選版本**，**不自動等於站主驗收或網站正式發布**。
2. 現在已取得 37 個官方網址的最新 GitHub 結果及 5 個受阻網址的另源佐證：**暫不必要求 Claude 重新逐筆測試**。
3. 正式版主要剩「如何把目前 44 篇及其他已驗收功能，按照站主發布範圍輸出成 production」，不是重新建立網站。沿用現在同一 GitHub Pages 網址，並避免 QA 之後覆蓋正式站。
4. 在站主閱讀 PR #18 摘要／看一次小範圍畫面前，不擅自將這份候選併入公開 QA，更不更新 `main` 或正式部署。
