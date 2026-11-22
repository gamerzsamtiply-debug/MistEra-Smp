import { db, must, mustOr, isUuid } from './db.js';
import { fail } from './errors.js';
import { toPublicUser, siteOwnerUserId } from './lib.js';
import type { AuthUser } from './auth.js';
import type { ProfileRow, PublicUser } from './types.js';

export type NotificationType = 'follow' | 'message' | 'comment' | 'post' | 'like';

/** Social features (follow, inbox) need a verified e-mail address. Google accounts are always verified. */
export function requireVerified(u: AuthUser): void {
  if (!u.emailVerified) throw fail('FORBIDDEN', 'Please confirm your Gmail address first (check your inbox for the confirmation link).');
}

export async function profileByUserId(userId: string): Promise<ProfileRow | null> {
  if (!isUuid(userId)) return null;
  const r = await db().from('profiles').select('*').eq('user_id', userId).maybeSingle();
  return must(r, 'profiles.byUserId') as ProfileRow | null;
}

/** A profile row by its PUBLIC profile id (what the website puts in /u/:id), or a 404. */
export async function profileOr404(profileId: string): Promise<ProfileRow> {
  if (!isUuid(profileId)) throw fail('NOT_FOUND', "That member doesn't exist.");
  const r = await db().from('profiles').select('*').eq('id', profileId).maybeSingle();
  const p = must(r, 'profiles.byId') as ProfileRow | null;
  if (!p) throw fail('NOT_FOUND', "That member doesn't exist.");
  return p;
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const r = await db().from('follows').select('follower_id').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle();
  return !!mustOr(r, 'follows.isFollowing', null as { follower_id: string } | null);
}

/** Who may start / continue a chat: the sender follows the recipient, OR the recipient already wrote to the sender (so replies always work). */
export async function canMessage(senderId: string, recipientId: string): Promise<boolean> {
  if (await isFollowing(senderId, recipientId)) return true;
  const r = await db().from('messages').select('id').eq('sender_id', recipientId).eq('recipient_id', senderId).limit(1);
  return (mustOr(r, 'messages.hasReply', [] as { id: string }[]) ?? []).length > 0;
}

export interface NewNotification {
  userId: string;
  actorId: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  url?: string;
}

/** Notifications are a courtesy: a failure to write one must never fail the action that caused it. */
export async function notify(items: NewNotification[]): Promise<void> {
  const rows = items.filter((n) => n.userId && n.userId !== n.actorId).map((n) => ({
    user_id: n.userId, actor_id: n.actorId, type: n.type, title: n.title.slice(0, 160), body: (n.body ?? '').slice(0, 240), url: (n.url ?? '').slice(0, 300),
  }));
  if (!rows.length) return;
  try {
    for (let i = 0; i < rows.length; i += 200) {
      const r = await db().from('notifications').insert(rows.slice(i, i + 200));
      if (r.error) console.error('[db] notifications.insert:', r.error);
    }
  } catch (e) {
    console.error('[db] notifications.insert threw:', e);
  }
}

/** Public card for many auth user ids at once. */
export async function publicUsers(userIds: (string | null)[]): Promise<Map<string, PublicUser & { userId: string }>> {
  const m = new Map<string, PublicUser & { userId: string }>();
  const ids = [...new Set(userIds.filter((x): x is string => !!x))];
  if (!ids.length) return m;
  const ownerId = await siteOwnerUserId();
  for (let i = 0; i < ids.length; i += 200) {
    const r = await db().from('profiles').select('*').in('user_id', ids.slice(i, i + 200));
    for (const p of (mustOr(r, 'profiles.publicUsers', [] as ProfileRow[]) ?? []) as ProfileRow[]) m.set(p.user_id, { ...toPublicUser(p, ownerId), userId: p.user_id });
  }
  return m;
}

export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export const MESSAGE_BUCKET = 'message-files';
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
/** What may be sent as a file. The bucket enforces the same list; this gives a friendly error first. */
export const ATTACHMENT_TYPES: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'application/pdf': 'pdf', 'text/plain': 'txt', 'application/zip': 'zip', 'application/x-zip-compressed': 'zip',
  'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/webm': 'weba', 'video/mp4': 'mp4', 'video/webm': 'webm',
};

/** A display-safe file name (no paths, no control characters). */
export const safeFileName = (n: string) => n.replace(/[\u0000-\u001f\u007f\\/:*?"<>|]+/g, '_').trim().slice(0, 120) || 'file';
