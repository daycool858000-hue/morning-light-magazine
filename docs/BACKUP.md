# 備份與還原

不能只依賴 GitHub 的提交紀錄。建議每次重要更新或每月一次，下載完整備份並存放在 GitHub 以外的位置（例如個人雲端硬碟與一個外接儲存裝置）。

## 備份內容

完整原始碼壓縮檔即包含：原始碼、文章（`content/articles`）、資源名錄（`content/*.json`）、圖片與圖示（`src/`）、來源與查核紀錄（資料內的 `sources`、`checkedAt` 與 `docs/link-checks/`）、素材授權紀錄（`docs/LICENSES.md`）、部署設定（`.github/workflows`、`config/site.json`）與操作說明（`docs/`）。

## 建立備份

方法一（不需任何工具）：GitHub 儲存庫頁面 → **Code → Download ZIP**。

方法二（含完整版本歷史）：

```
git clone --mirror https://github.com/daycool858000-hue/morning-light-magazine.git
git -C morning-light-magazine.git bundle create ../morning-light-$(date +%F).bundle --all
```

`.bundle` 檔是單一檔案，包含所有分支與歷史。

## 還原到新環境

```
git bundle verify morning-light-YYYY-MM-DD.bundle   # 需在任一 git 儲存庫資料夾內執行
git clone -b claude/morning-light-visual-v2 morning-light-YYYY-MM-DD.bundle morning-light-magazine   # 或解壓縮 ZIP
cd morning-light-magazine
npm ci                    # 安裝開發工具（sharp）；只建置網站可略過
npm run build             # 確認可以成功建置
```

開發分支尚未合併 main，還原時請指定分支（`-b`），否則會取得 main 的舊版本。

若要放到新的 GitHub 儲存庫：建立空的儲存庫後 `git remote set-url origin <新網址> && git push --all`，再依 DEPLOYMENT.md 設定 Pages。

## 還原測試紀錄

| 日期 | 備份方式 | 還原環境 | 結果 |
|---|---|---|---|
| 2026-10-14（V3.2） | 方法二：`git clone --mirror` → `git bundle create --all`（約 60 MB）→ `git bundle verify` 通過 → 由 bundle 重新 clone `claude/morning-light-visual-v2`（commit `bc7347c`） | 開發容器內的全新資料夾，Node 22.22.0；`npm ci` 安裝 11 個開發套件 | **成功**。`npm run images` 由 `content/photos/originals/` 重新產生的 85 個圖片檔與儲存庫內容完全相同（git 無差異）；`npm run build` 產出的 127 個檔案與原環境同一 commit 的建置結果逐檔 SHA-256 相同；`npm run build:production` 正式版不含待查核資料與未檢查圖片。限制：這是同一台雲端容器內的另一個資料夾，不是另一台電腦；方法一（Download ZIP）未實測 |
