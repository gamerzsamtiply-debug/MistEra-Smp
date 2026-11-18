// Applies the SEO tags for the current route to <head> after client-side navigation.
// The first paint already has the right tags (they are written into the static HTML at build time, see
// seo/vite-plugin-seo.ts); this only keeps them correct when the visitor navigates inside the app, and lets
// crawlers that execute JavaScript see consistent values. Every managed tag carries data-seo="<key>".
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { buildTags, resolveSeo, type Tag } from './seo-config';
import { useSite } from './site';

function findManaged(key: string): Element | null {
  return Array.from(document.head.querySelectorAll('[data-seo]')).find((el) => el.getAttribute('data-seo') === key) ?? null;
}

function write(tag: Tag) {
  let el = findManaged(tag.key);
  if (!el) {
    el = document.createElement(tag.tag);
    el.setAttribute('data-seo', tag.key);
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(tag.attrs)) if (el.getAttribute(k) !== v) el.setAttribute(k, v);
  if (tag.text !== undefined && el.textContent !== tag.text) el.textContent = tag.text;
}

export function applySeo(pathname: string, sameAs: string[] = []) {
  if (typeof document === 'undefined') return;
  const seo = resolveSeo(pathname);
  const tags = buildTags(seo, { sameAs });
  const wanted = new Set(tags.map((t) => t.key));
  // remove managed tags that do not apply to this route (e.g. canonical on a noindex page, JSON-LD off the homepage)
  document.head.querySelectorAll('[data-seo]').forEach((el) => { if (!wanted.has(el.getAttribute('data-seo') ?? '')) el.remove(); });
  tags.forEach(write);
  if (!findManaged('title')) document.title = seo.title;
}

/** Mount once inside the router (Layout). */
export function useRouteSeo() {
  const { pathname } = useLocation();
  const { settings } = useSite();
  const discord = settings?.discordUrl || '';
  useEffect(() => { applySeo(pathname, /^https:\/\//i.test(discord) ? [discord] : []); }, [pathname, discord]);
}
