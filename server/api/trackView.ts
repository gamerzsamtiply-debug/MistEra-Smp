import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { db } from '../db.js';
import { checkRateLimit } from '../ratelimit.js';

// Counts one page visit (any public page). Never fails the page: errors and limits answer { ok: true }.
const PER_IP = { limit: 120, windowSeconds: 600 };

export default optionalAuthEndpoint(
  z.object({ visitorId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/), path: z.string().min(1).max(200) }),
  async ({ input, user, ip }) => {
    const path = input.path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
    if (!path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/login') || path.startsWith('/reset-password')) return { ok: true };
    if ((await checkRateLimit('view-ip', ip, PER_IP.limit, PER_IP.windowSeconds)) !== 'allowed') return { ok: true };
    const normalized = path.replace(/^\/u\/[^/]+$/, '/u/:id'); // one row group for all public profiles
    const r = await db().from('site_views').insert({ visitor_id: input.visitorId, path: normalized, user_id: user?.id ?? null });
    if (r.error) console.error('[db] site_views.insert (is migration 0007 applied?):', r.error);
    return { ok: true };
  },
);
