import { useCallback, useEffect, useRef, useState } from 'react';
import { run, isAppError, type AppError } from './errors';

export function useLoad<T>(operation: string, fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(() => {
    setLoading(true); setError(null);
    run(operation, () => fnRef.current(), { retries: 2, silent: true })
      .then((d) => setData(d ?? null))
      .catch((e) => setError(isAppError(e) ? e : { kind: 'server', title: 'Something Went Wrong', message: "We couldn't load this content.", correlationId: '—' }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation, ...deps]);
  useEffect(reload, [reload]);
  return { data, error, loading, reload, setData };
}
