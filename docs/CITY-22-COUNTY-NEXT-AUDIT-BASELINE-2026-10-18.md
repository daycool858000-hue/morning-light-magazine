# 由己｜城市與福利 22 縣市深度清查：既有資料差異核對（2026-10-18）

- 原始研究索引：`docs/CITY-SIX-COUNTIES-17-SERVICE-ENTRY-INDEX-2026-10-17.json`。
- 最新 62 篇隔離測試佇列：`docs/QA-FULL-LAUNCH-ALL-62-WITH-CITY-SERVICES-2026-10-18.json`。
- **用實際 URL 集合比對：六縣市原始研究 17 筆，其中 15 筆已進隔離測試佇列、2 筆未收錄。** 不是網站壞掉、不是忘了部署全部17筆。

## 未收錄的2筆與處理方向

1. 桃園：`ty-women-north-south-oct-dec-2026`，官網 https://dowcd.tycg.gov.tw/News_Content.aspx?n=16342&s=1890721 。2026 年10–12月的限期公告，原研究資料列 `validThrough:2026-12-31`；不應作永久服務入口，也不能在2027年當成正在招生的活動。
2. 臺南：`tn-women-centers-four-modes`，官網 https://sab.tainan.gov.tw/News_Content.aspx?n=17856&s=8727057 。前期研究列為114年歷史服務模式說明，應留作制度背景，不冒充當期服務時間或現正開放的申請入口。

## 既有正確進度

- 22／22 縣市至少一筆基本官網、主管機關或社福名錄入口；這不是地方服務深度完成。
- 六縣市已有新增具體用途網址：彰化4、新北3、臺北3、桃園2、臺中2、臺南3，共研究17筆；隔離版實放15筆。
- 全五層具體服務資料完整查核及站主核准仍為 **0／22**。
- 下輪優先：16縣市尚未補具體服務的官網與婦女中心、家庭教育、就服、醫衛長照和新住民在地入口。新增資料需要「縣市、服務層級、使用對象、有效日期、來源」五欄；一個名錄網頁只保留一個入口，不依館數重複計數。
- 官方中央交叉索引：衛福部婦女福利 https://www.mohw.gov.tw/cp-88-225-1.html ；教育部家庭教育 https://familyedu.moe.gov.tw/front.aspx/index.aspx ；台灣國家婦女館中心名錄 https://www.taiwanwomencenter.org.tw/zh-tw/Directory/women-center-list 。這些可用來尋找個別機關，不能取代逐縣官網深層核驗。

**發布界線**：本次只比對 GitHub 研究佇列與原始來源並建檔，未變更62篇預覽、正式版、PR、任何服務資料核准或 CI。站主已通過的手機功能測試不需重做。
