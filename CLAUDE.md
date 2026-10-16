# 由己 SELF-AUTHORED（原晨光生活誌）：開發須知

開始任何開發、修改或驗收工作前，必須先閱讀：

1. 《晨光生活誌 V3.0 完整開發總指令》（網站功能、分類、內容與責任界線）。
2. `docs/VISUAL-STANDARD.md`《晨光生活誌》永久視覺設計規範（視覺風格、素材品質與視覺驗收）。
3. `docs/BRAND.md` 品牌識別（前台品牌為「由己 SELF-AUTHORED」）。

規則：

- 兩份規格共同適用，不得互相取代。
- 未經使用者明確同意，不得覆寫、刪除或變更 `docs/VISUAL-STANDARD.md`，也不得改變品牌識別與視覺方向。
- 每一階段的驗收報告都必須包含「視覺規範符合程度」項目；涉及重大視覺變動時，須提供修改前後截圖供使用者確認。
- 不得僅憑自動化測試通過就宣稱視覺驗收完成。
- 圖片素材的 `status` 只有使用者確認後才能改為「已檢查」；不得為了通過建置而批次核准。
- 未經使用者確認，不得合併 main、不得部署 GitHub Pages、不得正式公開。
- 所有工作回報使用繁體中文（台灣用語）。

---

## 專案概要（給每次新對話快速上手）

- **用途**：《由己 SELF-AUTHORED》是免費、非營利的台灣女性生活、權益與官方資源導覽靜態網站。只整理公開資訊與官方入口，不提供會員、登入、表單、追蹤或付費服務。
- **技術**：Node.js 22 自寫靜態網站產生器（`scripts/build.mjs`），無執行期套件；測試用 Playwright（Chromium、WebKit）。CI 與部署都用 GitHub Actions。
- **分支**：開發在 `claude/morning-light-visual-v2`；`main` 停在 `ae8a4a0`，**不得合併或修改**。
- **三種建置模式**：
  - `preview` → `dist`（一般預覽）
  - `production` → `dist-production`（正式版，只含 `content/release-approvals.json` 已核准資料）
  - `qa` → `dist-qa`（公開 QA 測試版＝preview＋未核准候選內容，全部標「未核准測試內容」＋noindex）
- **公開 QA 網址**：https://daycool858000-hue.github.io/morning-light-magazine/
  - 由 `.github/workflows/qa-public-preview.yml` 部署，**只有修改這個檔本身才會觸發**。
  - 部署方式：在檔案最上方加一行日期註解，並視需要補部署前檢查。**每次部署都要站主明確同意。**

### 資料夾結構
| 路徑 | 內容 |
|---|---|
| `config/site.json` | 網站設定（正式版、預覽共用，QA 文案要另外覆寫，不要直接改這裡） |
| `content/` | 正式資料：資源、專線、分類、縣市、照片；`release-approvals.json` 為正式核准快照，**不得修改** |
| `docs/` | 規格、報告、ChatGPT 撰寫的候選文章與資料（QA 載入器只讀指定檔案） |
| `scripts/build.mjs` | 建置主程式（所有頁面樣板） |
| `scripts/lib/qa-*.mjs` | 各批 QA 候選內容載入器：batch2、batch3、batch45、batch6、english、activities |
| `scripts/lib/toward-light-editorial.mjs` | 向光八索引與延伸閱讀的文章對應 |
| `scripts/check-links-browser.mjs` | Chromium 外站連結檢查（`--set=batch45`、`batch6`、`activities`） |
| `src/assets/css/main.css` | 全站樣式；`src/icons/` 圖示 |
| `tests/` | `site.test.mjs`（正式版 44 項）、`release-gate.test.mjs`、`qa-batch2.test.mjs`（QA 全部檢查）、`mobile-webkit.test.mjs`、`qa-webkit.test.mjs` |

### 常用指令
- 全部測試：`npm test`（WebKit 本機沒有安裝，由 CI 執行）
- 本機看 QA：`npm run qa-preview`
- CI 狀態：`curl -s "https://api.github.com/repos/daycool858000-hue/morning-light-magazine/actions/runs?branch=claude/morning-light-visual-v2&per_page=5"`

## 目前進度（2026-10-16 更新）

- 公開 QA 已部署到 `a49b80a`（內容來源 `707a000`）：36 篇未核准 QA 文章、城市福利「先了解有哪些福利」、讀利快捷入口、向光八個兩欄索引，以及讀利、向光頁首文案。**站主已用 iPhone 驗收讀利與向光，兩個目錄結案，不再修改。**
- 開發分支：首頁「活動與講座」小入口＋`activities.html` 官方查詢頁（`3265b4b`），已依編輯審查做部署前修正：只放 12 個長期官方查詢入口（移出國家圖書館冬季講座與 2027 全國技能競賽兩筆時間性活動，原始來源留在編輯分支研究文件）、拿掉狀態圖例、全站 QA 提示列恢復 `a49b80a` 原文（讀利、向光等既有 QA 頁與 `a49b80a` 逐位元組相同）。資料在 `docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json`，載入器只接受 `type: portal`。**尚未部署公開 QA，等站主確認**。
- `familyedu.moe.gov.tw` 在 GitHub 美國機房逾時，記為「待臺灣實機複查」，不要自動刪除。
- 第七至九批十篇成人候選文章只在 `docs/`，**未核准，不得匯入**。

## 下一步

1. 等站主確認「活動與講座」後，才部署公開 QA。
2. 第二階段：新住民跨主管機關入口＋英文／多語輔助（規格見編輯分支 `editorial/batch7-9-source-review-20261016` 的 `docs/CLAUDE-NEXT-STAGES-HOMEPAGE-ACTIVITIES-AND-NEW-IMMIGRANT-MULTILINGUAL-2026-10-16.md`）。
3. 第三階段：每月一次的官方連結檢查（GitHub Actions，只產生報告）。

## 省額度的工作習慣（每次對話都要遵守）

1. **只讀這次任務需要的檔案**，不要整個專案都讀。先看本檔的資料夾結構，再用搜尋找到要改的地方。
2. **每完成一個功能並推上 GitHub 後**：
   - 更新本檔的「目前進度」和「下一步」，並一起推上去。
   - 明確告訴使用者：「這個任務完成了，請開一個新的工作階段繼續」。
3. **對話變很長時**（例如來回超過約 15～20 次、已經做完一個段落，或系統開始壓縮先前對話），要主動提醒使用者開新的工作階段，並先把目前進度寫進本檔、推上 GitHub。
4. 提醒時用簡單的中文說明原因，例如：「對話太長會比較耗額度、也容易忘記前面的細節；進度已經寫進 CLAUDE.md，開新的工作階段後我會從這裡接著做。」
