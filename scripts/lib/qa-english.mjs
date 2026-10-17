// QA-only English discovery layer. The Chinese text remains authoritative.
// This loader NEVER changes original content, its approval snapshot, or general preview.
// No API translation, cookies, location or user input are used.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const QA_ENGLISH_FILE = 'docs/QA-ENGLISH-RESOURCE-DISCOVERY-2026-10-16.json';
const LINK = /^https:\/\/[^\s<>"']+$/;
const WORDS = /^[a-z0-9 ,.'()\-/]+$/i;

export async function loadQaEnglishResources(root, baseResources, { allowMissingOverrides = false } = {}) {
  const record = JSON.parse(await readFile(path.join(root, QA_ENGLISH_FILE), 'utf8'));
  const faults = [];
  if (record.approvalStatus !== 'not-approved') faults.push('English candidate data must remain unapproved');
  if (!Array.isArray(record.resources) || !record.overrides || typeof record.overrides !== 'object') {
    throw new Error('Invalid English QA resource structure');
  }

  const existingIds = new Set(baseResources.map(r => r.id));
  const existingUrls = new Set(baseResources.map(r => r.url));
  const validateEnglish = (v, id) => {
    if (!v || typeof v !== 'object') { faults.push(id + ': missing English metadata'); return; }
    for (const k of ['nameEn', 'summaryEn']) if (v[k] !== undefined && (typeof v[k] !== 'string' || !v[k].trim())) faults.push(id + ': invalid ' + k);
    if (v.nameEn && !v.summaryEn) faults.push(id + ': English name needs an English service description');
    if (v.summaryEn && (!Array.isArray(v.keywordsEn) || !v.keywordsEn.length)) faults.push(id + ': English summary needs search terms');
    if (v.keywordsEn && (!Array.isArray(v.keywordsEn) || v.keywordsEn.some(x => typeof x !== 'string' || !WORDS.test(x) || x.length > 60))) faults.push(id + ': invalid English keywords');
    if (v.officialEnglishUrl && !LINK.test(v.officialEnglishUrl)) faults.push(id + ': official English URL must be HTTPS');
  };

  const resources = baseResources.map(r => {
    const english = record.overrides[r.id];
    if (!english) return r;
    validateEnglish(english, r.id);
    // Only the QA view receives the overlay, not original content or release approvals.
    return { ...r, ...english, qaEnglish: true };
  });
  for (const key of Object.keys(record.overrides)) {
    if (!existingIds.has(key) && !allowMissingOverrides) faults.push('English overlay refers to unknown id: ' + key);
  }
  for (const item of record.resources) {
    validateEnglish(item, item.id);
    if (existingIds.has(item.id) || existingUrls.has(item.url)) faults.push('Duplicate English resource: ' + item.id);
    if (!item.id?.startsWith('qa-en-') || item.published !== false || item.status !== '待確認' || item.checkedAt !== null) faults.push(item.id + ': invalid QA-only status');
    if (!item.qa && item.qa !== undefined) faults.push(item.id + ': cannot preapprove');
    if (item.review?.result !== '未核准 QA 候選') faults.push(item.id + ': missing unapproved review');
    if (!LINK.test(item.url) || !Array.isArray(item.sources) || !item.sources.every(x => LINK.test(x.url))) faults.push(item.id + ': invalid official HTTPS source');
    existingIds.add(item.id);
    existingUrls.add(item.url);
    resources.push({ ...item, qa: true, qaEnglish: true, entryType: '新住民與多語官方資訊入口' });
  }
  if (record.resources.length !== 3 || Object.keys(record.overrides).length !== 8) faults.push('Unexpected English resource scope');
  if (faults.length) throw new Error('English QA-only data validation failed:\n- ' + faults.join('\n- '));
  return resources;
}
