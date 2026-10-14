// 靜態站核准閘門：AI 來源證據與網站發起人的發布核准是不同程序。
// 快照完全一致且來源核對範圍適當才允許 production 公開；不冒充人工查核。
import { createHash } from 'node:crypto';

export function gitBlobSha(bytes) {
  const b = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
}
export function approvedRecord(item, approvals, level) {
  const saved = approvals?.[item?.id]?.snapshot;
  return Boolean(
    saved && JSON.stringify(item) === JSON.stringify(saved) &&
    item.status !== '已撤下' && item.status !== '需要修正' &&
    item.published !== false &&
    item.review?.level === level &&
    typeof item.review?.by === 'string' && item.review.by.length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.review?.date || '') &&
    /^https:\/\//.test(item.review?.source || '')
  );
}
export function approvedPhotoMetadata(item, approvals, generated) {
  const entry = approvals?.[item?.id];
  return Boolean(
    entry?.snapshot && entry?.originalGitBlobSha &&
    JSON.stringify(item) === JSON.stringify(entry.snapshot) &&
    JSON.stringify(generated?.[item.id]) === JSON.stringify(entry.generatedSnapshot) &&
    item.status !== '待補' && item.status !== '需要修正' && item.status !== '已撤下' &&
    item.source && item.license && item.alt && Object.keys(entry.assets || {}).length
  );
}
