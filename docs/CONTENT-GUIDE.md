# 內容更新操作教學

所有內容都在 `content/` 資料夾。可以直接在 GitHub 網頁上編輯檔案（點檔案 → 鉛筆圖示 → 修改 → Commit），不需要後台，也不需要安裝任何軟體。每次推送後，GitHub Actions 會自動檢查格式；格式有誤時會顯示紅色 ✘ 與錯誤原因。

> 修改後**不會自動公開**。正式網站只有在維護者手動執行部署時才會更新（見 [DEPLOYMENT.md](DEPLOYMENT.md)）。

## 查核狀態（所有資料共用）

| 狀態 | 意思 | 正式版是否顯示 |
|---|---|---|
| `已確認` | 已人工比對原始官方頁面，且填寫 `checkedAt` | 顯示 |
| `待確認` | 已有來源入口，尚未完成人工查核 | 不顯示（僅預覽版顯示） |
| `需要修正` | 發現可能有誤，正在修正 | 不顯示（僅預覽版顯示） |
| `已撤下` | 不再公開 | 都不顯示 |

`checkedAt` 必須是**實際打開官方網頁核對的日期**（YYYY-MM-DD），不可填建檔日期。尚未查核請保持 `null`。

## 新增或修改機構資源（content/resources.json）

在 `items` 陣列中新增一筆：

```json
{
  "id": "taichung-women-center",
  "name": "（正式機構名稱）",
  "categories": ["city", "life-family"],
  "topics": ["women-centers"],
  "regions": ["taichung"],
  "serviceTypes": ["婦女福利"],
  "audience": "適用對象或條件",
  "summary": "自己撰寫的簡短介紹（不要複製對方全文）",
  "url": "https://（官方網址）",
  "phones": [{ "label": "服務電話", "number": "0400000000", "hours": "週一至週五 9:00–17:00" }],
  "sources": [{ "title": "來源頁面名稱", "url": "https://（來源網址）" }],
  "checkedAt": "2026-10-20",
  "status": "已確認",
  "published": true
}
```

- `categories`：`life-family`、`career`、`health`、`law`、`city`、`learning`（可多選；同一筆資料會自動出現在多個主題，不要重複建立）。
- `topics`：見 `content/categories.json` 各主題的 `id`。
- `regions`：`national`（全國）或縣市 id（見 `content/counties.json`）。
- `serviceTypes`：只能使用檔案開頭 `serviceTypes` 清單中的名稱。
- 電話只放**已確認的公開電話**，`number` 只能有數字與 `-`。
- **隱藏已失效資源**：把 `status` 改為 `已撤下`，或 `published` 改為 `false`。
- **更新網址／電話／查核日期**：直接修改對應欄位，並更新 `checkedAt`。

## 求助專線（content/hotlines.json）

- 修改 `hours`（服務時間）前必須以官方來源核對。
- **不可**加入 `sms:110`；簡訊報案須使用警政署公布的各縣市專用號碼。

## 文章（content/articles/*.md）

新增一個 `.md` 檔，開頭格式如下：

```
---
title: 文章標題
slug: english-file-name
category: life-family
summary: 一兩句摘要
published: 2026-11
updated: 2026-11-05
status: 已確認
visibility: public
featured: false
source: 來源名稱 | https://來源網址
source: 第二個來源 | https://…
---

正文使用 Markdown：## 小標題、- 清單、**粗體**、[連結文字](https://…)。
```

- 文章網址會是 `articles/<slug>.html`。
- **撤下文章**：`visibility: withdrawn`（檔案保留以便日後查詢紀錄）。
- `featured: true` 的文章會出現在首頁「實用文章精選」（最多 3 篇）。
- 站內連結直接寫檔名，例如 `[城市與福利](city.html)`。

## 活動（content/events.json）

```json
{
  "id": "2026-11-taichung-course",
  "title": "活動名稱",
  "organizer": "主辦機構",
  "region": "taichung",
  "startDate": "2026-11-10",
  "endDate": "2026-11-10",
  "eligibility": "報名條件",
  "fee": "免費",
  "url": "https://（官方活動頁面）",
  "checkedAt": "2026-10-20",
  "status": "已確認"
}
```

活動結束後會自動從「近期活動」隱藏（不代表取消）。過期活動可以定期刪除。經常變動的課程，建議改在 `resources.json` 收錄官方活動列表入口。

## 公告網站停止更新

編輯 `config/site.json` 的 `maintenanceNotice`，例如：

```json
"maintenanceNotice": "本站自 2027 年 6 月起停止更新，資訊可能已過時，請以各機構官方公告為準。"
```

每一頁頂端都會顯示這段公告。清空字串即可移除。

## 本機預覽（選用）

```
npm run preview
```

然後用瀏覽器開啟 `http://127.0.0.1:4173/index.html`。
