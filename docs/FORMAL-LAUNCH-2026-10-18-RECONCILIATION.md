# 《由己》正式上線整合查核（2026-10-18）

> 本檔為 ChatGPT 發布前工程查核與風險紀錄，不是站主核准快照。此檔案所在 PR #19 仍為 Draft，禁止憑本文件直接合併或部署。

## 最新公開基線（已核對 GitHub + 站主實機）
- 公開 QA：`https://daycool858000-hue.github.io/morning-light-magazine/`
- QA 分支 `qa/public-nine-articles-20261017`，HEAD `1ded1bab63c0d84368bd2ad16ba9339d6514b6ff`。
- 2026-10-18（臺灣）站主手動執行 [QA 部署 run 39072357272](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39072357272)，執行成功，站主在 iPhone 實際確認「向望」已出現。此結果不得再寫成舊「向光」。
- 公開 QA 44篇文章：讀利26／向望18；六大分類、八索引、全站小日曆、活動6與長期查詢12、孕產四段；撤稿 `exp-12` 不可重上。
- GitHub [PR #23](https://github.com/daycool858000-hue/morning-light-magazine/pull/23) 已合併 `main`，補上預設分支 `workflow_dispatch` 入口；實際 QA 分支的手動確認字串安全閘仍在，不可用普通 push 蓋站。

## 54主題的最新處理（正式版不能逕用舊 PR #18）
- Claude 最後已知完成 [PR #18](https://github.com/daycool858000-hue/morning-light-magazine/pull/18)；該 PR 基於舊 QA，仍為 Draft 且與新版 QA 已有合併衝突。
- ChatGPT 已建立 [PR #24](https://github.com/daycool858000-hue/morning-light-magazine/pull/24)：直接從「向望」QA 基底獨立整合，保留23個原本會遭替換的站內連結，並加官方原頁候選。54主題仍完整（keep11/supplement4/replace39），在獨立 staging，**沒有公開、沒有合併**。
- PR #24 主要程式測試已成功（兩個 CI run 的 test job 均 success，calendar job 尚須以整體 run 最終結果為準）。
- 外站來源查核 [run 39073102263](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39073102263)：針對 37 個新增／修正用網址，31個可開、6個 blocked/timeouts，0個明確404/410。需要臺灣實機補驗的 6 個網址：
  1. `https://www.sme.gov.tw/women/article-women-3327-18767`（飛雁課程：403）
  2. `https://familyedu.moe.gov.tw/front.aspx/index.aspx`（家庭教育：timeout）
  3. `https://twbaby.sfaa.gov.tw/home/index`（未滿2歲育兒津貼：timeout）
  4. `https://laws.mol.gov.tw/FLAW/FLAWDOC01.aspx?flno=8&id=FL106701`（職場霸凌相關法規：timeout）
  5. `https://women.kcg.gov.tw/`（高雄婦女館地方示例：timeout）
  6. `https://job.taiwanjobs.gov.tw/Internet/Index/DocDetail.aspx?docid=6649&uk=2759`（地方勞工網站目錄：timeout）
- 6個非可達結果不能等同失效。不能把這批 54 主題全部視為人工查核或正式核准。

## 2026-10-18 新增：育兒津貼來源修正與最新實際驗證
- 站主在 iPhone 確認 `https://twbaby.sfaa.gov.tw/home/index` 為無法公開使用的私人入口；**該網址不得列入正式版或公開 QA 候選**。PR #24 提交 `c0194e3` 改回原本的衛生福利部社會及家庭署卡片 `#res-sfaa` 與 `https://www.sfaa.gov.tw/`，補公開制度說明。
- 54主題候選總數仍54（keep12／supplement4／replace38），同一校驗版本新增或調整的36個網址：[Actions 39074828426](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/39074828426) 31可開／5受阻或逾時／0明確失效。
- 網頁獨立核對另讀到經濟部「女性創業飛雁課程」公開頁的課程介紹；「台灣就業通各縣市勞工網站目錄」可找到相關縣市機關列表，但工具抓取時效不同，不能憑此代替最新臺灣 Safari 驗收。
- 剩餘因海外或防爬環境受限的官方網址，不可被默認為已確認可用或列為404；必要時使用公開且用途相符的原機關入口，避免讓讀者直接落入登入／私人申辦界面。

## 目前正式發布工程的阻塞點（PR #19，尚未正式部署）
- 正式版 PR #19 基底是舊 PR #18，與 QA 已驗收的「向望」新版有差異；PR #21 雖有向望更名，但也不是 QA 已部署版的直接底稿。不得簡單依 PR #18→#19→#21 依序合併覆蓋。
- `content/launch-approvals.json` 現時 `approvedArticles`、`approvedFeatures` 都是空物件；不得偽造核准或從過去 QA 發布推導每筆新候選都獲正式版核准。
- `scripts/assert-production-ready.mjs` 目前以 **全部 44篇、全部54主題、全部35新官方資源、5組新功能必須一次過** 作硬條件。這與「已查核可發布的先上、未確認候選隔離」原則衝突。應改成精確的**核准範圍版本閘門**：不得低於原公開 QA 的必要內容與使用體驗；可排除未核准新增候選，不得為了湊數自己批准不明來源。
- 已在 `content/release-approvals.json` 獲准的基本入口／專線及示意圖要保留並逐版本比對，不要因新 `launch-approvals.json` 空白而否定舊核准。
- 正式切換到同一 GitHub Pages URL 前，仍需完成版本核准紀錄、備份與還原檢查、noindex/robots/sitemap/404 及手機實機抽驗；**不得拿舊 main 直接做正式部署**。

## 下一步（避免重派 Claude）
1. Claude：僅以 PR #24 為起點完成未解決的 staging CI、最小 UX 與獨立預覽交付；先檢查上一視窗已完成 PR #18，不重跑 54主題資料蒐集，不處理 PR #19。
2. ChatGPT：將正式版的候選範圍、現有 44篇來源及五組功能的發布門檻重新逐項比對；規劃以新版 QA 為基礎的正式工程整合與精確核准方式，不能默認54＋35全部合格。
3. 站主已驗證育兒津貼私人入口無效，且已處理；其餘官方網址由 ChatGPT 先做可公開來源替代與工具查核，確實仍不確定的再請站主抽驗，不重複要求44篇或小日曆驗收。
4. 需要正式部署時另做清楚的「本次上線包含哪些內容」清單供站主一次確認；正式網址切換不能只憑 CI 綠燈。

## 状態標籤
- 「工程 CI 成功」≠「站主實機驗收」≠「資料有來源」≠「正式發布核准」≠「已部署」。
- 2026-10-18 新增研究尚未變更公開網站，主分支亦未合併 PR #18/#19/#21/#24。
