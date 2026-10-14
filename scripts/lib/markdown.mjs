// 精簡 Markdown 轉換器：只支援本站內容需要的語法，避免引入外部套件。
// 支援：## / ### 標題、段落、- 與 1. 清單、**粗體**、[連結](網址)。

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 解析開頭的 --- front matter。重複的鍵（例如 source）會收集成陣列。 */
export function parseFrontMatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { data: {}, body: text };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, raw] = m;
    let value = raw.trim();
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    if (key in data) {
      data[key] = [].concat(data[key], value);
    } else {
      data[key] = value;
    }
  }
  return { data, body: text.slice(match[0].length) };
}

/**
 * @param {string} text
 * @param {{ link: (href: string) => {href: string, external: boolean} }} options
 */
function inline(text, options) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const target = options.link(href.replace(/&amp;/g, '&'));
    const rel = target.external ? ' rel="noopener noreferrer" class="ext"' : '';
    return `<a href="${escapeHtml(target.href)}"${rel}>${label}</a>`;
  });
  return html;
}

export function renderMarkdown(text, options) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(''), options)}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(`<${list.tag}>${list.items.map((item) => `<li>${inline(item, options)}</li>`).join('')}</${list.tag}>`);
      list = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    let m;
    if (!trimmed) {
      flushParagraph();
      flushList();
    } else if ((m = /^(#{2,3})\s+(.*)$/.exec(trimmed))) {
      flushParagraph();
      flushList();
      const level = m[1].length;
      out.push(`<h${level}>${inline(m[2], options)}</h${level}>`);
    } else if ((m = /^(-|\d+\.)\s+(.*)$/.exec(trimmed))) {
      flushParagraph();
      const tag = m[1] === '-' ? 'ul' : 'ol';
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push(m[2]);
    } else {
      flushList();
      paragraph.push(trimmed);
    }
  }
  flushParagraph();
  flushList();
  return out.join('\n');
}
