import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must, isUniqueViolation } from '../db.js';
import { fail } from '../errors.js';
import { countRows, ensureProfile, findRow } from '../lib.js';
import { enforceRateLimit } from '../ratelimit.js';
import type { AlbumRow } from '../types.js';

// Likes or un-likes an approved album post for the signed-in user
export default authEndpoint(z.object({ id: z.string().max(64) }), async ({ input, user }) => {
  await ensureProfile(user);
  await enforceRateLimit('albumLike', user.id, 200, 3600, 'You are liking too quickly. Please slow down.');
  const post = await findRow<AlbumRow>('album_submissions', input.id);
  if (!post || post.status !== 'Approved') throw fail('NOT_FOUND', 'That post is no longer available.');
  const existing = must(await db().from('album_likes').select('submission_id').eq('submission_id', post.id).eq('user_id', user.id).maybeSingle(), 'album_likes.find');
  let liked: boolean;
  if (existing) {
    must(await db().from('album_likes').delete().eq('submission_id', post.id).eq('user_id', user.id), 'album_likes.delete');
    liked = false;
  } else {
    const r = await db().from('album_likes').insert({ submission_id: post.id, user_id: user.id });
    if (r.error && !isUniqueViolation(r.error)) must(r, 'album_likes.insert');
    liked = true;
  }
  const likes = await countRows('album_likes', (q) => q.eq('submission_id', post.id));
  return { liked, likes };
});
