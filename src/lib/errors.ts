import { toast } from 'sonner';
import { logClientError } from '@/lib/api';

export type ErrorKind = 'network' | 'timeout' | 'unauthorized' | 'forbidden' | 'notFound' | 'rateLimited' | 'invalid' | 'conflict' | 'server';

export interface AppError { kind: ErrorKind; title: string; message: string; correlationId: string }

const TITLES: Record<ErrorKind, string> = {
  network: 'Connection Error', timeout: 'Request Timed Out', unauthorized: 'Login Required', forbidden: 'Access Denied',
  notFound: 'Not Found', rateLimited: 'Slow Down', invalid: 'Check Your Input', conflict: 'Already Taken', server: 'Something Went Wrong',
};
const DEFAULTS: Record<ErrorKind, string> = {
  network: "We're having trouble connecting. Check your internet and try again.",
  timeout: 'The request took too long. Please try again.',
  unauthorized: 'Your session may have expired. Please log in again.',
  forbidden: "You don't have permission to do this.",
  notFound: "We couldn't find what you were looking for.",
  rateLimited: "You're doing that too often. Please wait a moment and try again.",
  invalid: 'Some information is missing or invalid. Please review the form.',
  conflict: 'That value is already in use.',
  server: "We couldn't complete that request. Please try again shortly.",
};

const newId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

export function classify(err: unknown): AppError {
  const e = err as { status?: number; code?: string; message?: string; name?: string; userFacingMessage?: string };
  const status = e?.status ?? 0;
  const code = String(e?.code ?? '');
  let kind: ErrorKind = 'server';
  if (typeof navigator !== 'undefined' && !navigator.onLine) kind = 'network';
  else if (e?.name === 'TimeoutError' || /timed? ?out/i.test(e?.message ?? '')) kind = 'timeout';
  else if (e?.name === 'TypeError' && /fetch|network/i.test(e?.message ?? '')) kind = 'network';
  else if (status === 401 || code === 'UNAUTHORIZED') kind = 'unauthorized';
  else if (status === 403 || code === 'FORBIDDEN') kind = 'forbidden';
  else if (status === 404 || code === 'NOT_FOUND') kind = 'notFound';
  else if (status === 429 || code === 'RATE_LIMITED') kind = 'rateLimited';
  else if (status === 400 || code === 'BAD_REQUEST') kind = 'invalid';
  else if (status === 409 || code === 'CONFLICT') kind = 'conflict';
  const raw = e?.userFacingMessage || e?.message || '';
  // Only show messages that are clearly written for people; never raw technical errors.
  const friendly = kind !== 'server' && kind !== 'network' && raw && raw.length < 200 && !/[{}<>]|stack|sql|exception|undefined|null/i.test(raw);
  return { kind, title: TITLES[kind], message: friendly ? raw : DEFAULTS[kind], correlationId: newId() };
}

/** Runs an operation with timeout, retries (only when safe), toast feedback and error logging. */
export async function run<T>(operation: string, fn: () => Promise<T>, opts: { success?: string; failTitle?: string; retries?: number; silent?: boolean; timeoutMs?: number } = {}): Promise<T | undefined> {
  const attempts = (opts.retries ?? 0) + 1;
  let last: AppError | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await withTimeout(fn(), opts.timeoutMs ?? 20000);
      if (opts.success) toast.success(opts.success);
      return result;
    } catch (err) {
      last = classify(err);
      if (!['network', 'timeout', 'server'].includes(last.kind)) break;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  if (last) {
    if (last.kind === 'server' || last.kind === 'timeout') report(operation, last, 'request');
    if (!opts.silent) toast.error(opts.failTitle ?? last.title, { description: last.message });
    throw last;
  }
  return undefined;
}

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error('Request timed out'), { name: 'TimeoutError' })), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// The server rate-limits error reports too; this keeps a broken page (e.g. a render loop) from even trying to flood it.
const REPORT_WINDOW_MS = 60_000;
const REPORT_MAX_PER_WINDOW = 5;
const recentReports: number[] = [];
const seenReports = new Set<string>();

export function report(operation: string, e: AppError | Error, category = 'client') {
  const msg = 'kind' in e ? `${e.kind}: ${e.message}` : e.message;
  const now = Date.now();
  while (recentReports.length && now - recentReports[0] > REPORT_WINDOW_MS) recentReports.shift();
  if (recentReports.length >= REPORT_MAX_PER_WINDOW) return;
  const signature = `${operation}|${category}|${msg}`.slice(0, 300);
  if (seenReports.has(signature)) return; // same error already reported in this page session
  if (seenReports.size > 100) seenReports.clear();
  seenReports.add(signature);
  recentReports.push(now);
  logClientError({ operation, category, correlationId: 'correlationId' in e ? e.correlationId : newId(), message: msg }).catch(() => undefined);
}

export function isAppError(e: unknown): e is AppError {
  return !!e && typeof e === 'object' && 'kind' in e && 'correlationId' in e;
}
