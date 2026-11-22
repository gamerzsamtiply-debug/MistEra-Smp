import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, mustOr } from '../db.js';
import { ensureProfile } from '../lib.js';
import { clip, publicUsers, requireVerified } from '../social.js';
import type { MessageRow } from '../messages.js';

// The inbox: one row per person you have chatted with, newest first, with unread counts.
export default authEndpoint(z.object({}), async ({ user }) => {
  requireVerified(user);
  await ensureProfile(user);
  const [inc, out] = await Promise.all([
    db().from('messages').select('*').eq('recipient_id', user.id).eq('recipient_hidden', false).order('created_at', { ascending: false }).limit(500),
    db().from('messages').select('*').eq('sender_id', user.id).eq('sender_hidden', false).order('created_at', { ascending: false }).limit(500),
  ]);
  const rows = [...(mustOr(inc, 'messages.inbox.in', [] as MessageRow[]) ?? []), ...(mustOr(out, 'messages.inbox.out', [] as MessageRow[]) ?? [])] as MessageRow[];
  const convo = new Map<string, { last: MessageRow; unread: number }>();
  for (const m of rows) {
    const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
    const c = convo.get(other) ?? { last: m, unread: 0 };
    if (String(m.created_at) > String(c.last.created_at)) c.last = m;
    if (m.recipient_id === user.id && !m.read_at && !m.deleted_at) c.unread += 1;
    convo.set(other, c);
  }
  const users = await publicUsers([...convo.keys()]);
  const conversations = [...convo.entries()]
    .filter(([id]) => users.has(id))
    .sort((a, b) => String(b[1].last.created_at).localeCompare(String(a[1].last.created_at)))
    .map(([id, c]) => {
      const u = users.get(id)!;
      const m = c.last;
      const preview = m.deleted_at ? 'Message deleted' : m.body ? clip(m.body, 90) : m.attachment_type?.startsWith('image/') ? 'Photo' : `File: ${m.attachment_name ?? ''}`;
      return { user: { id: u.id, username: u.username, avatarUrl: u.avatarUrl, role: u.role }, preview, mine: m.sender_id === user.id, at: m.created_at ?? '', unread: c.unread };
    });
  return { conversations };
});
