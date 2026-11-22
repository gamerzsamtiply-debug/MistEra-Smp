import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { ensureProfile, countRows } from '../lib.js';
import { enforceRateLimit } from '../ratelimit.js';
import { isFollowing, notify, profileOr404, requireVerified } from '../social.js';

// Follow / unfollow a member. Returns the new state and their follower count.
export default authEndpoint(z.object({ profileId: z.string().max(64) }), async ({ input, user }) => {
  requireVerified(user);
  const me = await ensureProfile(user);
  const target = await profileOr404(input.profileId);
  if (target.user_id === user.id) throw fail('BAD_REQUEST', "You can't follow yourself.");
  await enforceRateLimit('follow', user.id, 120, 3600, 'You are following people too quickly. Please try again in a little while.');
  const already = await isFollowing(user.id, target.user_id);
  if (already) {
    must(await db().from('follows').delete().eq('follower_id', user.id).eq('following_id', target.user_id), 'follows.delete');
  } else {
    must(await db().from('follows').insert({ follower_id: user.id, following_id: target.user_id }), 'follows.insert');
    await notify([{ userId: target.user_id, actorId: user.id, type: 'follow', title: `@${me.username ?? 'Someone'} started following you`, url: `/u/${me.id}` }]);
  }
  const followers = await countRows('follows', (q) => q.eq('following_id', target.user_id));
  return { following: !already, followers };
});
