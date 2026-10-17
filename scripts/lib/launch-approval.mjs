// 《由己》正式發布文章與新功能的原始版本指紋。
// 簽核只能紀錄站主明確決定，不能因 QA 或 CI 通過就自行寫入。
// 所有查核來源欄位保留，AI 協助查核 ≠ 站主逐頁人工查核。
import { createHash } from 'node:crypto';

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
  // 已正式撤稿的 exp-12 永不得回流。即使有人誤填核准也不放行。
  if (article.slug === 'exp-compare-everyday-experiments' ||
      article.slug === 'exp-reading-popular-science') return false;
  return approvedLaunchRecord(article, launchApprovals?.approvedArticles?.[article.slug]);
}

export function approvedLaunchFeature(name, source, launchApprovals) {
  if (!['calendar', 'activities', 'pregnancy', 'topic54'].includes(name)) return false;
  return approvedLaunchRecord(source, launchApprovals?.approvedFeatures?.[name]);
}
