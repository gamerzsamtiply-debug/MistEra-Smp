import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db } from '../db.js';
import { checkRateLimit } from '../ratelimit.js';

// Stores one sign-in event (who / when / IP). The data is ADMIN ONLY: it is only ever returned by adminViews.
export default authEndpoint(z.object({ method: z.enum(['password', 'google', 'session']).default('password') }), async ({ input, user, ip }) => {
  if ((await checkRateLimit('login-event', user.id, 20, 3600)) !== 'allowed') return { ok: true };
  const r = await db().from('login_events').insert({ user_id: user.id, email: user.email.slice(0, 200), method: input.method, ip: ip.slice(0, 64) });
  if (r.error) console.error('[db] login_events.insert (is migration 0007 applied?):', r.error);
  return { ok: true };
});
