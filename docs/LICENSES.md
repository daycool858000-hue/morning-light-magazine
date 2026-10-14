# 素材與第三方授權紀錄

## 網站使用的素材

| 素材 | 位置 | 來源與授權 |
|---|---|---|
| 品牌標誌圖形（葉枝與圓點） | `src/icons/logo.svg` | 本專案原創（視覺 V2 繪製），未參照或臨摹任何既有標誌；品牌文字組合見 [BRAND.md](BRAND.md) |
| 手電筒圖示（首頁「有急事」入口） | `src/icons/flashlight.svg` | 本專案原創（V3.1 繪製），未參照任何機關、團體或品牌標誌 |
| 概念圖示（獅子、愛心葉片、房屋日光、萌芽公事包、城市地標、書本日曆、書頁葉片、切換視窗等） | `src/icons/*.svg` | 本專案原創，未使用、臨摹或修改任何機關、團體或品牌 Logo；視覺 V2 僅調整配色 |
| 字型 | — | 不內嵌字型，使用訪客裝置內建系統字型 |
| 照片風格圖片（9 張） | 原檔 `content/photos/originals/*.png`；輸出 `src/assets/photos/` | ChatGPT 圖像生成工具（OpenAI）於 2026-10-14 生成的 AI 示意圖像，由使用者提供。依 OpenAI 使用條款，使用者擁有輸出內容；本站不宣稱專屬著作權。**非實地攝影**。目前皆為「待檢查」，逐張結果見 [PHOTO-REVIEW.md](PHOTO-REVIEW.md) |
| ~~晨光窗景插畫~~ | ~~`src/assets/img/hero-morning.svg`~~ | 視覺 V2 已移除（使用者否決扁平插畫方向）；第一階段版本保留於 commit `9ed8aaf` |

## 攝影素材登錄表

每張照片加入網站前，必須在 `content/photos.json` 填寫以下欄位，並依 `docs/VISUAL-STANDARD.md` 第四章完成 8 項檢查，才能把 `status` 改為「已檢查」。正式版只會使用「已檢查」的照片。

| 欄位 | 內容 |
|---|---|
| `source` | 素材來源，例如「使用者以 ChatGPT 圖像生成，2026-10-20」或「攝影者姓名」 |
| `license` | 使用依據，例如「生成服務條款允許商業與非商業使用，版權歸使用者」、授權條款名稱與網址 |
| `checkedAt` | 實際完成 8 項檢查的日期 |
| `status` | 待補 → 待檢查 → 已檢查 |

不得使用：網路下載的圖片、參考示意圖的裁切、機構官方照片、第三方 Logo、未確認授權的圖庫圖片。

## 執行期第三方套件

無。網站不載入任何外部 JavaScript、CSS、字型或 CDN。

## 開發與測試工具（不會進入網站）

| 工具 | 用途 | 授權 |
|---|---|---|
| Node.js | 執行建置腳本 | MIT |
| Playwright（測試時臨時安裝） | 自動化瀏覽器測試 | Apache-2.0 |
| sharp 0.35.5（開發用套件） | 攝影素材裁切、壓縮、移除 EXIF／GPS；`npm audit` 0 個已知弱點（2026-10-14） | Apache-2.0 |
| GitHub Actions：actions/checkout、setup-node、configure-pages、upload-pages-artifact、deploy-pages | CI 與部署 | MIT（GitHub 官方） |

## 外部機構資訊

本站只使用機構名稱、官方網址、公開電話與自行撰寫的簡短介紹，不使用機構 Logo、照片、文章全文或網站截圖。

## 新增素材時

照片或圖片須記錄：來源網址、作者、授權條款、取得日期；部署前移除 EXIF／GPS 中繼資料（例如 `exiftool -all= 檔名.jpg`）。
