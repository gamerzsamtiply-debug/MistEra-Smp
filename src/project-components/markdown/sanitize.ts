/**
 * HTML sanitising for rendered markdown (XSS protection).
 *
 * Content comes from admins (posts, pages) and is rendered with react-markdown + rehype-raw so that
 * `<mark>` highlights work. Two passes keep that safe:
 *   1. `normalizeRawHtml`  (runs BEFORE rehype-raw): every raw HTML snippet except a bare <mark> / </mark>
 *      is dropped, and attributes on <mark> are discarded (so `<mark onmouseover=…>` can't survive).
 *   2. `sanitizeTree`      (runs AFTER rehype-raw): an allow-list pass over the final tree. Unknown elements
 *      are unwrapped (dangerous ones are removed with their content), only allow-listed attributes are kept,
 *      and every URL must use a safe protocol.
 * No dependency is needed; both functions are pure and covered by tests/markdown.test.mjs.
 */

export interface HNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
}

const ALLOWED_TAGS = new Set([
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'img', 'input', 'li', 'mark',
  'ol', 'p', 'pre', 'strong', 'sup', 'sub', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);

/** Removed together with everything inside them (unwrapping these would leak their text/markup). */
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'template', 'noscript', 'textarea',
  'title', 'svg', 'math', 'form', 'select', 'button', 'link', 'meta', 'base', 'audio', 'video', 'source', 'track', 'canvas', 'portal',
]);

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title'],
  input: ['type', 'checked', 'disabled'],
  code: ['className'],
  ol: ['start'],
  ul: ['className'],
  li: ['className'],
  th: ['align'],
  td: ['align'],
};

const SAFE_CLASS = /^(language-[A-Za-z0-9_+#.-]{1,30}|task-list-item|contains-task-list)$/;
const SAFE_ALIGN = new Set(['left', 'right', 'center']);

/** True for relative URLs, #anchors and http(s)/mailto/tel links — never javascript:, data:, vbscript: etc. */
export function isSafeUrl(value: unknown, protocols: string[]): boolean {
  if (typeof value !== 'string') return false;
  // Browsers ignore whitespace/control characters inside the scheme ("java\tscript:"), so strip them first.
  const v = value.replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, '');
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(v);
  if (!scheme) return !v.startsWith('\\');
  return protocols.includes(scheme[1].toLowerCase());
}

function cleanProperties(tag: string, props: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const allowed = ALLOWED_ATTRS[tag] ?? [];
  for (const [name, value] of Object.entries(props ?? {})) {
    if (!allowed.includes(name)) continue;
    switch (name) {
      case 'href':
        if (isSafeUrl(value, ['http', 'https', 'mailto', 'tel'])) out.href = value;
        break;
      case 'src':
        if (isSafeUrl(value, ['http', 'https'])) out.src = value;
        break;
      case 'className': {
        const list = (Array.isArray(value) ? value : String(value).split(/\s+/)).filter((c) => typeof c === 'string' && SAFE_CLASS.test(c));
        if (list.length) out.className = list;
        break;
      }
      case 'type':
        if (tag === 'input' && value === 'checkbox') out.type = 'checkbox';
        break;
      case 'checked':
        out.checked = value === true || value === 'true' || value === '';
        break;
      case 'disabled':
        out.disabled = true;
        break;
      case 'align':
        if (typeof value === 'string' && SAFE_ALIGN.has(value)) out.align = value;
        break;
      case 'start': {
        const n = Number(value);
        if (Number.isInteger(n) && n >= 0 && n < 100000) out.start = n;
        break;
      }
      default:
        if (typeof value === 'string') out[name] = value.slice(0, 500); // title, alt
    }
  }
  if (tag === 'input') {
    out.type = 'checkbox'; // the only <input> markdown can produce is a task-list checkbox
    out.disabled = true;
  }
  if (tag === 'a' && out.href) out.rel = ['noopener', 'noreferrer', 'nofollow'];
  return out;
}

function sanitizeChildren(children: HNode[]): HNode[] {
  const out: HNode[] = [];
  for (const node of children) {
    if (node.type === 'text') {
      out.push(node);
    } else if (node.type === 'element') {
      const tag = (node.tagName ?? '').toLowerCase();
      if (DROP_WITH_CONTENT.has(tag)) continue;
      const kids = sanitizeChildren(node.children ?? []);
      if (!ALLOWED_TAGS.has(tag)) {
        out.push(...kids); // unwrap unknown wrapper elements, keep their (sanitised) content
        continue;
      }
      out.push({ ...node, tagName: tag, properties: cleanProperties(tag, node.properties), children: kids });
    }
    // 'raw', 'comment', 'doctype', 'mdxJsx…' and anything else is dropped.
  }
  return out;
}

/** Pass 2 (after rehype-raw): allow-list the final tree. Mutates and returns it. */
export function sanitizeTree<T extends HNode>(tree: T): T {
  tree.children = sanitizeChildren(tree.children ?? []);
  return tree;
}

const MARK_TAG = /^<(\/?)mark(?:\s[^<>]*)?\s*>$/i;

/** Pass 1 (before rehype-raw): keep only bare <mark> / </mark>; drop all other raw HTML. Mutates and returns the tree. */
export function normalizeRawHtml<T extends HNode>(tree: T): T {
  const walk = (node: HNode) => {
    if (!node.children) return;
    const kept: HNode[] = [];
    for (const child of node.children) {
      if (child.type === 'raw') {
        const m = MARK_TAG.exec((child.value ?? '').trim());
        if (m) kept.push({ ...child, value: `<${m[1]}mark>` });
        continue;
      }
      walk(child);
      kept.push(child);
    }
    node.children = kept;
  };
  walk(tree);
  return tree;
}
