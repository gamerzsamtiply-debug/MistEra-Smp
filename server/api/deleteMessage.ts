import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { findRow } from '../lib.js';
import { MESSAGE_BUCKET, requireVerified } from '../social.js';
import type { MessageRow } from '../messages.js';

// "me": hides the message from your side only. "everyone": only the sender can do this; the text and file are
// erased for both people and the chat shows "This message was deleted".
export default authEndpoint(z.object({ id: z.string().max(64), scope: z.enum(['me', 'everyone']) }), async ({ input, user }) => {
  requireVerified(user);
  const m = await findRow<MessageRow>('messages', input.id);
  const sender = m?.sender_id === user.id;
  const recipient = m?.recipient_id === user.id;
  if (!m || (!sender && !recipient)) throw fail('NOT_FOUND', 'That message no longer exists.');
  if (input.scope === 'everyone') {
    if (!sender) throw fail('FORBIDDEN', 'You can only delete your own messages for everyone.');
    if (m.deleted_at) return { ok: true };
    must(await db().from('messages').update({ deleted_at: new Date().toISOString(), body: '', attachment_path: '', attachment_name: '', attachment_type: '', attachment_size: 0 }).eq('id', m.id), 'messages.deleteForEveryone');
    if (m.attachment_path) {
      try { await db().storage.from(MESSAGE_BUCKET).remove([m.attachment_path]); } catch (e) { console.error('[storage] remove failed:', e); }
    }
    return { ok: true };
  }
  must(await db().from('messages').update(sender ? { sender_hidden: true } : { recipient_hidden: true }).eq('id', m.id), 'messages.deleteForMe');
  return { ok: true };
});
