import { useCallback, useEffect, useRef, useState } from 'react';
import { run, isAppError, type AppError } from './errors';

// Small stale-while-revalidate cache for PUBLIC pages (opt-in with { cache: true }):
// going back to a page shows its last data immediately and only refreshes it in the background,
// and identical requests that are already running are shared instead of repeated.
const store = new Map<string, { data: unknown; at: number }>();
const inflight = new Map<string, Promise<unknown>>();
const FRESH_MS = 30_000;

export function invalidateLoadCache(prefix = ''): void {
  for (const k of [...store.keys()]) if (k.startsWith(prefix)) store.delete(k);
}

export function useLoad<T>(operation: string, fn: () => Promise<T>, deps: unknown[] = [], opts: { cache?: boolean } = {}) {
  const key = opts.cache ? `${operation}|${JSON.stringify(deps)}` : '';
  const hit = key ? (store.get(key) as { data: T; at: number } | undefined) : undefined;
  const [data, setData] = useState<T | null>(hit ? hit.data : null);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(!hit);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback((force: boolean) => {
    const cached = key ? (store.get(key) as { data: T; at: number } | undefined) : undefined;
    if (cached && !force && Date.now() - cached.at < FRESH_MS) { setData(cached.data); setLoading(false); setError(null); return; }
    if (cached) { setData(cached.data); setLoading(false); } else setLoading(true);
    setError(null);
    let p = key && !force ? (inflight.get(key) as Promise<T | undefined> | undefined) : undefined;
    if (!p) {
      p = run(operation, () => fnRef.current(), { retries: 1, silent: true });
      if (key) { inflight.set(key, p); p.finally(() => inflight.delete(key)).catch(() => undefined); }
    }
    p.then((d) => { const v = (d ?? null) as T | null; if (key && v !== null) store.set(key, { data: v, at: Date.now() }); setData(v); })
      .catch((e) => { if (!cached) setError(isAppError(e) ? e : { kind: 'server', title: 'Something Went Wrong', message: "We couldn't load this content.", correlationId: '—' }); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation, key, ...deps]);

  const reload = useCallback(() => load(true), [load]);
  useEffect(() => load(false), [load]);
  return { data, error, loading, reload, setData };
}
