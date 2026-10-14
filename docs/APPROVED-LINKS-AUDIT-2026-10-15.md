# 《由己》已核准官方網址及商標 API 補查紀錄

查核日期：2026-10-15｜依據：開發分支 `d354de8b`

## 20 筆已核准官方網址連線稽核

[GitHub Actions 執行紀錄](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/38656690123)（成功；不曾對外部署、變更資料或修改核准名單）。

- 從 16 筆核准機構入口及其官方引用、4 支核准專線及 110 SMS 官方入口，去重後共 20 個 HTTPS 網址。
- 程式連線：**19 個成功、0 個收到 404／410、1 個因 GitHub runner 憑證鏈驗證錯誤無法確認**。唯一異常為消防署 119 說明頁 `https://www.nfa.gov.tw/cht/index.php?code=list&ids=66`（Node 回報 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`）。
- 對 119 另用公開網頁擷取核對相同官方 URL，成功讀取消防署「119報案 > 119、112」頁，頁面明確說明 119 提供火災／急難救助報案及 24 小時服務：[原始官方頁](https://www.nfa.gov.tw/cht/index.php?code=list&ids=66)；[同機關其他佐證](https://www.nfa.gov.tw/kid/index.php?code=list&ids=657)。
- **解讀**：機器 TLS 例外不是網站 404，不表示 119 失效，更不是要求使用者重新核准。只有真實來源內容改變才需要更新資料及重新走版次核准程序。此次保留原有網址、原始查核資料與發布核准不動。
- [下載 GitHub 執行報告](https://github.com/daycool858000-hue/morning-light-magazine/actions/runs/38656690123/artifacts/11937556102)；到期 2026-11-13。連線結果並不能保證各項方案申請條件、服務名額或所有對外網址內容無變動。

## 智慧財產局正式商標檢索限制的精確說明

官方資料集「商標註冊申請案」提供商標名稱／類別等資訊，可透過 API 存取；但[官方 API 說明文件](https://www.moea.gov.tw/MNS/populace/news/wHandNews_File.ashx?file_id=96954)指明：查詢須附智慧財產局核發的 36 碼 `tk` 驗證碼，沒有有效驗證碼時只回傳**範例**，不是真實六組名稱的個案結果。因此不能使用測試 API 回應，或把「沒有查到」記成台灣資料庫零件。本次未替網站發起人申請 API token，也未要求付費註冊商標。

現行六組名稱保持不變，正式文字近似及相關服務類別的個案檢索仍標示未完成，查核原則參閱 [初查紀錄](TRADEMARK-PRELIMINARY-2026-10-15.md)。

## 其餘公開前事項

- 既有 Chromium 43／43、WebKit 12／12、資料圖片防漏測試及最新版 Git bundle 備份還原均已成功；新一輪 GitHub CI 結果以 Actions 實際完成狀態為準。
- 真實 iPhone Safari／Android Chrome 操作仍未完成；不能使用 WebKit 模擬代替。
- 本站未合併 `main`，GitHub Pages 未啟用，未正式部署；本輪也未重新生成圖片或擴增功能。
