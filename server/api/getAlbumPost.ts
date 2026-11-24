import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { fail } from '../errors.js';
import { findRow, profileMap } from '../lib.js';
import { albumStats, albumViewCounts } from '../album.js';
import { guestKeyOrNull } from '../guest.js';
import type { AlbumRow } from '../types.js';

// One approved album post by id - this is what a shared link (/album/<id>) opens. Works for guests.
export default optionalAuthEndpoint(z.object({ id: z.string().max(64), visitorId: z.string().max(64).optional() }), async ({ input, user }) => {
  const a = await findRow<AlbumRow>('album_submissions', input.id);
  if (!a || a.status !== 'Approved') throw fail('NOT_FOUND', 'This post is no longer available.');
  const [pm, stats, views] = await Promise.all([profileMap([a.uploader]), albumStats([a.id], user?.id, user ? null : guestKeyOrNull(input.visitorId)), albumViewCounts([a.id])]);
  const st = stats.get(a.id);
  return {
    post: {
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
    },
  };
});
