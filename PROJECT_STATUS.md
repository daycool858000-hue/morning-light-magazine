# PROJECT_STATUS｜由己 SELF-AUTHORED

> 最後更新：2026-10-17（臺灣） · 此檔在正式上線整合草稿 PR #19 的隔離分支上，**尚未合併 main，也沒有變更現在公開網站**。重大開發、整合、驗收結果才更新。技術細節仍以 `CLAUDE.md` 和各 PR 的實際測試結果為準。

## 專案不變的定位

《由己》是免費、非營利、對所有人開放的臺灣女性生活、權益、在地資源和學習活動資訊導航。提供文章及官方原始連結，**不收集訪客資料、不要求帳號或會員、不接案、申請、報名、付款或心理／法律個案服務，也不動員或發表政治評論**。網站六分類：「生活與家庭、職涯與創業、身心健康、法律與權益、城市與福利、學習與活動」；兩個閱讀目錄：「讀利專欄」及「向光」。官方機構不代表合作夥伴；圖片是 AI 生成示意而非真實服務照片。維持原網址：
https://daycool858000-hue.github.io/morning-light-magazine/

## 目前實際狀態（不能混淆）

| 層次 | 目前確定的事 |
|---|---|
| **大眾可以打開的網站** | **公開 QA**。目前 44 篇文章，讀利26／向光18，六大分類及小日曆等功能可用，但保留測試標示與 noindex。任何知道連結的人都能打開，不必註冊。|
| **QA 分支** | `qa/public-nine-articles-20261017`，PR #17 的新基線 `54f96b6`。站主以前已做過手機操作／文章與方向審閱，**不要再將使用者已同意的方向送回內容重審**。 |
| **54 個主題新入口** | Claude 由 PR #16 重整至最新44篇 QA，產生 **PR #18**，提交 `7f36ca8`；來源查核＆頁面測試通過。小日曆 push 偶發失敗已重跑成功，站主 iPhone 實際使用可點按，同意不把它當上線障礙。**獨立 staging 未公開合併**。 |
| **正式上線工程** | ChatGPT 的 **PR #19（草稿）**，分支 `release/youji-production-promotion-prep-20261017`，以 PR #18 分支為基底。已將現有 QA 的文章、讀利／向光、日曆、六活動＋12長期入口、孕產四段、54主題與 35筆新官方資源接入 production **候選**。沒有改 main 或公開 Pages。 |
| **已明確取得的正式發布許可** | 2026-10-15 核准快照：16筆官方入口、4支專線、1筆SMS 官方管道及9張示意圖（另有衍生圖片）在 `content/release-approvals.json`。**不用重做核准**。 |
| **新的 formal 版本記錄** | `content/launch-approvals.json` 目前 44 篇文章核准欄為 **空**、5組功能／新增資源核准欄也**空**。建立它是程式接線，不代表使用者要重新審稿，也不代表正式上線已完成；最終發布範圍與真正部署要有一次明確確認。 |
| **舊版 main** | **尚未合併 PR #18／#19，不可以直接從 main 點正式部署**，否則可能替換掉現在 QA 44篇內容。 |

## 已經完成並可重用的來源與測試

- 原 44篇現有 QA 文章的正文與引用，在隔離 production 模擬輸出的**全部正文逐字比對一致**；讀利26、向光18、小日曆、活動6、長期入口12、孕產4段、54主題及 sitemap 試驗 success：[39022970198](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39022970198)。
- GitHub **預發布逐步模擬**：一篇核准及更改版本失效、單篇城市福利卡片隔離、44篇完整編輯式布局、五種已完成功能的版本精確閘門；已通過的最新證據 [39024325342](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39024325342)。
- 54 主題入口整合：PR #18 的 CI ＋37個唯一外站 URL 試驗，有32個成功、5個被機房／防爬限制阻擋、確認404/410為0；另外比對正式官方資料，**不得宣稱全部每次可連線**。
- 九筆孕產原頁官方網址：CI 9／9 成功、失效0（[39015253153](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39015253153)）。
- 35 筆 QA 官方資源：地方基本入口23／公共知識與自主學習9／新住民多語3。維持 AI 協助來源查核說明，不冒稱站主人工逐筆訪站；外站時間與資格以主管機關為準。
- 尚未加入 QA 的13篇完整文章稿存在編輯分支 `editorial/youji-full-six-topics-expansion-20261016`，另外 exp-12 已**正式撤稿、不可重新上架**；30個主題工作包是待擴充方向**不是30篇文章**。22縣市地方服務研究及13筆額外新住民官方資源仍為後續持續補充計畫。

