import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { countRows } from '../lib.js';

// Tiny, cheap call the app repeats every few seconds: how many unread messages / notifications you have.
export default authEndpoint(z.object({}), async ({ user }) => {
  const [messages, notifications] = await Promise.all([
    countRows('messages', (q) => q.eq('recipient_id', user.id).eq('recipient_hidden', false).is('read_at', null).is('deleted_at', null)).catch(() => 0),
    countRows('notifications', (q) => q.eq('user_id', user.id).is('read_at', null)).catch(() => 0),
  ]);
  return { messages, notifications };
});
