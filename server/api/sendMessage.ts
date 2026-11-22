import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must, mustOr } from '../db.js';
import { fail } from '../errors.js';
import { ensureProfile } from '../lib.js';
import { enforceRateLimit } from '../ratelimit.js';
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, canMessage, clip, notify, profileOr404, requireVerified, safeFileName } from '../social.js';
import { messageOut, type MessageRow } from '../messages.js';

const attachment = z.object({ path: z.string().max(300), name: z.string().max(200), type: z.string().max(120), size: z.number() });

// Sends a message (text and/or one attachment). Allowed when you follow the member, or when they already wrote to you.
export default authEndpoint(z.object({ profileId: z.string().max(64), body: z.string().max(4000).optional(), attachment: attachment.optional() }), async ({ input, user }) => {
  requireVerified(user);
  const me = await ensureProfile(user);
  const to = await profileOr404(input.profileId);
  if (to.user_id === user.id) throw fail('BAD_REQUEST', "You can't message yourself.");
  await enforceRateLimit('sendMessage', user.id, 150, 3600, 'You are sending messages too quickly. Please slow down a little.');
  if (!(await canMessage(user.id, to.user_id))) throw fail('FORBIDDEN', `Follow @${to.username ?? 'this member'} first to send them a message.`);

  const body = (input.body ?? '').trim();
  if (body.length > 2000) throw fail('BAD_REQUEST', 'Messages can be up to 2000 characters.');
  const a = input.attachment;
  if (!body && !a) throw fail('BAD_REQUEST', 'Write a message or attach a file first.');
  let file = { path: '', name: '', type: '', size: 0 };
  if (a) {
    // the file must be one this user just uploaded into their own folder, and of an allowed kind
    if (!a.path.startsWith(`${user.id}/`) || a.path.includes('..') || !ATTACHMENT_TYPES[a.type] || !Number.isFinite(a.size) || a.size <= 0 || a.size > ATTACHMENT_MAX_BYTES) throw fail('BAD_REQUEST', 'That attachment is not valid. Please attach it again.');
    file = { path: a.path, name: safeFileName(a.name), type: a.type, size: Math.round(a.size) };
  }
  const row = must(await db().from('messages').insert({
    sender_id: user.id, recipient_id: to.user_id, body, attachment_path: file.path, attachment_name: file.name, attachment_type: file.type, attachment_size: file.size,
  }).select('*').single(), 'messages.insert') as MessageRow;

  // One unread "new message" notification per sender (it is refreshed, not stacked, while it stays unread).
  const preview = body ? clip(body, 120) : `Sent ${file.type.startsWith('image/') ? 'a photo' : 'a file'}`;
  const note = { title: `@${me.username ?? 'Someone'} sent you a message`, body: preview, url: `/inbox/${me.id}` };
  const ex = mustOr(await db().from('notifications').select('id').eq('user_id', to.user_id).eq('actor_id', user.id).eq('type', 'message').is('read_at', null).limit(1), 'notifications.findUnreadMessage', [] as { id: string }[]) ?? [];
  if (ex.length) await db().from('notifications').update({ ...note, created_at: new Date().toISOString() }).eq('id', ex[0].id);
  else await notify([{ userId: to.user_id, actorId: user.id, type: 'message', ...note }]);

  return { message: (await messageOut([row], user.id))[0] };
});
