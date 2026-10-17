# 54 主題入口整合報告（PR #16 → 44 篇新版 QA）｜2026-10-17

**狀態：獨立 staging 測試版，未部署公開 QA、未合併 main、未核准正式發布。**

## 基礎與來源

| 項目 | 內容 |
|---|---|
| 工程基礎 | `qa/public-nine-articles-20261017` @ `54f96b6`（Merge PR #17，44 篇） |
| 移植來源 | PR #16 `claude/verified-all-54-topic-guides-20261017` @ `4e40263`（原以 45 篇舊版 `15a4621` 為基礎） |
| 整合分支 | `claude/pr16-qa-integration-sjzq42` |
| 移植方式 | 只取 PR #16 相對 `15a4621` 的 8 個檔案改動，未帶入舊 45 篇內容 |

## 已整合

- 54 入口資料 `docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json`（原樣，未改內容）：11 維持、4 補充、39 修正，12 條制度提醒。
- 載入器 `scripts/lib/qa-topic-guides.mjs`、樣式、`check-links-topic54.mjs` 連結稽核與工作流程（原樣）。
- `scripts/build.mjs`：
  - 衝突處理：主題索引先判斷 PR #17 懷孕與生育閱讀區，`pregnancy` 主題沿用 PR #17 導覽，54 入口資料不覆蓋（PR #16 本來就把 `pregnancy` 設為 `keep`）。
  - 54 入口仍只在 `QA_TOPIC_GUIDES_STAGING=1` 時載入，並禁止輸出到 `dist`／`dist-qa`／`dist-production`。
- 測試 `tests/qa-topic-guides-54.test.mjs`：沿用 PR #16 檢查，改為自建 `dist-qa-topic54-base` 基準版比對（不受其他測試改寫 `dist-qa` 影響），並補新版相容檢查。

## 整合補測（只針對衝突與新版相容性）

| 檢查 | 結果 |
|---|---|
| 與 PR #16 原輸出逐字比對 54 個主題區塊 | 53 個完全相同；唯一差異 `pregnancy`，為依設計沿用 PR #17 |
| PR #16 原有靜態檢查＋新版相容（共 34 項） | 全過：44 篇不變、exp-12 未重新上架、孕產閱讀區與主題 01 原樣、小日曆、未核准標示／noindex、搜尋索引、讀利、向光未變；`dist`、`dist-production` 無 54 入口 |
| `tests/qa-topic-guides-54-browser.test.mjs`（320／375／390／1280px） | Chromium 本機 32 項全過；WebKit 由 CI 執行 |
| 小日曆避讓（既有測試，指向 staging 六大主題頁） | Chromium 本機 16 項全過；WebKit 由 CI 執行 |
| 完整 `npm test` | 本機通過 |
| 公開 QA 建置（`dist-qa`，不帶 staging 變數） | 44 篇，無任何 54 入口連結或提醒 |

外部網址開啟結果沿用 PR #16 的 Chromium 稽核（35 個網址，29 正常、6 外站限制／海外逾時、0 確認失效），本輪未重新逐筆研究。

## 視覺規範符合程度

- 沿用 PR #16 既有樣式：主題索引內的純文字底線連結＋↗、低彩度小字提醒；未新增卡片、色彩或圖片，符合《VISUAL-STANDARD》低彩度、留白為主的方向。
- 手機點擊高度 44px、320px 起無橫向捲動（Chromium 測試）；小日曆避讓既有規則不受影響。
- 修改前後截圖（法律與權益主題索引，Chromium，小日曆與固定頁首於截圖時暫時移除）：
  - 390px：`docs/qa-media/topic54-law-before-390-2026-10-17.png` → `docs/qa-media/topic54-law-after-390-2026-10-17.png`
  - 1280px：`docs/qa-media/topic54-law-before-1280-2026-10-17.png` → `docs/qa-media/topic54-law-after-1280-2026-10-17.png`
- 自動化測試通過不等於視覺驗收完成，須站主實機確認。

## 仍需確認

1. **「修正」39 項會取代原主題下的站內跳轉連結**（PR #16 原設計，整合版輸出與 PR #16 相同）：其中 16 項原為「官方入口整理與查核中」，23 項原本有站內資源卡跳轉（例：法律 01 原「勞動部、婦女新知基金會」改為「性別平等工作法權益整理 ↗」；`family-finance`、`official-complaints` 各原有 4 個）。原資源卡仍在同頁下方「官方與正式機構入口」，未刪除。是否接受此取代方式，請 ChatGPT／站主確認。
2. 54 入口資料仍為 `qa-candidate-not-approved`，內容（資格、金額、用途說明）屬 AI 編輯整理，需 ChatGPT 驗收與站主決定。
3. PR #16 稽核中 6 個外站受限／海外逾時網址，需臺灣 Safari 人工點開確認。
4. WebKit 只是模擬 Safari，不等於真正 iPhone；畫面觀感須站主實機確認。
5. 若決定公開：需另行修改公開 QA 部署流程讓 QA 建置載入 54 入口（目前刻意不載入），並取得站主明確同意後才能部署。
