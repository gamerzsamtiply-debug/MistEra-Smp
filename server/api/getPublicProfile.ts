import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { countRows, displayRole, findProfileById, isSiteOwnerId, siteOwnerUserId } from '../lib.js';
import { isFollowing } from '../social.js';
import { albumViewCounts } from '../album.js';
import type { AlbumRow } from '../types.js';

// Returns a public profile and its approved album images
export default optionalAuthEndpoint(z.object({ profileId: z.string().min(1).max(64) }), async ({ input, user }) => {
  const p = await findProfileById(input.profileId);
  if (!p) throw fail('NOT_FOUND', "This player profile doesn't exist.");
  const ownerId = await siteOwnerUserId();
  const r = await db().from('album_submissions').select('*').eq('uploader', p.user_id).eq('status', 'Approved').order('submitted_at', { ascending: false }).limit(200);
  const images = (must(r, 'album.byUser') ?? []) as AlbumRow[];
  const views = await albumViewCounts(images.map((a) => a.id));
  // follow numbers are optional extras: if migration 0009 has not been run yet the profile still loads
  const safeCount = (col: string) => countRows('follows', (q) => q.eq(col, p.user_id)).catch(() => 0);
  const [followers, following] = await Promise.all([safeCount('following_id'), safeCount('follower_id')]);
  const isMe = user?.id === p.user_id;
  const followedByMe = user && !isMe ? await isFollowing(user.id, p.user_id).catch(() => false) : false;
  return {
    profile: { id: p.id, username: p.username ?? 'player', bio: p.bio ?? '', avatarUrl: p.avatar_url ?? '', bannerUrl: p.banner_url ?? '', role: displayRole(p.role, isSiteOwnerId(p.user_id, ownerId)), joinedAt: p.joined_at ?? '', followers, following, isMe, followedByMe },
    images: images.map((a) => ({ id: a.id, mediaType: a.media_type === 'video' ? 'video' : 'image', imageUrl: a.image_url ?? '', caption: a.caption ?? '', viewCount: views.get(a.id) ?? 0 })),
  };
});
