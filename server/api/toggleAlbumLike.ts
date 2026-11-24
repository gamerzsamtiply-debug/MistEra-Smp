import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { db, must, isUniqueViolation } from '../db.js';
import { fail } from '../errors.js';
import { countRows, ensureProfile, findRow } from '../lib.js';
import { enforceRateLimit } from '../ratelimit.js';
import { requireGuestKey } from '../guest.js';
import type { AlbumRow } from '../types.js';

// Likes or un-likes an approved album post. Signed-in members like as themselves; guests like with their anonymous browser id.
export default optionalAuthEndpoint(z.object({ id: z.string().max(64), visitorId: z.string().max(64).optional() }), async ({ input, user, ip }) => {
  const guestKey = user ? null : requireGuestKey(input.visitorId);
  if (user) await ensureProfile(user);
  await enforceRateLimit('albumLike', user ? user.id : `${ip}|${guestKey}`, user ? 200 : 60, 3600, 'You are liking too quickly. Please slow down.');
  const post = await findRow<AlbumRow>('album_submissions', input.id);
  if (!post || post.status !== 'Approved') throw fail('NOT_FOUND', 'That post is no longer available.');
  const who = (q: any) => (user ? q.eq('user_id', user.id) : q.eq('guest_key', guestKey));
  const existing = must(await who(db().from('album_likes').select('submission_id').eq('submission_id', post.id)).maybeSingle(), 'album_likes.find');
  let liked: boolean;
  if (existing) {
    must(await who(db().from('album_likes').delete().eq('submission_id', post.id)), 'album_likes.delete');
    liked = false;
  } else {
    const r = await db().from('album_likes').insert({ submission_id: post.id, user_id: user ? user.id : null, guest_key: guestKey });
    if (r.error && !isUniqueViolation(r.error)) must(r, 'album_likes.insert');
    liked = true;
  }
  const likes = await countRows('album_likes', (q) => q.eq('submission_id', post.id));
  return { liked, likes };
});
