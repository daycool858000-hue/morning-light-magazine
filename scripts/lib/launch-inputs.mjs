// 正式發布「功能」的原始資料：build、指紋清單與隔離測試共用同一份讀取方式，避免三處各算各的而簽到不同版本。
// 只讀取，不改資料、不產生核准。
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function loadLaunchFeatureInputs(root, queueFile) {
  const text = (p) => readFile(path.join(root, p), 'utf8');
  const json = async (p) => JSON.parse(await text(p));
  const queue = await json(queueFile);
  return {
    calendar: { script: await text('src/qa-assets/js/qa-calendar.js') },
    activities: {
      portals: await json('docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json'),
      notices: await json('docs/QA-ACTIVITIES-NOTICES-2026Q4-2027-2026-10-16.json'),
      script: await text('src/qa-assets/js/qa-activities.js'),
    },
    pregnancy: await json('docs/QA-LIFE-FAMILY-PREGNANCY-GUIDE-2026-10-17.json'),
    topic54: await json('docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json'),
    resourceCatalog: {
      county: await json('docs/BATCH2-23-RESOURCE-CANDIDATES-2026-10-15.json'),
      open: await json('docs/BATCH3-OPEN-ACCESS-CONTENT-2026-10-15.json'),
      english: await json('docs/QA-ENGLISH-RESOURCE-DISCOVERY-2026-10-16.json'),
    },
    // 62 篇預覽城市與福利的六縣市 15 筆直接服務入口（佇列中 importToQa 的官方資源）。
    cityServices: { queueFile, resources: (queue.resources || []).filter((x) => x.importToQa === true) },
  };
}

export const LAUNCH_FEATURE_FILES = Object.freeze({
  calendar: ['src/qa-assets/js/qa-calendar.js'],
  activities: ['docs/QA-ACTIVITIES-OFFICIAL-PORTALS-2026-10-16.json', 'docs/QA-ACTIVITIES-NOTICES-2026Q4-2027-2026-10-16.json', 'src/qa-assets/js/qa-activities.js'],
  pregnancy: ['docs/QA-LIFE-FAMILY-PREGNANCY-GUIDE-2026-10-17.json'],
  topic54: ['docs/QA-TOPIC-ENTRANCES-54-SOURCE-GUIDES-2026-10-17.json'],
  resourceCatalog: ['docs/BATCH2-23-RESOURCE-CANDIDATES-2026-10-15.json', 'docs/BATCH3-OPEN-ACCESS-CONTENT-2026-10-15.json', 'docs/QA-ENGLISH-RESOURCE-DISCOVERY-2026-10-16.json'],
  cityServices: ['docs/QA-FULL-LAUNCH-ALL-62-WITH-CITY-SERVICES-2026-10-18.json（resources 中 importToQa）'],
});
