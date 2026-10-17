# QA「待查核」標示盤點（2026-10-17）

> 盤點範圍：目前公開 QA（dist-qa）中帶有查核狀態標示的所有官方資源卡、專線與其他管道，共 59 筆。
> 本檔只整理證據與畫面標示，**沒有修改任何 status、checkedAt、review，也沒有修改 `content/release-approvals.json`**（git blob `5c4d0532d87581383045f5e017fe4ddef4d81df9` 不變）。文章頁原本就不顯示「待查核」徽章（擴充文章顯示「來源查核：日期（AI 編輯查核，尚未經網站擁有人核准）」），本次不變。

## 一、原本為什麼一直顯示「待查核」

- 公開 QA 是「一般預覽＋未核准候選」，沿用預覽的顯示邏輯：`scripts/build.mjs` 的 `statusBadge()` 只看資料的 `status` 欄位，`待確認` 一律顯示「待查核」。
- 所有 content 資源、專線與 QA 候選的 `status` 都是 `待確認`（`checkedAt` 未填）——這個欄位的定義是「人工逐頁查核」（見已撤下的 `content/articles/status-labels.md` 與 `content/pages/verification.md`），而目前**沒有任何一筆完成站主人工逐頁查核**，所以欄位本身是正確的，不應改成「已確認」。
- 但 QA 畫面因此把三種不同狀態都顯示成同一個「待查核」：
  1. 真的還沒完成來源查核；
  2. 已由 AI 核對官方來源、尚未經站主審閱（`review.by` 註明 AI，結果非「讀取受阻」）；
  3. 已依既有程序確認：網站發起人 2026-10-15 在 `release-approvals.json` 整批核准、快照逐欄吻合（正式版就是用這道 `approvedRecord` 閘門公開，並顯示「官方入口已核對（AI 協助）」）。

## 二、本次 QA-only 調整（不改審核權限）

只在 `--mode=qa` 改畫面說明文字；一般預覽與 production HTML 逐位元組不變（僅 main.css 多一個 `.badge-ai` 樣式，正式頁面未使用）。

| 層級 | 判定依據（程式） | QA 畫面 |
|---|---|---|
| ③ 已依既有程序確認 | 與 production 相同的 `approvedRecord()` 快照閘門，且不是 QA 候選 | 「官方入口已核對（AI 協助）」或「專線用途與時間已核對（AI 協助）」＋「站主已整批核准…（2026-10-15）」；資源卡另註「電話、資格與時段等細節仍以官方公告為準」（核准範圍不含這些細節） |
| ② AI 已核對、待站主審閱 | `review.by` 含 AI，且 `review.result` 不含「受阻／保持待確認」 | 「AI 已核對來源」＋「核對：日期｜尚未經站主審閱」 |
| ① 尚未完成來源查核 | 其他（無紀錄，或 AI 嘗試但讀取受阻） | 維持「待查核」＋「尚未完成來源查核」（受阻者註明 AI 曾嘗試日期） |

QA 候選（第二批、第三批、英文／多語）即使有 AI 紀錄，也一律保留「未核准測試內容」徽章。測試：`tests/qa-review-labels.test.mjs`（6 項，已加入 `npm test`）。

## 三、統計

| 層級 | 筆數 | 內容 |
|---|---|---|
| ① 尚未完成來源查核 | 3 | `mohw-sps`、`sfaa`（AI 2026-10-15 嘗試，官方頁讀取受阻）、`video-110`（無查核紀錄） |
| ② AI 已核對、待站主審閱 | 35 | 第二批地方入口 23、第三批免登入資源 9、英文／多語 3 |
| ③ 已依既有程序確認 | 21 | content 資源 16、專線 4（110／119／113／1925）、110 簡訊 1 |

## 四、保留原狀、列入待決（不得擅自處理）

- **35 筆 ② 項目**要變成正式確認，需要站主逐筆審閱或另行整批核准；AI 查核不能替代。
- **③ 的 21 筆**是「整批發布核准＋AI 官方來源核對」，不是人工逐頁查核；所以 `status` 仍維持 `待確認`，QA 只換成與正式版相同的說法。若要把 `status` 改為 `已確認`，屬查核資格規則變更，需站主決定。
- `mohw-sps`、`sfaa` 需在臺灣網路環境重新開啟官方頁；`video-110` 需要先做來源查核。
- 懷孕與生育閱讀區的 PG01、PG02（國健署）在原驗收報告中仍是「待驗」，本次未改。

## 五、逐筆清單與證據

