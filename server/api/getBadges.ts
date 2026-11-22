import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { countRows } from '../lib.js';

// Tiny, cheap call the app repeats every few seconds: how many unread notifications you have.
export default authEndpoint(z.object({}), async ({ user }) => {
  const notifications = await countRows('notifications', (q) => q.eq('user_id', user.id).is('read_at', null)).catch(() => 0);
  return { notifications };
});
