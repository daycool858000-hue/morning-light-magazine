# 素材與第三方授權紀錄

## 網站使用的素材

| 素材 | 位置 | 來源與授權 |
|---|---|---|
| 晨光窗景插畫 | `src/assets/img/hero-morning.svg` | 本專案原創（以 SVG 程式繪製），未使用任何外部圖片 |
| 概念圖示（獅子、愛心葉片、房屋日光、萌芽公事包、城市地標、書本日曆、書頁葉片、切換視窗等） | `src/icons/*.svg` | 本專案原創，未使用、臨摹或修改任何機關、團體或品牌 Logo |
| 字型 | — | 不內嵌字型，使用訪客裝置內建系統字型 |
| 照片 | — | 第一階段未使用任何照片 |

## 執行期第三方套件

無。網站不載入任何外部 JavaScript、CSS、字型或 CDN。

## 開發與測試工具（不會進入網站）

| 工具 | 用途 | 授權 |
|---|---|---|
| Node.js | 執行建置腳本 | MIT |
| Playwright（測試時臨時安裝） | 自動化瀏覽器測試 | Apache-2.0 |
| GitHub Actions：actions/checkout、setup-node、configure-pages、upload-pages-artifact、deploy-pages | CI 與部署 | MIT（GitHub 官方） |

## 外部機構資訊

本站只使用機構名稱、官方網址、公開電話與自行撰寫的簡短介紹，不使用機構 Logo、照片、文章全文或網站截圖。

## 新增素材時

照片或圖片須記錄：來源網址、作者、授權條款、取得日期；部署前移除 EXIF／GPS 中繼資料（例如 `exiftool -all= 檔名.jpg`）。
