# Issue #2｜第四批 9 篇＋第五批 4 篇公開 QA 整合報告（2026-10-16）

- 整理：Claude（AI）。**這是未核准測試內容的公開 QA 更新，不是正式發布核准。** `main`、production、`content/`、`content/release-approvals.json` 均未修改。
- 公開 QA 網址：https://daycool858000-hue.github.io/morning-light-magazine/ （知道網址的人都能看；noindex 與 robots `Disallow: /` 只降低被搜尋引擎收錄的機會，不是存取管制）

## 一、提交與執行紀錄

| 項目 | 編號 | 結果 |
|---|---|---|
| 整合提交 | `8e15002` | 載入器、表格支援、測試、連結檢查 |
| 部署觸發提交 | `5dc8a2f` | 只在 `qa-public-preview.yml` 加一行註解與部署前檢查，觸發條件不變 |
| CI「檢查與測試」（8e15002） | run 38809693437 | 成功：Chromium 站台 44／44、發布門檻、QA 33／33、WebKit 15／15 |
| CI「檢查與測試」（5dc8a2f） | run 38810902830 | 成功 |
| 連結瀏覽器檢查 | run 38809693177 | 完成（結果見第四節） |
| 公開 QA 部署 | run 38810902842 | 成功，Pages build version `5dc8a2f` |

## 二、13 篇文章

| 原稿 | slug（網址為 `articles/<slug>.html`） | 分類 |
|---|---|---|
| 第四批 01 故宮線上典藏 | `batch4-npm-online-collection` | 學習與活動 |
| 第四批 02 保險基礎 | `batch4-insurance-basics` | 生活與家庭 |
| 第四批 03 開業後現金流 | `batch4-business-cashflow` | 職涯與創業 |
| 第四批 04 第一次逛美術館 | `batch4-art-museum-first-visit` | 學習與活動 |
| 第四批 05 圖書館數位資源 | `batch4-library-digital-resources` | 學習與活動 |
| 第四批 06 存錢與緊急預備金 | `batch4-savings-emergency-fund` | 生活與家庭 |
| 第四批 07 勞保、勞退與國民年金 | `batch4-labor-insurance-pension` | 生活與家庭 |
| 第四批 08 開店與登記 | `batch4-business-registration` | 職涯與創業 |
| 第四批 09 創業後的政府資源 | `batch4-startup-support` | 職涯與創業 |
| 第五批 01 三部性騷擾法律 | `batch5-harassment-three-laws` | 法律與權益 |
| 第五批 02 成人預防保健與癌症篩檢 | `batch5-preventive-health-screening` | 身心健康 |
| 第五批 03 手機緊急求助與醫療卡 | `batch5-phone-emergency-sos` | 法律與權益 |
| 第五批 04 開放式課程與磨課師 | `batch5-open-courses-moocs` | 學習與活動 |

- 載入器 `scripts/lib/qa-batch45.mjs` 只讀 Issue #2 指定的三份原稿，不掃描 `docs/` 其他草稿（例如同日新增的城市福利六篇不會載入；測試也會檢查 QA 只有 30 篇）。
- 正文逐行沿用原稿：小標、清單、粗體與比較表都保留；分類行、`---`、來源後的編輯備註（尚待核定、待核准、出版前注意、公開前網址驗收等）與各檔最後的批次說明不公開。來源清單後若出現無法辨識的段落，建置會直接失敗。
- 參考來源保留原稿附註，例如「歷史文章，只用作一般觀念，不能把當年時局視為現況」。
- 每篇：`status: 待確認`、`publishApproval: not-approved`、`ownerApproved: false`；頁首顯示「來源查核：2026-10-16（AI 編輯查核，尚未經網站擁有人核准）」與「未核准測試內容」。
- 讀利專欄：30 篇（第二批 12、第三批 5、第四批 9、第五批 4）；各分類頁與站內搜尋索引都有 13 篇。
- Issue #1 的第三批 9 張資源卡「使用方式」也包含在這次部署中。

## 三、版面變動（視覺）

- Markdown 轉換器新增表格支援。目前只有第五批 01 篇用到（三部法律比較表）。
- 寬度 ≥ 560px 時是一般表格（淺沙色表頭、細線分隔、圓角外框）；手機寬度改成逐列堆疊，每格上方小字顯示欄名，避免欄位被擠成兩字一行。
- 參考來源的附註以暖灰色接在連結後面。
- 一般預覽與正式版建置後，HTML 與 Issue #2 之前**完全相同**，只有 `main.css` 多出上述樣式（正式版沒有任何表格）。

## 四、外站連結（GitHub 美國機房以 Chromium 開啟，不等於台灣 iPhone 的結果）

13 篇共 45 個來源網址：37 個可開啟，8 個未能開啟：

| 網址 | 結果 | 備註 |
|---|---|---|
| `digitalarchive.npm.gov.tw/Collection` | 403 防護驗證頁 | 同站 `/opendata/` 可開 |
| `www.npm.gov.tw/` | 403 Cloudflare 驗證 | 海外機房常見 |
| `insprod.tii.org.tw/` | 逾時 | ChatGPT 查核檔已註記曾 502／cache miss |
| `cloud.culture.tw/` | 逾時 | 第三批已上 QA 的同一入口 |
| `findbiz.nat.gov.tw/` | 403 防護驗證頁 | ChatGPT 查核檔已註記待手機驗證 |
| `laws.mol.gov.tw/…FL015154…` | 逾時 | |
| `escreening.hpa.gov.tw/Home` | **憑證日期無效（ERR_CERT_DATE_INVALID）** | ChatGPT 查核檔已註記曾回 502；**請優先用 iPhone 確認，若 Safari 也出現憑證警告，建議改用穩定的國健署官方頁** |
| `ocw.aca.ntu.edu.tw/faqs` | 403 防護驗證頁 | 同站首頁可開 |

## 五、待站主確認的編輯事項（未擅自修改原稿）

1. 第四批 04 篇的 iCulture 來源附註原文是「（跨縣市找藝文活動，原 QA 已有入口）」。「原 QA 已有入口」看起來是寫給站主的說明，目前照原文公開；是否刪去，請站主或 ChatGPT 決定。
2. 第五批 02 篇的 `escreening.hpa.gov.tw` 見上表。

## 六、請站主在 iPhone 檢查的新增項目（不需重測全站）

1. 讀利專欄往下捲，看到第四、五批 13 篇卡片，且都標「未核准測試內容」。
2. 任選幾篇打開，確認正文完整、小標清楚，最下方「參考來源」可點。
3. 打開「遇到性騷擾，為什麼有三部法律？」，看比較表在手機上是否好讀（逐列堆疊，每格上方有欄名）。
4. 「身心健康」「法律與權益」分類頁最下方的導讀文章有新文章。
5. 搜尋「故宮」「勞保」「磨課師」，可找到對應文章。
6. 第三批 9 張資源卡各有一行「使用方式」：「城市與福利」頁可看到全部 9 張；學習與活動、法律與權益、身心健康、生活與家庭分類頁也各有幾張。
7. 第四節表格中的網址，用 Safari 點點看能否開啟。
