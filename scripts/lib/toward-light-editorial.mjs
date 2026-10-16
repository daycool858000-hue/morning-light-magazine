// 《由己｜向光》編輯式閱讀索引；只供 QA 頁面使用。
// 八個索引保持既有兩欄四排，頁面下方的文章格一次展示所有屬於「向光」的閱讀內容。
// 與「讀利」採互斥展示：此清單的文章不會再列在讀利，但原始文章、六大分類及搜尋均不更動。
export const TOWARD_READING_SLUGS = Object.freeze([
  'batch4-art-museum-first-visit',
  'batch4-npm-online-collection',
  'batch3-culture-nearby',
  'batch5-open-courses-moocs',
  'batch3-learn-free',
  'batch4-library-digital-resources',
  'batch6-women-center-services',
  'batch2-12',
  'batch2-03',
  'batch2-04',
  'batch2-11',
  'batch4-business-cashflow',
  'batch4-startup-support',
]);

export const TOWARD_TOPICS = Object.freeze([
  { id: 'women-center', title: '婦女中心課程', intro: '地方中心的課程、培力與生活參與。', slugs: ['batch6-women-center-services', 'batch2-12'] },
  { id: 'job-training', title: '就業培訓', intro: '重返職場、轉職與職業訓練。', slugs: ['batch2-03', 'batch2-04', 'batch2-11'] },
  { id: 'startup', title: '創業講座', intro: '從實際經營到可運用的創業輔導。', slugs: ['batch4-business-cashflow', 'batch4-startup-support'] },
  { id: 'family-education', title: '家庭教育', intro: '家庭教育活動與公共學習入口。', slugs: ['batch2-12'] },
  { id: 'parenting', title: '育兒與親職課程', intro: '先了解地方親職及家庭學習活動的查找方式。', slugs: ['batch2-12'] },
  { id: 'life-skills', title: '生活技能', intro: '數位生活資源與經營管理能力。', slugs: ['batch4-library-digital-resources', 'batch4-business-cashflow'] },
  { id: 'open-learning', title: '免費或公開報名的進修活動', intro: '開放式課程、圖書館與一般公開學習的門檻。', slugs: ['batch5-open-courses-moocs', 'batch4-library-digital-resources', 'batch3-learn-free'] },
  { id: 'local-events', title: '地方政府教育及福利活動', intro: '藝文、講座與地方公開活動可以先從哪裡找。', slugs: ['batch3-culture-nearby', 'batch2-12', 'batch4-art-museum-first-visit'] },
]);

// 官方網站僅作為另外的參考，與文章格分開。
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
  const readingSet = new Set(TOWARD_READING_SLUGS);
  if (readingSet.size !== TOWARD_READING_SLUGS.length) missing.push('向光文章格有重複文章 slug');
  const gallery = TOWARD_READING_SLUGS.map(slug => {
    const a = bySlug.get(slug);
    if (!a) missing.push('向光文章不存在 ' + slug);
    return a;
  }).filter(Boolean);
  const topics = TOWARD_TOPICS.map(t => {
    if (topicIds.has(t.id)) missing.push('重複索引 ' + t.id);
    topicIds.add(t.id);
    const stories = t.slugs.map(slug => {
      const a = bySlug.get(slug);
      if (!a) missing.push(t.id + ' 找不到文章 ' + slug);
      if (!readingSet.has(slug)) missing.push(t.id + ' 混入讀利專屬文章 ' + slug);
      return a;
    }).filter(Boolean);
    if (!stories.length) missing.push(t.id + ' 沒有可讀文章');
    return { ...t, stories };
  });
  const official = TOWARD_OFFICIAL_LINK_IDS.map(id => {
    const item = byId.get(id);
    if (!item) missing.push('官方資源不存在 ' + id);
    return item;
  }).filter(Boolean);
  if (topics.length !== 8) missing.push('原有八個學習與活動索引不完整');
  if (missing.length) throw new Error('向光 QA 編輯索引未能完成：\n- ' + missing.join('\n- '));
  return { topics, gallery, official };
}
