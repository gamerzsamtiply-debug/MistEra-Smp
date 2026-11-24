import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { checkRateLimit } from '../ratelimit.js';
import { VISITOR_ID_RE } from '../guest.js';

// Stores (or refreshes) this browser's push subscription. Guests are fine; when the person is signed in the subscription is linked to their account.
export default optionalAuthEndpoint(
  z.object({ endpoint: z.string().url().max(1000), p256dh: z.string().min(10).max(300), auth: z.string().min(8).max(100), visitorId: z.string().max(64).optional() }),
  async ({ input, user, ip }) => {
    if (!input.endpoint.startsWith('https://')) return { ok: false };
    if ((await checkRateLimit('push-sub', ip, 60, 3600)) === 'limited') return { ok: false };
    const row: Record<string, unknown> = { endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth, updated_at: new Date().toISOString() };
    if (input.visitorId && VISITOR_ID_RE.test(input.visitorId)) row.visitor_key = input.visitorId;
    if (user) row.user_id = user.id; // never wipe a link to an account when a guest-state refresh arrives
    must(await db().from('push_subscriptions').upsert(row, { onConflict: 'endpoint' }), 'push_subscriptions.upsert');
    return { ok: true };
  },
);
