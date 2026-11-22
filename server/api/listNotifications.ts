import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, mustOr } from '../db.js';
import { countRows, ensureProfile } from '../lib.js';
import { publicUsers } from '../social.js';

interface Row { id: string; actor_id: string | null; type: string; title: string | null; body: string | null; url: string | null; read_at: string | null; created_at: string | null }

// Your notifications (follows, messages, comments, new posts from people you follow), newest first.
export default authEndpoint(z.object({}), async ({ user }) => {
  await ensureProfile(user);
  const r = await db().from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(40);
  const rows = (mustOr(r, 'notifications.list', [] as Row[]) ?? []) as Row[];
  const users = await publicUsers(rows.map((n) => n.actor_id));
  const unread = await countRows('notifications', (q) => q.eq('user_id', user.id).is('read_at', null)).catch(() => 0);
  return {
    unread,
    notifications: rows.map((n) => {
      const a = n.actor_id ? users.get(n.actor_id) : undefined;
      return { id: n.id, type: n.type, title: n.title ?? '', body: n.body ?? '', url: n.url ?? '', read: !!n.read_at, createdAt: n.created_at ?? '', actor: a ? { id: a.id, username: a.username, avatarUrl: a.avatarUrl } : null };
    }),
  };
});
