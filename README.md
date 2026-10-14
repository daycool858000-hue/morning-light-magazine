# 由己 SELF-AUTHORED

> 原專案名稱：晨光生活誌（儲存庫名稱暫不更改）。品牌說明見 [docs/BRAND.md](docs/BRAND.md)。

女性生活、權益與在地資源指南。從生活知識到官方資源，陪你找到需要的資訊，保留自己的選擇。

免費、非營利的靜態網站，整理官方制度、專業機構、生活服務、學習活動與求助管道的公開入口。

> 目前狀態：**第一階段（網站架構與視覺骨架）預覽中，尚未正式公開。**
> 依 V3.0 規格，正式公開須經使用者驗收確認後，才以 GitHub Pages 手動部署。

## 開發依據（開始任何工作前請先閱讀）

1. 《晨光生活誌 V3.0 完整開發總指令》：網站功能、分類、內容與責任界線。
2. [《晨光生活誌》永久視覺設計規範 V1.0](docs/VISUAL-STANDARD.md)：視覺風格、素材品質與視覺驗收標準（品牌已更名為「由己」，規範內容不變）。
3. [品牌識別：由己 SELF-AUTHORED](docs/BRAND.md)。

兩份規格共同適用、不得互相取代；未經使用者明確同意，不得變更視覺規範。

## 技術架構

- 純靜態網站：HTML + CSS + 原生 JavaScript，**沒有任何執行期外部套件**。
- 開發用套件只有 `sharp`（處理攝影素材），不會進入網站。
- 內容與程式分離：`content/` 內的 JSON 與 Markdown 是唯一資料來源，`scripts/build.mjs`（Node.js，零相依）產生靜態頁面到 `dist/`。
- 不使用 React／Vite：本站內容以文字與連結為主，原生技術即可完成，部署最穩定、維護成本最低。
- 不使用外部字型、CDN、分析或追蹤工具；所有請求都只連到本站。

## 常用指令（需要 Node.js 20.9 以上）

| 指令 | 用途 |
|---|---|
| `npm run build` | 建置預覽版到 `dist/`（顯示所有未撤下資料並標示查核狀態） |
| `npm run build:production` | 建置正式版到 `dist-production/`（只含「已確認」資料） |
| `npm run preview` | 建置並在本機 `http://127.0.0.1:4173/` 開啟預覽 |
| `npm test` | 建置兩種版本並執行自動化測試（需要 Playwright） |
| `npm run check-links` | 檢查所有官方網址是否可連線（需可連外網路） |
| `npm run images` | 處理 `content/photos/originals/` 的攝影素材（裁切、壓縮、移除 EXIF），需先 `npm install` |

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
  photos.json           攝影素材清單（用途、構圖說明、裁切比例、授權紀錄）
  photos/originals/     攝影素材原始檔（由使用者提供）
src/
  assets/css|js         樣式、腳本
  assets/photos/        處理後的攝影素材（npm run images 產生）
  icons/*.svg           原創概念圖示
scripts/                建置、本機預覽、連結檢查
tests/                  自動化測試
docs/                   維護、部署、備份、授權與驗收文件
.github/workflows/      CI 測試；GitHub Pages 手動部署
```

## 文件

- [永久視覺設計規範 V1.0](docs/VISUAL-STANDARD.md)
- [第一階段驗收報告](docs/ACCEPTANCE-PHASE1.md)
- [第一階段視覺重製驗收報告（視覺 V2）](docs/ACCEPTANCE-VISUAL-V2.md)
- [品牌更名與九張圖片整合驗收報告](docs/ACCEPTANCE-VISUAL-V2-BRAND.md)
- [九張圖片查核紀錄](docs/PHOTO-REVIEW.md)
- [候選圖片測試與手機操作展示](docs/ACCEPTANCE-CANDIDATE-MOBILE.md)
- [V3.1 首頁與導覽架構調整驗收報告](docs/ACCEPTANCE-V3.1.md)
- [品牌識別](docs/BRAND.md)
- [內容更新操作教學](docs/CONTENT-GUIDE.md)
- [GitHub Pages 部署、暫停與關站](docs/DEPLOYMENT.md)
- [備份與還原](docs/BACKUP.md)
- [素材與第三方授權紀錄](docs/LICENSES.md)
