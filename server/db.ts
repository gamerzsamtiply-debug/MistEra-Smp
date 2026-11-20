import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from './errors.js';
import { env } from './env.js';

let client: SupabaseClient | null = null;

/**
 * Service-role Supabase client. It bypasses Row Level Security, so it must only be
 * used in server code, after the caller has been authorized. The key is read from
 * SUPABASE_SERVICE_ROLE_KEY and is never sent to the browser.
 */
export function db(): SupabaseClient {
  if (client) return client;
  const url = env('SUPABASE_URL') ?? env('VITE_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    console.error('[config] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the server.');
    // 503 + a readable message (instead of a blank 500) so the cause is obvious: set these in Vercel -> Settings -> Environment Variables, then redeploy.
    throw new ApiError('SETUP', 'Server setup incomplete: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set in Vercel. Add them, then redeploy.');
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: resilientFetch } });
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Supabase calls over the network occasionally fail transiently (cold DNS, a reset connection, a 502 from the
 * gateway). Reads (GET/HEAD) are safe to repeat, so they are retried a couple of times with a short back-off
 * and every call has a timeout so a hung connection can't run into Vercel's function limit.
 * Writes are never repeated automatically.
 */
const resilientFetch: typeof fetch = async (input, init) => {
  const method = (init?.method ?? 'GET').toUpperCase();
  const safe = method === 'GET' || method === 'HEAD';
  const attempts = safe ? 3 : 1;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = init?.signal ? null : setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(input, init?.signal ? init : { ...init, signal: ctrl.signal });
      if (safe && res.status >= 502 && res.status <= 504 && i < attempts - 1) {
        await sleep(150 * (i + 1));
        continue;
      }
      return res;
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await sleep(150 * (i + 1));
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastError;
};

interface DbResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

/**
 * Unwraps a Supabase result; logs the real error server-side. Errors that are caused by the request
 * (duplicate value, bad id, value rejected by a constraint) become 4xx responses instead of HTTP 500.
 */
export function must<T>(res: DbResult<T>, what: string): T {
  if (res.error) {
    console.error(`[db] ${what}:`, res.error);
    const code = res.error.code ?? '';
    // Table/function missing = a SQL migration has not been run in Supabase yet. Say so instead of a blank 500.
    if (isMissingRelation(res.error)) throw new ApiError('SETUP', `Database not set up yet (${what}). Run the SQL files in supabase/migrations (0001 to 0004) in the Supabase SQL Editor.`);
    // 401/PGRST301/JWT problems here almost always mean SUPABASE_SERVICE_ROLE_KEY is wrong (for example the anon key was pasted).
    if (/invalid api key|jwt|permission denied/i.test(res.error.message ?? '') || code === '42501') throw new ApiError('SETUP', 'Database key rejected. Check that SUPABASE_SERVICE_ROLE_KEY in Vercel is the service_role key (not the anon key), then redeploy.');
    if (code === '23505') throw new ApiError('CONFLICT', 'That already exists.');
    if (['22P02', '22001', '22003', '23502', '23503', '23514'].includes(code)) throw new ApiError('BAD_REQUEST', 'Some information is invalid. Please review it and try again.');
    throw new ApiError('INTERNAL', 'Database error');
  }
  return res.data as T;
}

/** True when the table/function is missing, i.e. a migration has not been applied yet. */
export function isMissingRelation(err: { code?: string } | null | undefined): boolean {
  return err?.code === '42P01' || err?.code === 'PGRST205' || err?.code === 'PGRST202';
}

/**
 * Like must(), but for optional page sections: a missing table (migration not applied yet) or a failed read
 * yields `fallback` and is logged, so one broken section can never turn a whole page into an HTTP 500.
 */
export function mustOr<T>(res: DbResult<T>, what: string, fallback: T): T {
  if (res.error) {
    console.error(`[db] ${what}:`, res.error);
    return fallback;
  }
  return (res.data ?? fallback) as T;
}

/** Postgres unique-violation. */
export function isUniqueViolation(err: { code?: string } | null | undefined): boolean {
  return err?.code === '23505';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

/**
 * Supabase caps a single response at 1000 rows, so larger reads are paged.
 * `build(from, to)` must return the query for that inclusive row range.
 */
export async function selectAll<T>(build: (from: number, to: number) => PromiseLike<DbResult<T[]>>, max: number, what: string): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const to = Math.min(from + PAGE, max) - 1;
    const rows = must(await build(from, to), what) ?? [];
    out.push(...rows);
    if (rows.length < to - from + 1) break;
  }
  return out;
}
