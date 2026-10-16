# 《由己 SELF-AUTHORED》｜Claude 額度恢復期間暫存交接事項

日期：2026-10-16（臺灣時間）｜整理：ChatGPT  
**狀態：等待 Claude 下次主動回覆工作報告。此檔是待比對交接清單，不是現在要求他啟動工作的指令。**

## 1. 下次 Claude 提交報告後，先核對事實再發下一段指令

1. 先看 GitHub `claude/morning-light-visual-v2` 的**最新 HEAD**、工作分支、GitHub Actions CI、公開 QA 部署記錄與 Issue #3 相關狀態。
2. 看 Claude 是否已完成 **Issue #3｜城市與福利六篇**：原稿 `docs/BATCH6-CITY-WELFARE-BENEFIT-FIRST-GUIDES-2026-10-16.md` 六篇是否全部載入 QA，是否在「城市與福利」加入「先了解有哪些福利」實質文章，手機尺寸／搜尋／noindex／未核准等是否通過，官方外連有哪些待核對。
3. 任何「已完成」依實際提交及部署判斷；**不要直接假設 Claude 已把內容發布**。
4. 城市與福利 22 縣市官方機構入口站主已親自核對，原有搜尋及 V3.3 也已驗收；不要重測或重做既有功能，除非出現明確回歸。
5. 若 #3 未完成：先讓 Claude 持續 #3 修復；不要同時分派向光 PR 的共用 build.mjs 修改。若 #3 已完成且測試通過，才接 #6。

## 2. 待接續工程：Issue #6 與 Draft Pull Request #5

- [Issue #6](https://github.com/daycool858000-hue/morning-light-magazine/issues/6)：「向光」原八索引改成**直接導向實質文章**，精簡官方與城市入口。
- [PR #5](https://github.com/daycool858000-hue/morning-light-magazine/pull/5)，功能分支：`feature/toward-open-skies-editorial-v1`。截至 2026-10-16，該 PR 的程式已完成第一版且獨立 CI 通過，但**仍為 draft，未合併開發分支，未公開部署**。
- 編輯規格：[向光整合歸檔](../blob/feature/toward-open-skies-editorial-v1/docs/TOWARD-OPEN-SKIES-EDITORIAL-QA-IMPLEMENTATION-2026-10-16.md)。
- 編輯原則必須同時保留站主前兩次確認：**六大主題是需求開口；讀利與向光是文章閱讀的兩大目錄**。讀利偏完整知識與生活制度；向光偏學習、藝文、文化、公益、女性經營、技能與探索。文章只有一個 slug，不做兩份資料。
- 原八索引保留：婦女中心課程、就業培訓、創業講座、家庭教育、育兒與親職課程、生活技能、免費或公開報名的進修活動、地方政府教育及福利活動。每個索引都有站內可讀文章，不能只有機構或其他分類連結。
- 向光的 22 縣市冗長按鈕撤下，保留一個小型「城市與福利」連結；底部大型重複資源卡改成精簡正式入口；不要更改原已驗收的「城市與福利」頁。
- 技術：現有 `scripts/lib/toward-light-editorial.mjs` + `scripts/build.mjs` + `src/assets/css/main.css` + `tests/qa-batch2.test.mjs`。主站正式版和一般預覽 HTML 仍照舊，PR #5 的向光修改**只在 QA 模式**啟用。
- Claude 若改動與 PR #5 相同的 `scripts/build.mjs` 或測試檔，須在 #3 完成後用最新 HEAD 對照差異、手動解衝突並重跑 Chromium／QA／WebKit、320/375/390px、正式發布隔離。**不可直接硬覆寫一邊成果**。

## 3. 新的成人文章候選：目前僅存 docs，不在任何公開 QA

- [第七批修訂｜女性創業與食物銀行公益 2 篇](../blob/feature/toward-open-skies-editorial-v1/docs/BATCH7-ADULT-STORIES-PUBLIC-GOOD-WOMEN-ENTREPRENEURSHIP-2026-10-16.md)。
- [第八批｜音樂表演藝術與衣物材料 2 篇](../blob/feature/toward-open-skies-editorial-v1/docs/BATCH8-MUSIC-LIFE-MATERIALS-ADULT-GUIDES-2026-10-16.md)。
- [第九批｜婦女中心、家庭教育、青少年親職、地方活動、AI 資訊查證、日常創作共 6 篇](../blob/feature/toward-open-skies-editorial-v1/docs/BATCH9-TOWARD-ADULT-READING-WOMEN-FAMILY-DIGITAL-CREATION-2026-10-16.md)。
- [第九批官方來源查核／對應索引](../blob/feature/toward-open-skies-editorial-v1/docs/BATCH9-SOURCE-AUDIT-AND-ARTICLE-MAPPING-2026-10-16.md)。

**十篇成人文章為新增候選，不代表已核准進公開 QA。** 必須先經站主閱讀與範圍同意，再逐批加到 QA，不得讓 Claude 將 docs 自動全數匯入。

已撤出的舊題材：月相、植物辨識兩篇（偏兒童口吻），線上科博館保留為研究資源不作本輪文章。文章對象高中以上至約 70 歲，避免強烈政治、過度悲傷、無事實根據的「勵志奇蹟」、空泛說教。

## 4. 後續向光文章導入分期建議（僅供下一次報告後規劃）

**先完成工程 #3 / #6：** 能讀到現有文章、索引沒有空洞、分類和搜尋正常、QA 與正式隔離。這時不要急著把十篇候選當作完成發佈。

**內容補強先做：** 第九批 01 婦女中心課程（與 #3 婦女中心服務導讀交叉，不重複）；02 成年人的家庭教育；03 不同階段親職課程；04 地方活動參與方式。

**再做探索閱讀：** 第九批 05 AI 查證、06 日常創作；第七批女性經營和公益；第八批藝術、材料。

**官方引用政策：** 外部網站可免登入閱讀，不代表外部課程免費或免報名；官方資料有歷史範例必標年度，不杜撰現行名額。非本站照片、舞台影音、他人作品不可無授權重製。

## 5. 不准擅自做的事情

- 不合併 `main`、不動正式 `content/release-approvals.json` 或正式發布程序。
- 不把 QA 測試成功冒稱站主已核准全文事實；AI 查核不能冒充人工逐頁驗收。
- 不重新打造 V3.3、已驗收搜尋、縣市篩選，不新增主分類、會員、收件表單、付費或定位。
- 不指派 Claude 重做 ChatGPT 已寫好的十篇草稿及向光 QA 程式。
- 不在 Claude 下一份工作報告之前，自動把 Issue #6 視為已完成或已開始。

**下一次 Claude 回報後，由 ChatGPT 根據實際新提交與 QA 結果重新整理一份最短執行指令交給 Claude。**
