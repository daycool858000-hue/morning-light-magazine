// 《由己｜向光》編輯式閱讀索引；只供 QA 頁面使用。
// 六大分類維持正式資料的原樣；同一篇文章只以既有 slug 連結，不複製文章。
// 每個索引至少要有實際可讀文章；新增文章應編輯本清單，不自動把所有 QA 檔案塞進向光。
// 2026-10-16 站主回饋：只放內容真正相關的文章，寧可暫時一篇，也不放名稱不符的文章湊數
// （育兒津貼 batch2-02 移出「育兒與親職課程」、心理閱讀 batch3-mind-reading 移出「家庭教育」；兩篇正文與讀利、分類頁不變）。
export const TOWARD_TOPICS = Object.freeze([
  { id: 'women-center', title: '婦女中心課程', intro: '地方中心的課程、培力、生活參與與相關服務。', slugs: ['batch6-women-center-services', 'batch2-12', 'batch2-10'] },
  { id: 'job-training', title: '就業培訓', intro: '轉職、重新就業、職訓與不同學習條件。', slugs: ['batch2-04', 'batch2-11'] },
  { id: 'startup', title: '創業講座', intro: '從實際經營、現金流到可運用的創業輔導。', slugs: ['batch4-business-cashflow', 'batch4-startup-support'] },
  { id: 'family-education', title: '家庭教育', intro: '家庭關係、成員溝通和可以運用的公共學習。', slugs: ['batch2-12'] },
  { id: 'parenting', title: '育兒與親職課程', intro: '育兒、親職學習、家庭活動與資源條件。', slugs: ['batch2-12'] },
  { id: 'life-skills', title: '生活技能', intro: '財務、保險、數位消費與自己的生活能力。', slugs: ['batch4-savings-emergency-fund', 'batch4-insurance-basics', 'batch3-consumer-knowledge'] },
  { id: 'open-learning', title: '免費或公開報名的進修活動', intro: '大學開放課、圖書館與一般公開學習的門檻。', slugs: ['batch5-open-courses-moocs', 'batch4-library-digital-resources', 'batch3-learn-free'] },
  { id: 'local-events', title: '地方政府教育及福利活動', intro: '藝文、講座與地方公開活動可以先從哪裡找。', slugs: ['batch3-culture-nearby', 'batch2-12'] },
]);

// 八索引下方的延伸閱讀：只放未出現在八索引中的文章，避免同一篇在向光重複出現
export const TOWARD_FEATURED = Object.freeze([
  'batch4-art-museum-first-visit',
  'batch4-npm-online-collection',
]);

// 僅用現有正式來源，避免向光重複顯示完整、佔據大量篇幅的官方機構卡。
export const TOWARD_OFFICIAL_LINK_IDS = Object.freeze([
  'open-culture-iculture',
  'open-learn-directory',
  'open-culture-events',
]);

export function resolveTowardEditorial(articles, resources) {
  const bySlug = new Map(articles.map(a => [a.slug, a]));
  const byId = new Map(resources.map(r => [r.id, r]));
  const missing = [];
  const topicIds = new Set();
  const topics = TOWARD_TOPICS.map(t => {
    if (topicIds.has(t.id)) missing.push('重複索引 ' + t.id);
    topicIds.add(t.id);
    const stories = t.slugs.map(slug => {
      const a = bySlug.get(slug);
      if (!a) missing.push(t.id + ' 找不到文章 ' + slug);
      return a;
    }).filter(Boolean);
    if (!stories.length) missing.push(t.id + ' 沒有可讀文章');
    return { ...t, stories };
  });
  const featured = TOWARD_FEATURED.map(slug => {
    const a = bySlug.get(slug);
    if (!a) missing.push('精選文章不存在 ' + slug);
    return a;
  }).filter(Boolean);
  const official = TOWARD_OFFICIAL_LINK_IDS.map(id => {
    const item = byId.get(id);
    if (!item) missing.push('官方資源不存在 ' + id);
    return item;
  }).filter(Boolean);
  if (topics.length !== 8) missing.push('原有八個學習與活動索引不完整');
  const indexed = new Set(TOWARD_TOPICS.flatMap((t) => t.slugs));
  for (const slug of TOWARD_FEATURED) if (indexed.has(slug)) missing.push('延伸閱讀與八索引重複 ' + slug);
  if (missing.length) throw new Error('向光 QA 編輯索引未能完成：\n- ' + missing.join('\n- '));
  return { topics, featured, official };
}
