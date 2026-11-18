import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db } from '../db.js';
import { checkRateLimit } from '../ratelimit.js';

// Records a non-sensitive client-side error for admins to review.
//
// This endpoint is public (errors can happen before login), so it is the most abuse-prone one:
//  * per-IP limit  : 10 reports / 10 minutes
//  * global limit  : 300 reports / hour, so a distributed flood can't fill the table
//  * strict size limits and aggressive scrubbing of anything that looks like a secret or personal data
// When a limit is hit the request still answers { ok: true } (the browser must never see errors from its
// own error reporter) but nothing is stored.
const PER_IP = { limit: 10, windowSeconds: 600 };
const GLOBAL = { limit: 300, windowSeconds: 3600 };

export function scrub(s: string, max: number): string {
  return s
    .replace(/[\u0000-\u001f\u007f]+/g, ' ') // control characters / log-injection
    .replace(/\bBearer\s+\S+/gi, '[redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]{5,}(\.[A-Za-z0-9_-]+){0,2}/g, '[redacted]') // JWTs
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\b(password|passwd|token|otp|secret|api[_-]?key|key)\b\s*[:=]\s*\S+/gi, '[redacted]') // key=value pairs
    .replace(/\b(password|passwd|token|otp|secret|api[_-]?key|key)\w*/gi, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export default publicEndpoint(
  z.object({ operation: z.string().max(1000), category: z.string().max(500), correlationId: z.string().max(200), message: z.string().max(10000) }),
  async ({ input, ip }) => {
    if ((await checkRateLimit('errlog-ip', ip, PER_IP.limit, PER_IP.windowSeconds)) !== 'allowed') return { ok: true };
    if ((await checkRateLimit('errlog-global', 'all', GLOBAL.limit, GLOBAL.windowSeconds)) !== 'allowed') return { ok: true };
    const r = await db().from('error_logs').insert({
      operation: scrub(input.operation, 100),
      category: scrub(input.category, 50),
      correlation_id: scrub(input.correlationId, 40),
      message: scrub(input.message, 500),
    });
    if (r.error) console.error('[db] error_logs.insert:', r.error); // never fail the reporter
    return { ok: true };
  },
);
