import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_FLAG = 'mistera-chunk-reload';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * React.lazy that quietly retries when a page's JavaScript fails to download (flaky connection, cold start, or a
 * new deployment that replaced the old file names). After the retries it reloads the page ONCE to pick up the
 * new files, and only then lets the error reach the error page.
 * `.preload()` downloads the page in the background so the next click is instant.
 */
export function lazyRetry<T extends ComponentType<any>>(load: () => Promise<{ default: T }>, tries = 5): LazyExoticComponent<T> & { preload: () => Promise<unknown> } {
  let started: Promise<{ default: T }> | null = null;
  const attempt = (): Promise<{ default: T }> => {
    if (!started) {
      started = (async () => {
        let last: unknown;
        for (let i = 0; i <= tries; i++) {
          try {
            const mod = await load();
            try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* storage unavailable */ }
            return mod;
          } catch (e) { last = e; await sleep(Math.min(400 * (i + 1), 2000)); }
        }
        try {
          if (!sessionStorage.getItem(RELOAD_FLAG)) {
            sessionStorage.setItem(RELOAD_FLAG, '1');
            location.reload();
            return await new Promise<never>(() => undefined); // page is reloading
          }
        } catch { /* storage unavailable */ }
        started = null; // allow a later manual retry
        throw last;
      })();
    }
    return started;
  };
  const Component = lazy(attempt) as LazyExoticComponent<T> & { preload: () => Promise<unknown> };
  Component.preload = () => attempt().catch(() => undefined);
  return Component;
}
