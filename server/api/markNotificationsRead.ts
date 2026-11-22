import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';

// Marks all of your notifications as read (what happens when you open the bell).
export default authEndpoint(z.object({}), async ({ user }) => {
  must(await db().from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null), 'notifications.markRead');
  return { ok: true };
});