## 正式上線之前剩下什麼（不要求重寫文章）

1. **核對 PR #19 最新完整 CI**：最後一批正式資源與功能整合修改、完整 Chromium／WebKit／小日曆測試及基礎 production release gate。目前不同任務在 GitHub 排隊或執行，**不能把較早的通過當成最新提交已全數通過**。
2. **整理一次性正式發布範圍**：沿用已確認的文章與功能，產生 `artifacts/launch-article-batch.json`（44篇指紋）及 `artifacts/launch-feature-batch.json`（日曆、活動、孕產、54主題及官方資源五組精確版本指紋）。**候選清單不等於已實際簽署的正式核准**。
3. **正式部署硬性防呆**：PR #19 增加 `scripts/assert-production-ready.mjs` 與手動 `.github/workflows/deploy-pages.yml` 閘門，必須是現有 44篇／26+18、51筆官方資源、日曆、活動6、入口12、孕產4、54主題、Google sitemap 全部在同一正式版，才可覆蓋 GitHub Pages。原始核准內容改了會失效。
4. **QA 同網址防覆蓋**：PR #19 已改 `.github/workflows/qa-public-preview.yml` 為**必須手動確認**才能重新部署；但**真正 QA 分支上的自動觸發目前還沒有被修改**，最後切換前必須按正確順序套用變更，不可因為 PR #19 有文件就宣稱正式站已受保護。
5. PR #18／PR #19 的合併順序、可回溯備份、正式版首頁／手機 375px 或實機最終目視，取得**正式發布與切換同網址的明確授權**，再從 main 手動執行部署；上線後核對首頁、文章直達連結、活動、110／119、搜尋、robots 和 sitemap。

## 不重工原則與風險說明

- 站主已經決定網站架構、文章內容方向、現在的讀利與向光呈現，**不要反覆要她逐篇重新確認**。
- Claude Code 額度有限，只讓 Claude 做真正剩餘且無法由 ChatGPT 處理的技術工作。PR #18 已完成；ChatGPT 可自行繼續 PR #19 的 GitHub 工程。
- 不再使用撤稿 exp-12；舊 45篇 QA 暫存版本不可覆蓋新 44篇。
- GitHub Action **全綠不等於站主在 iPhone 看過新畫面**；預覽／正式部署也不是同一件事。
- 對話中的中文回覆要白話、繁體臺灣用字；給 Claude 的技術指令則可以詳細。沒有授權不得發布正式網站。

## 關聯文件

- [PR #18](https://github.com/daycool858000-hue/morning-light-magazine/pull/18) Claude 54 主題入口整合
- [PR #19](https://github.com/daycool858000-hue/morning-light-magazine/pull/19) ChatGPT 正式發布保留既有內容功能的技術整合
- [文章和計畫備忘](https://github.com/daycool858000-hue/morning-light-magazine/blob/editorial/youji-full-six-topics-expansion-20261016/docs/ARTICLE-BACKLOG-AND-PLANNED-CONTENT-2026-10-17.md)
- [上線前逐項查核](https://github.com/daycool858000-hue/morning-light-magazine/blob/editorial/youji-full-six-topics-expansion-20261016/docs/PRELAUNCH-ITEM-BY-ITEM-AUDIT-2026-10-17.md)

