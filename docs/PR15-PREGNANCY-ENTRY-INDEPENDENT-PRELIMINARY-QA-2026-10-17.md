# 《由己》PR #15「懷孕與生育相關福利」獨立工程初驗

**記錄日期：2026-10-17（臺灣）／查核者：ChatGPT（AI）／尚未完成最終工程 CI 驗收、未取得更新公開 QA 同意。**

## 工程事實與版本

- 草稿 PR #15：`https://github.com/daycool858000-hue/morning-light-magazine/pull/15`
- 分支 `claude/pregnancy-benefits-content-8sjgqh`，提交 `cae89bcafce2136ebd1e83d9b1cb8d3dc45977ee`。
- 基於已成功部署的 QA 分支 `qa/public-nine-articles-20261017`，不是舊 PR #13／14；PR #11 編輯規劃只讀取，沒有合併。
- 20個變更檔，含 QA-only資料、載入器、`scripts/build.mjs`、少量CSS、靜態和 Chromium/WebKit 測試、截圖與驗收文件。
- 未合併 main，未發布 GitHub Pages，也未修改 `content/release-approvals.json`。

## 首輪核對範圍

- QA 才讀 `docs/QA-LIFE-FAMILY-PREGNANCY-GUIDE-2026-10-17.json`，狀態 `candidate-not-approved` 且 `ownerPublicationApproval:false`；preview/production 的內容保持不收錄。
- 原來生活與家庭第01項 `#pregnancy` 保留，整理中改為同頁閱讀指引 `#pregnancy-guide`。四段依序是公費產檢與孕期健康、生育給付分保別、職場請假、出生登記及地方生育獎勵；內連現有育兒津貼、托育、法律與城市主題。沒有多開分類、沒有要求個資或另造來源卡。
- 2026生育給付文字已核對勞保局 `https://www.bli.gov.tw/0109643.html` 的實際內文：勞保生育給付加發補助合計至10萬元，並非每人另外領10萬元；適用對象還取決於生產日期、保別、國籍／身分、加保與相關規定。國保／無保別各有指定原頁，文章有分流且不替讀者判定金額。
- 九個官方原始網址在 GitHub Actions `39000239040` 的 Chromium 開頁日誌 **9／9 回傳200、頁名與預期用途相符，失效0筆**。PG01、PG02過去 AI 工具的直接閱讀失敗已在這輪 CI 確認頁面可開，但這仍不等於臺灣手機人工驗收；報告應區分兩者，不可繼續把PG01/PG02寫成「CI待驗」。
- 看過 390px 主題01與閱讀區首屏、320px全文、1280px主題01截圖；文案層級明確，無大卡化。**在390px 的首屏截圖中，固定右下角近期活動小日曆恰好覆蓋第一筆官方連結部分文字**。這是確實可見的局部視覺問題，需在發布前**檢查它是否造成連結被遮或不可點**；調整應保持日曆本身不消失、不大改既有視覺、不破壞其它頁面。新增 Chromium/WebKit 覆蓋或判斷依據，不能只以「沒有水平捲動」宣稱完全沒有遮擋。
- `src/assets/css/main.css` 新增的 CSS 選擇器都集中在 pregnancy 區域／對應題01連結，沒有發現全站版型重設。
- CI push `39000238984`、PR `39000254287` 在本次初驗時仍在跑建置與測試（**不可冒稱成功**）；須待實際查核 WebKit 320／375／390／1280 與完整 job log，再決定是否可以上公開QA。

## 下一步需 Claude 補的驗收紀錄

1. 更新九個官方網址的 CI 結果表：PG01～PG09「美國 GitHub Chromium 200」，與 AI 外站資料用途核對、站主臺灣手機讀取分開表示。
2. 檢查近期活動固定浮動日曆在390px閱讀首屏是否遮住官方連結文字或點擊區；如有妨礙，僅做最小局部調整，再補 Chromium/WebKit 截圖與回歸測試。先確認觸控交互，不要擅自重做全站日曆。
3. 確認 `npm test`／WebKit 的最終 run，若未 success 直接修正，勿為綠燈刪掉保護測試。
4. 更新 CLAUDE.md 和 QA驗收報告的最後狀態。獲站主明確授權後才可另行部署公開 QA，**不得自行合併main或改正式發布核准快照**。

本檔是 PR #11 的編輯／工程交叉查核紀錄，不是對 PR #15 的程式修改，也不代表站主逐篇核准。
