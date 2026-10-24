先讀 CLAUDE.md

# 《由己》六大主題新增文章｜PR #11 的 V2 原稿與 Claude QA 佇列接軌修正（2026-10-17）

## 結論與權限
Claude 工程分支 `claude/qa-expansion-import-20261016`（head `2515aeadc192e1b5267303a02f77af89b6e7661d`）完成工程準備，CI run `38967525534` success，可保留所有已測試的匯入器、三模式隔離與基礎版面。這次**只做 V2 原稿一致性修正、真實解析器回歸測試與必要的編輯註記排除**；**不開啟真實佇列、不部署 GitHub Pages、不合併 main、不改正式核准**。

## 一、已實際抓檔核對的兩個阻塞問題

1. 現有工程分支的 `docs/QA-EXPANSION-IMPORT-QUEUE.json` **12/12 篇 exp-01～12 全部仍指到 2026-10-16 V1 原稿**：`docs/EXPANSION-BATCH10-TWELVE-NEW-ARTICLES-DRAFT-2026-10-16.md`。PR #11 另已完成 V2 兩檔，每篇都改善內容，**其中 7 篇標題已改**（exp-01、05、06、07、08、11、12）。舊佇列的「12 篇標題吻合」僅證明 V1 舊稿，不能當作當前待刊 V2 驗收。
2. Claude `scripts/lib/qa-expansion.mjs` 的 `SOURCE_HEADER` 使用「只要任意二至三級小標含『來源』或『入口』就當參考文獻起點」的寬鬆規則。**實際以 V2 第 11 篇逐段模擬，`## 用公開官方入口延伸探索` 被錯認為文末參考文獻小標**，後面的三個正文段落被當作來源後的不合法資料，造成 `sources=0` 與解析失敗。應改成只有特定「官方來源」「正式來源」「官方參考入口」「官方教育來源」「官方來源與延伸閱讀」等真正的文末來源小標才匹配，不能用整句是否含「入口／來源」當判斷。加測此標題不得提前截斷，並保持舊十篇與原測試通過。

## 二、最新權威內容版本（主檔分別在 PR #11 的編輯分支）

- `docs/EXPANSION-BATCH10-SIX-REVISED-ARTICLES-V2-2026-10-17.md`：exp-02、03、04、09、10、11。**檔尾 `stopAt`：`**QA 編輯狀態：`**（不要將此內部狀態當成文章正文）。
- `docs/EXPANSION-BATCH10-REMAINING-SIX-ARTICLES-V2-2026-10-17.md`：exp-01、05、06、07、08、12。**檔尾 `stopAt`：`## 本批編輯校核門檻`**（不能把內部審稿清單上網）。
- `docs/CONTENT-EXPANSION-22-ARTICLE-MANIFEST-2026-10-16.json`：2026-10-17 已校正全部 12 篇 `title` 為 **V2 實際標題**，改過的 7 篇保留 `originalDraftTitle` 供 V1 溯源；每篇都有 `latestReviewedFile` 和 `latestReviewedHeading`。
- 原 `docs/EXPANSION-BATCH10-TWELVE-NEW-ARTICLES-DRAFT-2026-10-16.md` 仍保留為 V1 歷史檔，**不可默認為可上 QA 的最新來源**。
- 新兩檔 V2 已移除 01、05、07、12 篇給編輯看的「與舊文的分工」段落，對照內容留在 `docs/EXPANSION-BATCH10-12-ARTICLE-SOURCE-AND-OVERLAP-AUDIT-2026-10-17.md`，**不要用解析器臨時刪掉其他有用內文**。

## 三、實作建議順序

1. 在獨立整合／工程分支使用 PR #11 **最新**兩個 V2 檔與 manifest，不要改 V1；對照 manifest 的 `id / title / latestReviewedFile / latestReviewedHeading / category`，更新全部 12 筆佇列 `sourceFile`、`title`，保留既有暫定 `slug`、`directory: none` 及 `importToQa:false`，不自行改變發布核准狀態。
2. `sourceFiles` 改為兩個 V2 檔，各設上方正確 `stopAt`。舊十篇 A1～A3 仍採第三輪，A4／B1～B6 仍採第二輪，不要因 V2 修正破壞原有的格式支援。
3. 修正來源標題解析器：一般小標如「用公開官方入口延伸探索」「官方入口怎麼選？」應保留於文章正文；只有文末真正標示為「官方來源與延伸閱讀」等來源清單的小標才切入 `sourcesList`。請加負向測試（一般內文）及正向測試（官方來源清單），不得默默刪除段落。
4. 用**真實 V2 全 12 篇**試跑文字解析與分段：每篇來源至少一筆、正文字數合理、與 manifest 的標題一字不差、頁面未夾帶「QA 編輯狀態」或「本批編輯校核門檻」等內部內容。測試時可在僅限 `tests/fixtures` 或暫存 worktree 的佇列暫時設 `importToQa:true` 以測完整 QA 頁，但主工程佇列全部保持 false、pending。
5. 視情況建立**草稿 PR（不合併）**或先回報結果；PR #10／#11 的 `CLAUDE.md` 文本衝突不應靠覆蓋整份檔案解決，臨時合併可保留雙方最新不衝突狀態（並更新過時的入口去重敘述）。三方整合驗證在**乾淨暫存環境依序跑**，不能讓同時測試搶用同一通訊埠。
6. 所有既有測試與新增測試仍需通過（Node 22，含 WebKit 320／375／390／1280），且 QA 關閉時與原網站的 HTML／搜尋索引保持一致。彙報包含所用**最新** V2 檔 SHA、12 篇中標題更改的 7 篇、來源解析負向測試、最後 CI run、仍待內容人工審查與上 QA 的文章清單。

## 四、不要越過內容核准／新的待辦資訊

- 前一輪 ChatGPT 編輯記錄 `docs/EXPANSION-BATCH10-12-ARTICLE-SOURCE-AND-OVERLAP-AUDIT-2026-10-17.md` 是 AI 第一輪**來源用途與核心法條核對**，**不代表 12 篇每一句都完成可上網來源查核**；不要為求建置成功在真實佇列填 `source-checked`。
- 13 項 NI-01～NI-13 已在 PR #11 研究 JSON 更新官方來源初核資訊，但還未完成所有外語 PDF 子頁、實機 Safari。保持 13 筆全部不開啟。
- 第九批 A4、B6 在 PR #11 已確認第二輪 V2 處理過舊問題，不需要重做；但待站主逐篇審稿及 QA 驗收，仍不可直接開。
- 22 縣市目前已有彰化 4、新北 3 筆具體服務研究，尚未導入隊列，其餘縣市繼續編輯查核，不因本次解析器修正而新增七筆前台。

這次的驗收終點是**V2 全部可正確解析＋工程隔離與 CI 維持通過＋真實佇列開關依舊全部關閉**，不是把網站公開發布。

如果需要其他檔案才能完成，可以自己去讀，但不要整個專案都讀