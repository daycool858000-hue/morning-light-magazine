// 《由己》正式發布文章與新功能的原始版本指紋。
// 簽核只能紀錄站主明確決定，不能因 QA 或 CI 通過就自行寫入。
// 所有查核來源欄位保留，AI 協助查核 ≠ 站主逐頁人工查核。
import { createHash } from 'node:crypto';

// 2026-10-18 站主手機功能驗收通過的 62 篇獨立預覽（review/youji-full-launch-integration-20261018 @ 4ca3fd5）即首發範圍基準。
// 正式版只讀這一份佇列；佇列本身維持 not-approved，逐篇／逐功能是否可公開只看 content/launch-approvals.json 的精確指紋。
export const LAUNCH_EXPANSION_QUEUE = 'docs/QA-FULL-LAUNCH-ALL-62-WITH-CITY-SERVICES-2026-10-18.json';
// 隔離測試才可改用 docs/.launch-fixture-*.generated.json；正式部署一律回到上方真實佇列。
export function launchQueueFile(env = process.env) {
  if (env.LAUNCH_TEST_ONLY === '1' && env.LAUNCH_EXPANSION_QUEUE) {
    if (!/^docs\/\.launch-fixture-[a-z0-9-]+\.generated\.json$/.test(env.LAUNCH_EXPANSION_QUEUE))
      throw new Error('測試佇列只能是 docs/.launch-fixture-*.generated.json');
    return env.LAUNCH_EXPANSION_QUEUE;
  }
  return LAUNCH_EXPANSION_QUEUE;
}
// 62 篇預覽實際呈現數量；任何一項不同都代表資料已異動，須重新確認，不得自動放行。
export const LAUNCH_SCOPE = Object.freeze({
  articles: 62, baseArticles: 36, expansionArticles: 26, readli: 38, toward: 24,
  noticesTotal: 9, portals: 14, cityServices: 15, topics: 54,
});
export const LAUNCH_FEATURES = Object.freeze(['calendar', 'activities', 'pregnancy', 'topic54', 'resourceCatalog', 'cityServices']);

export function snapshotHash(data) {
  if (data === undefined) throw new Error('無法對未定義內容建立核准指紋');
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SHA = /^[a-f0-9]{64}$/;
export function approvedLaunchRecord(content, decision) {
  if (!decision || !content || typeof content !== 'object') return false;
  return decision.decision === 'site-owner-approved-for-publication'
    && decision.approvedBy === 'site-owner'
    && DAY.test(decision.approvedOn || '')
    && decision.sourceReview === 'AI-source-checked-not-manual-owner-audit'
    && SHA.test(decision.sha256 || '')
    && decision.sha256 === snapshotHash(content);
}

export function approvedLaunchArticle(article, launchApprovals) {
  if (!article?.qa || typeof article.slug !== 'string' ||
      article.status === '已撤下' || article.status === '需要修正' ||
      article.visibility === 'withdrawn') return false;
  // 來源仍待複核的編輯草稿（62 篇中的 13 篇）即使誤填指紋也不放行；須先完成來源查核、產生新版本再簽核。
  if (article.editorialReviewPending !== false && article.expansion) return false;
  // 已正式撤稿的 exp-12 永不得回流。即使有人誤填核准也不放行。
  if (article.slug === 'exp-compare-everyday-experiments' ||
      article.slug === 'exp-reading-popular-science') return false;
  return approvedLaunchRecord(article, launchApprovals?.approvedArticles?.[article.slug]);
}

export function approvedLaunchFeature(name, source, launchApprovals) {
  if (!LAUNCH_FEATURES.includes(name)) return false;
  return approvedLaunchRecord(source, launchApprovals?.approvedFeatures?.[name]);
}
