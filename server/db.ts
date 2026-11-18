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
    throw new ApiError('INTERNAL', 'The server is not configured correctly.');
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return client;
}

interface DbResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

/** Unwraps a Supabase result; logs the real error server-side and throws a generic one. */
export function must<T>(res: DbResult<T>, what: string): T {
  if (res.error) {
    console.error(`[db] ${what}:`, res.error);
    throw new ApiError('INTERNAL', 'Database error');
  }
  return res.data as T;
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
