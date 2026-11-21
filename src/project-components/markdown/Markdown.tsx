import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '../lib/utils';
import { normalizeRawHtml, sanitizeTree } from './sanitize';

import './markdown.css';

// Two-pass XSS protection (see ./sanitize.ts): drop all raw HTML except a bare <mark>, then allow-list the result.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rehypeAllowOnlyMark = () => (tree: any) => void normalizeRawHtml(tree);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rehypeSanitizeAllowList = () => (tree: any) => void sanitizeTree(tree);

interface MarkdownProps {
  /** The markdown string to render. */
  children: string;
  /** Additional class names merged onto the prose wrapper. */
  className?: string;
  /** Render `# Heading` as an <h2>. Use on pages that already have their own <h1> so there is only one per page. */
  demoteH1?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEMOTE_H1 = { h1: ({ node: _node, ...props }: any) => <h2 {...props} /> };

/**
 * Renders a markdown string as styled HTML. Use this for read-only rendering
 * of formatted/markdown content (descriptions, AI-generated text, stored
 * rich text from the database, etc.).
 *
 * Supports GitHub Flavored Markdown (tables, strikethrough, task lists) and
 * allows bare `<mark>` tags for highlighted text. All other raw HTML is
 * stripped and the output is allow-list sanitised (no scripts, event handlers
 * or `javascript:` URLs can get through).
 *
 * For an editable rich text input, import `MarkdownEditor` from
 * `@/components/markdown-editor` instead.
 *
 * DO NOT render markdown manually (regex, `dangerouslySetInnerHTML`,
 * marked.js, etc.) and DO NOT swap in a different library — use this
 * component.
 *
 * @example
 * ```tsx
 * import { Markdown } from './'
 *
 * <Markdown>{post.body}</Markdown>
 * ```
 */
export function Markdown({ children, className, demoteH1 }: MarkdownProps) {
  return (
    <div className={cn('prose max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeAllowOnlyMark, rehypeRaw, rehypeSanitizeAllowList]}
        components={demoteH1 ? DEMOTE_H1 : undefined}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
