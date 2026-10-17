// 由己六大分類、54個主題的 QA 編輯版官方入口指南。
// 僅 QA 測試分支可載入：不改 content/resources.json 或 release-approvals.json。
// 新的 public QA 部署必須另獲站主允許，程式建置／CI成功不構成內容正式核准。
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const QA_TOPIC_GUIDES_FILE = 'docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json';

export async function loadQaTopicGuides(root, categories) {
  const data = JSON.parse(await readFile(path.join(root, QA_TOPIC_GUIDES_FILE), 'utf8'));
  const problems = [];
  if (data.status !== 'qa-candidate-not-approved' || data.ownerApproved !== false ||
      data.productionApproved !== false || data.importToPublicQa !== false)
    problems.push('54個入口只能是尚未授權部署的 QA 候選資料');
  const expected = categories.flatMap(c => c.topics.map(t => t.id));
  const actual = data.topics?.map(t => t.id) ?? [];
  if (expected.length !== 54 || data.count !== 54 || actual.length !== 54)
    problems.push('六大分類54個主題數量不正確');
  if (new Set(actual).size !== actual.length ||
      expected.some(id => !actual.includes(id)) || actual.some(id => !expected.includes(id)))
    problems.push('54個topic id 必須與 content/categories.json 完全一致、不多也不少');
  for (const item of data.topics || []) {
    if (!item.intro || !item.caution || item.ownerApproved !== false ||
        item.publishMode !== 'qa-candidate-only' || !item.reviewedAt ||
        !Array.isArray(item.links) || item.links.length === 0 || item.links.length > 3)
      problems.push(item.id + ' 缺少讀者用途、編輯狀態或原始連結');
    const urls = new Set();
    for (const link of item.links || []) {
      if (!link.name || !link.agency || !link.purpose ||
          !/^https:\/\/[^\s]+$/.test(link.url) ||
          link.evidenceType?.indexOf('AI') === -1)
        problems.push(item.id + ' 原始連結缺機構、用途或URL／AI查核說明');
      if (urls.has(link.url)) problems.push(item.id + ' 內部重複同一URL');
      urls.add(link.url);
    }
  }
  if (problems.length) throw new Error('54主題入口驗證失敗：\n- ' + problems.join('\n- '));
  return { byId: Object.fromEntries(data.topics.map(x => [x.id, x])), status: data.status, count: actual.length };
}
