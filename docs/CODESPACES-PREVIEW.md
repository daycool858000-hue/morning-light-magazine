# 用 iPhone 開啟第二批測試預覽（GitHub Codespaces 私人網址）

這是《由己》第二批**未核准測試內容**（23 筆地方官方入口、12 篇導讀）的線上預覽。網址只有**登入你自己 GitHub 帳號**的人能開啟（私人連接埠），不是公開網站，也不是 GitHub Pages。每一頁頂端都會顯示「未核准測試內容」。

## 第一次（約 3 分鐘）

1. 在 iPhone 的 Safari 打開這個連結（如要求登入，請登入你的 GitHub）：
   **https://codespaces.new/daycool858000-hue/morning-light-magazine/tree/claude/morning-light-visual-v2?quickstart=1**
2. 確認畫面上的分支是 `claude/morning-light-visual-v2`、機型是 **2-core**，按綠色按鈕 **Create codespace**（如果出現 **Resume this codespace**，按它）。
3. 等 1～3 分鐘，畫面會變成一個程式編輯器，並自動打開這份說明。
4. 找到「連接埠 4173 上的應用程式可供使用」提示，按 **在瀏覽器中開啟（Open in Browser）**。
   - 沒看到提示時：點畫面下方的 **連接埠（PORTS）** 分頁，在「由己 第二批測試預覽」那一列按 **地球圖示**。
5. 新分頁開啟後，若要求登入 GitHub 就再登入一次。看到頂端寫著「**未核准測試內容**」就是成功。
6. 建議在 Safari 按「分享」→「加入書籤」（或「加入主畫面」），下次直接點。

網址格式是 `https://（Codespace 名稱）-4173.app.github.dev/index.html`；Codespace 裡的 `qa-preview-url.txt` 檔案也會寫著完整網址。

## 之後每次

- 先點剛才存的書籤。
- 如果顯示無法連線：Codespace 閒置 30 分鐘後會自動停止。請打開 **https://github.com/codespaces**，點清單中的這個 Codespace 讓它重新啟動（約 1 分鐘，預覽會自動再開），再點書籤。

## 看完以後

不用特別做什麼，閒置 30 分鐘會自動停止。想立刻停止：到 https://github.com/codespaces ，在該 Codespace 右側選單選 **Stop codespace**。

## 費用

- Codespaces 使用的是**你自己 GitHub 帳號的每月免費額度**（依 GitHub 公告，個人帳號每月含一定的免費使用時數與儲存空間；2-core 機型每用 1 小時消耗 2 核心小時）。偶爾開來看幾次不會用完。
- 帳號**沒有綁定付款方式、或使用上限維持 0 元**時，用完免費額度只會無法再啟動，**不會被扣款**。
- 請以 https://github.com/settings/billing 顯示的實際額度為準；長期不用時，可在 https://github.com/codespaces 刪除這個 Codespace，釋放儲存空間。

## 注意

- 私人網址只有建立 Codespace 的帳號能開啟；轉傳網址給別人，對方也打不開（除非你改成公開，**請不要改**）。
- 儲存庫本身是公開的，候選資料檔原本就在 `docs/` 中；這個預覽只是把它們組成可瀏覽的畫面，不會增加公開範圍。
- 這是測試畫面，「前往官方網站」等外部連結會直接開啟各機關網站。
- Claude 無法用你的帳號建立或開啟 Codespace，所以這個流程中「在 iPhone 上的實際畫面」尚未由 Claude 實測；若第 3、4 步在手機上找不到按鈕，請截圖回報。
