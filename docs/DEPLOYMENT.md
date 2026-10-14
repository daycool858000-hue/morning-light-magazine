# GitHub Pages 部署、暫停與關站

> 第一階段尚未部署。以下步驟需**使用者驗收確認後**才執行。

## 一次性設定（由儲存庫擁有者在 GitHub 網頁操作）

1. 確認 GitHub 帳號已啟用雙重驗證（Settings → Password and authentication）。
2. 儲存庫 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。
3. （建議）Settings → Actions → General → Workflow permissions 選 **Read repository contents**。
4. 將第一階段分支合併到 `main`。

## 正式部署

1. 進入儲存庫 **Actions → 部署到 GitHub Pages（手動）→ Run workflow**。
2. 在輸入框填入 `確認公開`，按下 Run。
3. 完成後網址為：`https://daycool858000-hue.github.io/morning-light-magazine/`

正式版（production 模式）只顯示符合 AI 來源查核證據、網站發起人發布核准及核准版本比對的機構入口、專線與圖片；文章、活動仍依原有查核及公開規則。正式版不會出現「預覽版本」提示，也不需要登入 GitHub 或 Claude 即可瀏覽。

### 部署後檢查清單

- [ ] 未登入 Claude、未登入 GitHub 的無痕視窗可開啟
- [ ] iPhone Safari、Android Chrome、桌面瀏覽器正常
- [ ] 文章網址可直接開啟、重新整理不會 404
- [ ] 網址為 HTTPS（Settings → Pages 勾選 Enforce HTTPS）

## 自訂網域（未來選用）

需另外評估網域費用、WHOIS 隱私與 DNS 設定。改用自訂網域時，請同步修改 `config/site.json` 的 `basePath`（改為 `/`）與 `productionUrl`。

## 暫停公開或關站

| 需求 | 做法 |
|---|---|
| 標示停止更新 | 修改 `config/site.json` 的 `maintenanceNotice`，重新部署 |
| 撤下單一錯誤資訊 | 該筆資料 `status` 改為 `已撤下`，重新部署 |
| 暫停高風險頁面 | 把相關資料改為 `已撤下`；必要時從 `config/site.json` 導覽移除 |
| 暫停整個網站 | Settings → Pages → **Unpublish site**（可再次部署恢復） |
| 完全關站 | Unpublish 後，可將儲存庫設為 Archive；先完成備份（見 BACKUP.md） |

收到具體的權利或法律爭議通知時，請保留通知內容、處理日期與修改紀錄（可存於私人備份，不要放進公開儲存庫）。刪除網站不代表既有責任消失。

## 2026-10-15 新增：來源與發布分離

資料核准詳見 `docs/RELEASE-APPROVAL-2026-10-15.md`。建置器的 production 模式現在對機構／專線／圖片使用 `content/release-approvals.json` 與內容版本指紋核對，並不把 AI 來源核查冒稱人工完成；文章、活動沿用原狀。請勿因資料核准已完成而直接部署；**部署仍需另獲發起人最後明確同意，手動輸入「確認公開」之原流程保持不變**。任何修改資料或圖片後先更新來源證據、重新取得該版本核准，測試通過才可公開。
