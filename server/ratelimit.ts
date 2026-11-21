import { createHmac } from 'node:crypto';
import { db } from './db.js';
import { env } from './env.js';
import { fail } from './errors.js';

export type RateResult = 'allowed' | 'limited' | 'error';

/**
 * Fixed-window rate limiter that works on serverless (no in-memory state): the counter lives in Postgres
 * and is incremented atomically by the `check_rate_limit` SQL function (migration 0002).
 *
 * The subject (an IP address or user id) is HMAC-hashed with the service-role key before it is stored, so the
 * table never contains raw IP addresses.
 */
export async function checkRateLimit(bucket: string, subject: string, limit: number, windowSeconds: number): Promise<RateResult> {
  try {
    const secret = env('SUPABASE_SERVICE_ROLE_KEY') ?? 'mistera';
    const hashed = createHmac('sha256', secret).update(`${bucket}|${subject}`).digest('hex').slice(0, 32);
    const { data, error } = await db().rpc('check_rate_limit', { p_key: `${bucket}:${hashed}`, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) {
      console.error('[ratelimit] check_rate_limit failed (is migration 0002 applied?):', error);
      return 'error';
    }
    return data === true ? 'allowed' : 'limited';
  } catch (e) {
    console.error('[ratelimit] unexpected failure:', e);
    return 'error';
  }
}

/** Throws RATE_LIMITED (HTTP 429) when the limit is exceeded. A limiter outage never blocks the user (fails open). */
export async function enforceRateLimit(bucket: string, subject: string, limit: number, windowSeconds: number, message: string): Promise<void> {
  if ((await checkRateLimit(bucket, subject, limit, windowSeconds)) === 'limited') throw fail('RATE_LIMITED', message);
}
