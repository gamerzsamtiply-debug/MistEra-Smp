import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';

// Forgets a subscription (the endpoint URL is an unguessable secret of that browser).
export default publicEndpoint(z.object({ endpoint: z.string().url().max(1000) }), async ({ input }) => {
  must(await db().from('push_subscriptions').delete().eq('endpoint', input.endpoint), 'push_subscriptions.delete');
  return { ok: true };
});
