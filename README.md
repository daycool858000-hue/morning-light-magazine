# 晨光生活誌 Morning Light Magazine

免費、非營利的台灣女性生活資訊導航靜態網站。整理官方制度、專業機構、生活服務、學習活動與求助管道的公開入口。

> 目前狀態：**第一階段（網站架構與視覺骨架）預覽中，尚未正式公開。**
> 依 V3.0 規格，正式公開須經使用者驗收確認後，才以 GitHub Pages 手動部署。

## 技術架構

- 純靜態網站：HTML + CSS + 原生 JavaScript，**沒有任何執行期外部套件**。
- 內容與程式分離：`content/` 內的 JSON 與 Markdown 是唯一資料來源，`scripts/build.mjs`（Node.js，零相依）產生靜態頁面到 `dist/`。
- 不使用 React／Vite：本站內容以文字與連結為主，原生技術即可完成，部署最穩定、維護成本最低。
- 不使用外部字型、CDN、分析或追蹤工具；所有請求都只連到本站。

## 常用指令（需要 Node.js 18 以上）

| 指令 | 用途 |
|---|---|
| `npm run build` | 建置預覽版到 `dist/`（顯示所有未撤下資料並標示查核狀態） |
| `npm run build:production` | 建置正式版到 `dist-production/`（只含「已確認」資料） |
| `npm run preview` | 建置並在本機 `http://127.0.0.1:4173/` 開啟預覽 |
| `npm test` | 建置兩種版本並執行自動化測試（需要 Playwright） |
| `npm run check-links` | 檢查所有官方網址是否可連線（需可連外網路） |

## 目錄

```
config/site.json        網站名稱、導覽、GitHub Pages 路徑、停止更新公告
content/
  categories.json       六大生活主題、主題索引、「我想……」入口
  resources.json        機構與官方資源名錄（含查核狀態與日期）
  hotlines.json         求助專線與簡訊、視訊報案管道
  events.json           近期活動
  counties.json         全台 22 縣市
  articles/*.md         導讀文章
  pages/*.md            關於、免責聲明、隱私宣告、查核說明
src/
  assets/css|js|img     樣式、腳本、原創插畫
  icons/*.svg           原創概念圖示
scripts/                建置、本機預覽、連結檢查
tests/                  自動化測試
docs/                   維護、部署、備份、授權與驗收文件
.github/workflows/      CI 測試；GitHub Pages 手動部署
```

## 文件

- [第一階段驗收報告](docs/ACCEPTANCE-PHASE1.md)
- [內容更新操作教學](docs/CONTENT-GUIDE.md)
- [GitHub Pages 部署、暫停與關站](docs/DEPLOYMENT.md)
- [備份與還原](docs/BACKUP.md)
- [素材與第三方授權紀錄](docs/LICENSES.md)
