import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { displayRole, findProfileById } from '../lib.js';
import { albumViewCounts } from '../album.js';
import type { AlbumRow } from '../types.js';

// Returns a public profile and its approved album images
export default publicEndpoint(z.object({ profileId: z.string().min(1).max(64) }), async ({ input }) => {
  const p = await findProfileById(input.profileId);
  if (!p) throw fail('NOT_FOUND', "This player profile doesn't exist.");
  const r = await db().from('album_submissions').select('*').eq('uploader', p.user_id).eq('status', 'Approved').order('submitted_at', { ascending: false }).limit(200);
  const images = (must(r, 'album.byUser') ?? []) as AlbumRow[];
  const views = await albumViewCounts(images.map((a) => a.id));
  return {
    profile: { id: p.id, username: p.username ?? 'player', bio: p.bio ?? '', avatarUrl: p.avatar_url ?? '', role: displayRole(p.role), joinedAt: p.joined_at ?? '' },
    images: images.map((a) => ({ id: a.id, mediaType: a.media_type === 'video' ? 'video' : 'image', imageUrl: a.image_url ?? '', caption: a.caption ?? '', viewCount: views.get(a.id) ?? 0 })),
  };
});
