import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { profileMap } from '../lib.js';
import { albumStats, albumViewCounts } from '../album.js';
import { guestKeyOrNull } from '../guest.js';
import type { AlbumRow } from '../types.js';

// Lists approved community album posts (photos and videos) with like/comment counts.
// A signed-in visitor also learns which posts they have already liked.
export default optionalAuthEndpoint(z.object({ visitorId: z.string().max(64).optional() }), async ({ input, user }) => {
  const r = await db().from('album_submissions').select('*').eq('status', 'Approved').order('submitted_at', { ascending: false }).limit(200);
  const rows = (must(r, 'album.approved') ?? []) as AlbumRow[];
  const [pm, stats, views] = await Promise.all([profileMap(rows.map((a) => a.uploader)), albumStats(rows.map((a) => a.id), user?.id, user ? null : guestKeyOrNull(input.visitorId)), albumViewCounts(rows.map((a) => a.id))]);
  return {
    images: rows.map((a) => {
      const st = stats.get(a.id);
      return {
        id: a.id,
        mediaType: a.media_type === 'video' ? 'video' : 'image',
        imageUrl: a.image_url ?? '',
        caption: a.caption ?? '',
        submittedAt: a.submitted_at ?? '',
        uploader: (a.uploader && pm.get(a.uploader)) || null,
        likeCount: st?.likes ?? 0,
        commentCount: st?.comments ?? 0,
        likedByMe: st?.liked ?? false,
        viewCount: views.get(a.id) ?? 0,
      };
    }),
  };
});
