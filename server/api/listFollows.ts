import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { profileOr404, publicUsers } from '../social.js';

// The people who follow a member, or the people a member follows.
export default optionalAuthEndpoint(z.object({ profileId: z.string().max(64), kind: z.enum(['followers', 'following']) }), async ({ input, user }) => {
  const p = await profileOr404(input.profileId);
  const col = input.kind === 'followers' ? 'following_id' : 'follower_id';
  const other = input.kind === 'followers' ? 'follower_id' : 'following_id';
  const r = await db().from('follows').select('follower_id,following_id,created_at').eq(col, p.user_id).order('created_at', { ascending: false }).limit(200);
  const ids = ((must(r, 'follows.list') ?? []) as Record<string, string>[]).map((x) => x[other]);
  const users = await publicUsers(ids);
  const mine = new Set<string>();
  if (user && ids.length) {
    const m = await db().from('follows').select('following_id').eq('follower_id', user.id).in('following_id', ids);
    for (const f of (must(m, 'follows.mine') ?? []) as { following_id: string }[]) mine.add(f.following_id);
  }
  return { people: ids.map((id) => users.get(id)).filter((u): u is NonNullable<typeof u> => !!u).map((u) => ({ id: u.id, username: u.username, avatarUrl: u.avatarUrl, role: u.role, isMe: user?.id === u.userId, following: mine.has(u.userId) })) };
});
