# 由己｜54 主題入口與已驗收「向望」版本接合（2026-10-18）

## 隔離範圍
- 本分支直接以站主已驗收的 QA `qa/public-nine-articles-20261017`，提交 `1ded1bab63c0d84368bd2ad16ba9339d6514b6ff` 為底稿；不使用舊「向光」站台覆寫。
- 54 主題入口仍是**未獲站主核准的候選**。預設 QA、preview、production 都不載入；只能在設定 `QA_TOPIC_GUIDES_STAGING=1`、輸出到獨立 `dist-qa-topic54` 時測試。
- 主題分布：54 完整保留（11 keep、4 supplement、39 replace）。其中 23 個原站內跳轉由程式保留並補充外連，另 16 個原空白主題增加直達入口。
- 保留原公開QA的「向望」、讀利26、向望18、六大分類、八索引、44篇文章、撤稿 exp-12、小日曆及孕期閱讀區。
- 原 `content/release-approvals.json`、`content/launch-approvals.json`、`.github/workflows/qa-public-preview.yml` 不改；未合併 main，不觸發 GitHub Pages。
- 特別注意：高雄婦女館是地方例子；更年期衛教更新日期待官方核實。43個不同外部URL不代表全數即時可達。
- 自動化 CI 的 Chromium／WebKit／小日曆避讓，僅代表工程通過；站主尚未批准公開這批54個主題入口。

參考：`docs/REVIEW-TOPIC54-23-NAVIGATION-2026-10-18.md`。
