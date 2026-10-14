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
git clone morning-light-YYYY-MM-DD.bundle morning-light-magazine   # 或解壓縮 ZIP
cd morning-light-magazine
npm run build             # 確認可以成功建置
```

若要放到新的 GitHub 儲存庫：建立空的儲存庫後 `git remote set-url origin <新網址> && git push --all`，再依 DEPLOYMENT.md 設定 Pages。

## 還原測試紀錄

| 日期 | 備份方式 | 還原環境 | 結果 |
|---|---|---|---|
| — | — | — | 尚未執行（排定於第四階段驗收） |
