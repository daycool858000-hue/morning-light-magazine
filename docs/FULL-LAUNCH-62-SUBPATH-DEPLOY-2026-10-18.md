# 完整首發 62 篇隔離預覽：獨立測試子網址部署紀錄（2026-10-18）

**未核准測試內容，非正式網站。** 站主已同意把 62 篇（含 13 篇來源待複核草稿）放到公開但禁止搜尋引擎收錄的獨立子網址。

## 部署

| 項目 | 內容 |
|---|---|
| 網址 | https://daycool858000-hue.github.io/youji-topic54-preview/full-launch-62/ |
| 來源 | `morning-light-magazine` 分支 `review/youji-full-launch-integration-20261018` 提交 `4ca3fd5`（完整 CI run `39099700630` success） |
| 建置 | `QA_EXPANSION_QUEUE=docs/QA-FULL-LAUNCH-ALL-62-WITH-CITY-SERVICES-2026-10-18.json QA_TOPIC_GUIDES_STAGING=1 QA_PENDING_REVIEW_MODE=1 node scripts/build.mjs --mode=qa --out=dist-qa-all62-city-review` |
| 目標 | `youji-topic54-preview` 的 `main`，新增 `full-launch-62/`（190 個檔案） |
| 部署提交 | `2886c20699fcd2b8bdbd948c3231673c1fa4b766` |
| GitHub Pages | run `39106678864` success |
| 回復點 | 分支 `backup/topic54-before-full-launch-62-20261018`（`16068fb`，部署前原 54 主題網站） |

- 唯一改動：`full-launch-62/404.html` 的絕對路徑 `/morning-light-magazine/` → `/youji-topic54-preview/full-launch-62/`；其他頁面原本即為相對路徑，與建置輸出逐位元組相同。
- 原 54 主題網站根目錄所有既有檔案（含 `index.html`、`404.html`、`robots.txt`、`README.md`）未修改。
- 根目錄 `robots.txt` 為 `Disallow: /`，涵蓋子資料夾；全部 79 頁另有 `noindex`。
- 子資料夾內不存在的網址會顯示原 54 主題網站的 404 頁（GitHub Pages 只使用根目錄 404），屬正常現象。
- 未修改正式網站 main、公開 QA、文章原稿、`content/release-approvals.json`，未合併任何 PR。

## 檢查

`scripts/check-full-launch-62-live.mjs`（只讀取網頁）；部署前以本機相同子路徑 Chromium 21 項全過，部署後由 `.github/workflows/full-launch-62-live-check.yml` 以 Chromium 與 WebKit 實際開啟公開網址。項目：站內 78 頁全部 200 且無連結跳出子資料夾、62 篇文章、exp-12 未恢復、13 篇「編輯草稿：來源與資料尚待複核」、每頁 noindex 與「未核准測試內容」、CSS 與圖片、375px 無左右溢位、六大分類、讀利 38／向望 24、活動頁 9 場＋小日曆、搜尋結果可開啟、原 54 主題首頁正常。另以建置檔確認 14 個長期查詢入口與六縣市 15 筆服務入口。

## 視覺規範符合程度

本次只搬移已通過整合測試的建置內容，未改版面、樣式或圖片；WebKit 為模擬 Safari，**不等於站主 iPhone 實機視覺驗收**，仍待站主確認。
