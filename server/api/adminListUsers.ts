import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, selectAll } from '../db.js';
import { isOwnerUser, requireAdmin } from '../lib.js';
import type { ProfileRow } from '../types.js';

// Lists registered users and their roles for admins
export default authEndpoint(z.object({}), async ({ user }) => {
  const me = await requireAdmin(user);
  const primary = isOwnerUser(user, me.role);
  const rows = await selectAll<ProfileRow>((from, to) => db().from('profiles').select('*').order('joined_at', { ascending: false }).range(from, to), 2000, 'profiles.adminList');
  return { users: rows.map((p) => ({ id: p.id, username: p.username ?? '', avatarUrl: p.avatar_url ?? '', role: p.role ?? 'Member', locked: p.role === 'Owner' && (!primary || p.id === me.id), joinedAt: p.joined_at ?? '' })) };
});
