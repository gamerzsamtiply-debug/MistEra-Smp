import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { displayRole, isSiteOwnerId, siteOwnerUserId } from '../lib.js';
import type { ProfileRow } from '../types.js';

const PAGE = 30;

// Search or browse members ("Add friend" page). Optional login adds "do I follow them" to every row.
export default optionalAuthEndpoint(z.object({ q: z.string().max(40).optional(), offset: z.number().int().min(0).max(5000).optional() }), async ({ input, user }) => {
  const term = (input.q ?? '').trim().replace(/[%_\\,()]/g, ' ').replace(/\s+/g, ' ').trim();
  let q = db().from('profiles').select('*');
  if (term) q = q.ilike('username', `%${term}%`);
  const from = input.offset ?? 0;
  const rows = (must(await q.order('joined_at', { ascending: false }).range(from, from + PAGE), 'profiles.people') ?? []) as ProfileRow[];
  const page = rows.slice(0, PAGE);
  const ownerId = await siteOwnerUserId();
  const mine = new Set<string>();
  if (user && page.length) {
    const r = await db().from('follows').select('following_id').eq('follower_id', user.id).in('following_id', page.map((p) => p.user_id));
    for (const f of (must(r, 'follows.mine') ?? []) as { following_id: string }[]) mine.add(f.following_id);
  }
  return {
    people: page.map((p) => ({
      id: p.id, username: p.username ?? 'player', avatarUrl: p.avatar_url ?? '', bio: (p.bio ?? '').slice(0, 120),
      role: displayRole(p.role, isSiteOwnerId(p.user_id, ownerId)), isMe: user?.id === p.user_id, following: mine.has(p.user_id),
    })),
    hasMore: rows.length > PAGE,
  };
});
