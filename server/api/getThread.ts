import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { ensureProfile, toPublicUser, siteOwnerUserId } from '../lib.js';
import { canMessage, profileOr404, requireVerified } from '../social.js';
import { messageOut, type MessageRow } from '../messages.js';

// One conversation (newest 150 messages, oldest first). Opening it marks the other person's messages as read.
export default authEndpoint(z.object({ profileId: z.string().max(64) }), async ({ input, user }) => {
  requireVerified(user);
  await ensureProfile(user);
  const other = await profileOr404(input.profileId);
  const [a, b] = await Promise.all([
    db().from('messages').select('*').eq('sender_id', user.id).eq('recipient_id', other.user_id).eq('sender_hidden', false).order('created_at', { ascending: false }).limit(150),
    db().from('messages').select('*').eq('sender_id', other.user_id).eq('recipient_id', user.id).eq('recipient_hidden', false).order('created_at', { ascending: false }).limit(150),
  ]);
  const all = [...((must(a, 'messages.sent') ?? []) as MessageRow[]), ...((must(b, 'messages.received') ?? []) as MessageRow[])]
    .sort((x, y) => String(x.created_at).localeCompare(String(y.created_at))).slice(-150);

  const unread = all.filter((m) => m.sender_id === other.user_id && !m.read_at).map((m) => m.id);
  if (unread.length) {
    const now = new Date().toISOString();
    await db().from('messages').update({ read_at: now }).in('id', unread);
    await db().from('notifications').update({ read_at: now }).eq('user_id', user.id).eq('actor_id', other.user_id).eq('type', 'message').is('read_at', null);
    for (const m of all) if (unread.includes(m.id)) m.read_at = now;
  }
  const ownerId = await siteOwnerUserId();
  return {
    with: toPublicUser(other, ownerId),
    canMessage: await canMessage(user.id, other.user_id),
    messages: await messageOut(all, user.id),
  };
});
