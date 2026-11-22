import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { db, isUuid } from '../db.js';
import { checkRateLimit } from '../ratelimit.js';
import { albumViewCounts } from '../album.js';

// Counts one view of an approved album post. Each signed-in user / browser counts once per post.
export default optionalAuthEndpoint(
  z.object({ id: z.string().max(64), visitorId: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/).optional() }),
  async ({ input, user, ip }) => {
    if (!isUuid(input.id)) return { views: 0 };
    const key = user ? `u:${user.id}` : input.visitorId ? `v:${input.visitorId}` : '';
    if (key && (await checkRateLimit('album-view', ip, 300, 600)) === 'allowed') {
      const post = await db().from('album_submissions').select('id').eq('id', input.id).eq('status', 'Approved').maybeSingle();
      if (post.data) {
        const r = await db().from('album_views').upsert({ submission_id: input.id, viewer_key: key }, { onConflict: 'submission_id,viewer_key', ignoreDuplicates: true });
        if (r.error) console.error('[db] album_views.upsert (is migration 0007 applied?):', r.error);
      }
    }
    const views = (await albumViewCounts([input.id])).get(input.id) ?? 0;
    return { views };
  },
);
