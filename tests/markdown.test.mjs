// Unit tests for the markdown XSS sanitiser (src/project-components/markdown/sanitize.ts).
// Pure functions over hast-like trees, so they run without a browser or React.
//
//   npm run test:markdown
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(mkdtempSync(path.join(tmpdir(), 'mistera-md-')), 'sanitize.mjs');
await build({ entryPoints: [path.join(root, 'src/project-components/markdown/sanitize.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error' });
const { sanitizeTree, normalizeRawHtml, isSafeUrl } = await import(pathToFileURL(out).href);

const el = (tagName, properties = {}, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });
const raw = (value) => ({ type: 'raw', value });
const root_ = (...children) => ({ type: 'root', children });
const html = (n) => (n.type === 'text' ? n.value : n.type === 'element' ? `<${n.tagName}${Object.entries(n.properties ?? {}).map(([k, v]) => ` ${k}="${[].concat(v).join(' ')}"`).join('')}>${(n.children ?? []).map(html).join('')}</${n.tagName}>` : (n.children ?? []).map(html).join(''));

let passed = 0, failed = 0;
const test = (title, fn) => { try { fn(); passed++; console.log('  ✓', title); } catch (e) { failed++; console.log('  ✗', title, '\n     ', e.message.split('\n')[0]); } };

console.log('\nMarkdown sanitiser');
test('pre-pass keeps only bare <mark> tags and strips their attributes', () => {
  const t = normalizeRawHtml(root_(el('p', {}, [
    raw('<mark>'), text('hi'), raw('</mark>'),
    raw('<mark onmouseover="alert(1)" class="x">'), raw('</MARK>'),
    raw('<script>alert(1)</script>'), raw('<img src=x onerror=alert(1)>'), raw('<marker>'), raw('<mark><img src=x onerror=1>'), raw('<!-- c -->'),
  ])));
  assert.deepEqual(t.children[0].children.map((c) => c.value ?? c.type), ['<mark>', 'hi', '</mark>', '<mark>', '</mark>']);
});
test('post-pass removes script/style/iframe/svg with their content', () => {
  const t = sanitizeTree(root_(el('p', {}, [text('a'), el('script', {}, [text('alert(1)')]), el('style', {}, [text('*{}')]), el('iframe', { src: 'https://evil' }), el('svg', { onload: 'x()' }, [el('script')]), text('b')])));
  assert.equal(html(t), '<p>ab</p>');
});
test('post-pass strips event handlers, style and unknown attributes', () => {
  const t = sanitizeTree(root_(el('p', { onclick: 'x()', style: 'x', id: 'y' }, [el('mark', { onmouseover: 'x()', className: ['evil'] }, [text('m')]), el('a', { href: 'https://ok.example/', onclick: 'x()', target: '_blank' }, [text('l')])])));
  assert.equal(html(t), '<p><mark>m</mark><a href="https://ok.example/" rel="noopener noreferrer nofollow">l</a></p>');
});
test('dangerous URL schemes are rejected, even obfuscated', () => {
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' java\tscript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>1</script>', 'vbscript:x', '\u0001javascript:x', 'jav&#x61;script:x'.replace('&#x61;', '\u200ba')]) assert.equal(isSafeUrl(bad, ['http', 'https', 'mailto', 'tel']), false, JSON.stringify(bad));
  for (const good of ['https://a.example/x?y=1#z', 'http://a.example', 'mailto:a@b.co', '/relative/path', '#anchor', 'page.html']) assert.equal(isSafeUrl(good, ['http', 'https', 'mailto', 'tel']), true, good);
  const t = sanitizeTree(root_(el('a', { href: 'javascript:alert(1)' }, [text('x')]), el('img', { src: 'data:image/svg+xml,<svg onload=1>', alt: 'a' }), el('img', { src: 'https://i.example/a.png', alt: 'ok' })));
  assert.equal(html(t), '<a>x</a><img alt="a"></img><img src="https://i.example/a.png" alt="ok"></img>');
});
test('legit markdown output survives (headings, lists, tables, code, task lists, links, images)', () => {
  const t = root_(
    el('h2', {}, [text('Title')]), el('ul', { className: ['contains-task-list'] }, [el('li', { className: ['task-list-item'] }, [el('input', { type: 'checkbox', checked: true, disabled: true }), text(' done')])]),
    el('pre', {}, [el('code', { className: ['language-js'] }, [text('let x = 1;')])]),
    el('table', {}, [el('thead', {}, [el('tr', {}, [el('th', { align: 'center' }, [text('h')])])]), el('tbody', {}, [el('tr', {}, [el('td', {}, [text('c')])])])]),
    el('ol', { start: 3 }, [el('li', {}, [el('strong', {}, [text('b')]), el('em', {}, [text('i')]), el('del', {}, [text('d')])])]), el('blockquote', {}, [el('p', {}, [text('q')])]), el('hr'),
  );
  const before = html(root_(...t.children));
  const after = html(sanitizeTree(t));
  assert.equal(after, before);
});
test('hostile class names and fake checkboxes are neutralised', () => {
  const t = sanitizeTree(root_(el('code', { className: ['language-js', 'fixed', 'inset-0', 'z-50'] }), el('input', { type: 'text', onfocus: 'x()', value: 'v' })));
  assert.equal(html(t), '<code className="language-js"></code><input type="checkbox" disabled="true"></input>');
});
test('unknown wrapper elements are unwrapped, remaining raw nodes dropped', () => {
  const t = sanitizeTree(root_(el('div', {}, [el('custom-el', {}, [text('kept')]), raw('<b onclick=1>')]), { type: 'comment', value: 'x' }));
  assert.equal(html(t), 'kept');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
