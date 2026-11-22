import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { findRow } from '../lib.js';
import { enforceRateLimit } from '../ratelimit.js';
import { requireVerified } from '../social.js';
import type { MessageRow } from '../messages.js';

// Edit the text of your own message. The chat then shows "edited" next to it.
export default authEndpoint(z.object({ id: z.string().max(64), body: z.string().max(4000) }), async ({ input, user }) => {
  requireVerified(user);
  await enforceRateLimit('editMessage', user.id, 120, 3600, 'You are editing too quickly. Please try again in a little while.');
  const m = await findRow<MessageRow>('messages', input.id);
  if (!m || m.sender_id !== user.id || m.sender_hidden) throw fail('NOT_FOUND', 'That message no longer exists.');
  if (m.deleted_at) throw fail('BAD_REQUEST', 'A deleted message cannot be edited.');
  const body = input.body.trim();
  if (body.length > 2000) throw fail('BAD_REQUEST', 'Messages can be up to 2000 characters.');
  if (!body && !m.attachment_path) throw fail('BAD_REQUEST', 'A message cannot be empty. Delete it instead.');
  if (body === (m.body ?? '')) return { ok: true, edited: !!m.edited_at };
  must(await db().from('messages').update({ body, edited_at: new Date().toISOString() }).eq('id', m.id), 'messages.edit');
  return { ok: true, edited: true };
});