| 層級 | QA 畫面標示（新） | 來源檔 | id | 名稱 | 出現頁面 | 證據 |
|---|---|---|---|---|---|---|
| ① 尚未完成來源查核 | 待查核 | content/resources.json | `mohw-sps` | 青壯世代心理健康支持方案合作機構查詢 | city、health | ChatGPT 獨立來源查核（AI，非使用者人工簽核）；直接讀取受阻，保持待確認；2026-10-15 |
| ① 尚未完成來源查核 | 待查核 | content/resources.json | `sfaa` | 衛生福利部社會及家庭署 | city、life-family | ChatGPT 獨立來源查核（AI，非使用者人工簽核）；直接讀取受阻，保持待確認；2026-10-15 |
| ① 尚未完成來源查核 | 待查核 | content/hotlines.json 管道 | `video-110` | 110 視訊報案 App | support | 無查核紀錄 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-keelung-social-affairs` | 基隆市政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-taipei-social-affairs` | 臺北市政府社會局 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-new-taipei-social-affairs` | 新北市政府社會局 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-taoyuan-social-affairs` | 桃園市政府社會局 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-hsinchu-city-social-affairs` | 新竹市政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-hsinchu-county-social-affairs` | 新竹縣政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-yilan-social-affairs` | 宜蘭縣政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-miaoli-social-affairs` | 苗栗縣政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-taichung-social-affairs` | 臺中市政府社會局 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-changhua-social-affairs` | 彰化縣政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-nantou-social-affairs` | 南投縣政府社會及勞動局社會福利資訊網 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-yunlin-social-affairs` | 雲林縣政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-tainan-social-affairs` | 臺南市政府社會局 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-pingtung-social-affairs` | 屏東縣政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-hualien-social-affairs` | 花蓮縣政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-taitung-social-affairs` | 臺東縣政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-penghu-social-affairs` | 澎湖縣政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-kinmen-social-affairs` | 金門縣政府社會處 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-chiayi-city-welfare-directory` | 嘉義市政府—社福救助與社會處入口 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-kaohsiung-welfare-directory` | 高雄市政府—社會福利服務目錄 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-chiayi-county-service-center-roster` | 衛福部—嘉義縣社會福利服務中心通訊錄 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-chiayi-city-service-center-roster` | 衛福部—嘉義市社會福利服務中心通訊錄 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第二批地方入口 | `batch2-lienchiang-service-center-roster` | 衛福部—連江縣社會福利服務中心通訊錄 | city | ChatGPT（AI）官方資訊候選查核；非網站擁有人親自逐頁核對；候選來源一致性檢查完成；未獲本批發布核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第三批免登入資源 | `open-mind-articles` | 衛福部心快活｜心理健康文章專區 | city、health | ChatGPT（AI）查核公開官方頁面；非網站擁有人人工逐頁確認；官方公開導覽／閱讀功能可從公開頁面辨識；待正式內容核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第三批免登入資源 | `open-mind-courses` | 衛福部心快活｜心理健康學習課程 | city、health | ChatGPT（AI）查核公開官方頁面；非網站擁有人人工逐頁確認；官方公開導覽／閱讀功能可從公開頁面辨識；待正式內容核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第三批免登入資源 | `open-learn-directory` | 教育部終身學習資源平臺｜課程與資源查詢 | city、learning | ChatGPT（AI）查核公開官方頁面；非網站擁有人人工逐頁確認；官方公開導覽／閱讀功能可從公開頁面辨識；待正式內容核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第三批免登入資源 | `open-culture-iculture` | 文化部 iCulture｜藝文活動與文化空間 | city、learning | ChatGPT（AI）查核公開官方頁面；非網站擁有人人工逐頁確認；官方公開導覽／閱讀功能可從公開頁面辨識；待正式內容核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第三批免登入資源 | `open-culture-events` | 文化部藝文活動平台｜展演與導覽 | city、learning | ChatGPT（AI）查核公開官方頁面；非網站擁有人人工逐頁確認；官方公開導覽／閱讀功能可從公開頁面辨識；待正式內容核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第三批免登入資源 | `open-cpc-faq` | 行政院消保會｜生活消費Q&A | city、law | ChatGPT（AI）查核公開官方頁面；非網站擁有人人工逐頁確認；官方公開導覽／閱讀功能可從公開頁面辨識；待正式內容核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第三批免登入資源 | `open-cpc-antifraud` | 行政院消保會｜防詐知識專區 | city、law | ChatGPT（AI）查核公開官方頁面；非網站擁有人人工逐頁確認；官方公開導覽／閱讀功能可從公開頁面辨識；待正式內容核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第三批免登入資源 | `open-fire-home` | 消防署｜住宅防火與居家安全知識 | city、life-family | ChatGPT（AI）查核公開官方頁面；非網站擁有人人工逐頁確認；官方公開導覽／閱讀功能可從公開頁面辨識；待正式內容核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 第三批免登入資源 | `open-police-selfdefense` | 警政署婦幼抱抱｜安全宣導與簡易防身影片 | city、law | ChatGPT（AI）查核公開官方頁面；非網站擁有人人工逐頁確認；官方公開導覽／閱讀功能可從公開頁面辨識；待正式內容核准；2026-10-15 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 英文／多語 | `qa-en-nia` | 內政部移民署｜在臺生活與居留資訊 | city、life-family | ChatGPT（AI）官方來源第一輪查核，非站主人工核准；未核准 QA 候選；2026-10-16 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 英文／多語 | `qa-en-ifi` | 新住民培力發展資訊網｜多語生活資源 | city、learning | ChatGPT（AI）官方來源第一輪查核，非站主人工核准；未核准 QA 候選；2026-10-16 |
| ② AI 已核對、待站主審閱 | AI 已核對來源 | 英文／多語 | `qa-en-1990` | 1990 外來人士在臺生活諮詢服務 | city、life-family | ChatGPT（AI）官方來源第一輪查核，非站主人工核准；未核准 QA 候選；2026-10-16 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `npa` | 內政部警政署 | city、law、support | release-approvals.json resources.npa（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `npa-110-sms` | 警政署 110 簡訊報案資訊 | city | release-approvals.json resources.npa-110-sms（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `mohw-113` | 衛生福利部 113 保護專線 | city、life-family、support | release-approvals.json resources.mohw-113（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `mohw` | 衛生福利部 | city、health、life-family | release-approvals.json resources.mohw（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `siarc` | 性影像處理中心 | city、law、support | release-approvals.json resources.siarc（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `laf` | 財團法人法律扶助基金會 | city、law、support | release-approvals.json resources.laf（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `mol` | 勞動部 | career、city、law | release-approvals.json resources.mol（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `taiwanjobs` | 台灣就業通 | career、city、learning | release-approvals.json resources.taiwanjobs（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `mohw-domhaoh` | 衛生福利部心理健康司 | city、health、support | release-approvals.json resources.mohw-domhaoh（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `1980` | 張老師基金會 | city、health、support | release-approvals.json resources.1980（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `38-org` | 現代婦女基金會 | city、law、life-family | release-approvals.json resources.38-org（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `goh` | 勵馨基金會 | city、life-family | release-approvals.json resources.goh（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `awakening` | 婦女新知基金會 | city、law | release-approvals.json resources.awakening（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `moea` | 經濟部 | career、city | release-approvals.json resources.moea（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `gov-tw` | 我的E政府 | city、life-family | release-approvals.json resources.gov-tw（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/resources.json | `edu` | 教育部 | city、learning | release-approvals.json resources.edu（快照吻合）；ChatGPT 獨立來源查核（AI，非使用者人工簽核），2026-10-15 |
| ③ 已依既有程序確認 | 專線用途與時間已核對（AI 協助） | content/hotlines.json 專線 | `110` | 110 警察緊急報案 | support | release-approvals.json hotlines.110（快照吻合）；ChatGPT／Claude（AI 官方來源核對，非人工逐頁簽核），2026-10-15 |
| ③ 已依既有程序確認 | 專線用途與時間已核對（AI 協助） | content/hotlines.json 專線 | `119` | 119 消防與緊急救護 | support | release-approvals.json hotlines.119（快照吻合）；ChatGPT／Claude（AI 官方來源核對，非人工逐頁簽核），2026-10-15 |
| ③ 已依既有程序確認 | 專線用途與時間已核對（AI 協助） | content/hotlines.json 專線 | `113` | 113 保護專線 | support | release-approvals.json hotlines.113（快照吻合）；ChatGPT／Claude（AI 官方來源核對，非人工逐頁簽核），2026-10-15 |
| ③ 已依既有程序確認 | 專線用途與時間已核對（AI 協助） | content/hotlines.json 專線 | `1925` | 1925 安心專線 | support | release-approvals.json hotlines.1925（快照吻合）；ChatGPT／Claude（AI 官方來源核對，非人工逐頁簽核），2026-10-15 |
| ③ 已依既有程序確認 | 官方入口已核對（AI 協助） | content/hotlines.json 管道 | `sms-110` | 110 簡訊報案（聽語障人士及一般民眾） | support | release-approvals.json channels.sms-110（快照吻合）；ChatGPT／Claude（AI 官方來源核對，非人工逐頁簽核），2026-10-15 |
