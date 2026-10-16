# 《由己 SELF-AUTHORED》｜2026-10-16 公開 QA 更新交接紀錄

**更新性質：** QA-only 測試網站，不是正式發布；沒有修改 `main`、正式資料核准快照、會員／登入／個資欄位。  
**公開 QA 網址：** https://daycool858000-hue.github.io/morning-light-magazine/  
**公開 QA 部署：** GitHub Actions [run 38815169276](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/38815169276)，**成功**；部署版本 `9f5b1f8364ef95da0cb6d1f965f73742019c9670`。  
**先前完成的第四、五批 13 篇文章整合：** Issue #2，run `38810902842` 先部署成功；此前 Chromium 44、QA 33、WebKit 15 通過。  
**英文功能合併前完整 CI：** merge commit `d022c6e8e` 的 [run 38814863350](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/38814863350) 成功（Chromium、QA、WebKit 全部成功）。  
**此次部署 workflow 修改：** `9f5b1f836`，只增加註解與更嚴格的 QA 部署前內容檢查，確保英文卡、資料來源勘誤、未核准與 noindex 存在；沒有改動其他分支部署觸發條件。

## 這次 QA 更新內容

1. **8 張既有全國資源卡**新增經查核的英文機構名稱（有官方名稱才列）與簡短英文用途，使用 `lang="en"`，原有中文仍保留。
2. **3 張新住民／多語官方資源 QA 卡**：移民署 National Immigration Agency 官方英文資訊、IFI 新住民培力發展資訊網、1990 外來人士在臺生活多語諮詢；使用條件照實註明，不假定第三方完全免登入或所有服務免費。
3. **站內搜尋**可用 immigration／residence／childcare／legal aid 等英文關鍵字找到相關資源；保留既有中文搜尋與清空功能，沒有增加第二套網站或語言切換。
4. **第四批美術館導讀**來源的內部備註「原 QA 已有入口」刪除，改成讀者可理解的「跨縣市查找藝文活動」。
5. **第五批篩檢導讀**將 GitHub 美國機房出現 `ERR_CERT_DATE_INVALID` 的 `escreening.hpa.gov.tw/Home` 換成 [國民健康署 2026-04-10 更新的「22 縣市癌症篩檢活動專區」](https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=612&pid=19989&sid=1102)。編輯保留原網址憑證警告的核對紀錄，不要求訪客繞過瀏覽器安全提示。

## 測試和發布隔離

- `scripts/lib/qa-english.mjs` 從獨立 `docs/QA-ENGLISH-RESOURCE-DISCOVERY-2026-10-16.json` 為 QA 資源疊加英文欄位，不直接覆寫 `content/resources.json`。
- 第四、五批文章 QA-only loader 仍逐篇解析來源，遇到無法辨識的編輯備註即失敗，不會默默輸出錯誤內文；已修正新增的查核備註標籤以符合既有 loader。
- 窄螢幕英文卡可斷行、按鈕可折行，CI 具 320px 手機寬度測試。原已驗收的搜尋功能不改；測試只在 CI 偶發延遲時等到清除按鈕可見且寬高 **≥44px**，條件未放寬。
- GitHub Pages QA 部署前確認 `National Immigration Agency`、1990 官方英文名稱、`lang="en"`、兩篇文章勘誤、未核准標示及 noindex；QA 發布 guard 全部成功才完成 run `38815169276`。
- `main` 在此次查核仍為 `ae8a4a0e45f51455c7bebdff6461761400a951e6`，不合併、不改正式發布資料。

## 尚待站主手機實機驗收（只需新增部分）

- 在 **「城市與福利」** 找到移民署、IFI 與 1990 卡，確認英文名稱及摘要不擠壓或超出畫面。
- 搜尋 `immigration` 和 `childcare`，是否能找到相關卡；中文搜尋和清空原先已驗收，不必重新逐項測試。
- 美術館文章來源備註是否乾淨、健康篩檢文章是否導向新國健署的 22 縣市入口。
- 部分外部國家機關網站會阻擋海外 GitHub Runner，**沒有被證明 100% 在所有裝置上可開啟**；不因美國 Runner 403 就推定官方網站失效。Safari 如遇憑證警告，直接停止該連線，不繞過。

## 後續工程順序

1. 站主先增量驗收本次 QA：第四、五批新增文章、英文短介、移民署多語入口、兩篇勘誤。QA 通過不自動升級為正式發布。
2. 下一輪 **Issue #3**：將已寫好的「城市與福利」六篇福利情境導讀加入 QA，在現有縣市機構入口附近提供「先了解有哪些福利」，不新增地點地址、福利資格測驗或第七主分類。
3. 內容方向持續多元化，但先確保所有新文章有具體用途、可核對來源，以及正式／QA 隔離；不重寫已驗收的 V3.3 和搜尋介面。
