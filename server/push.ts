import webpush from 'web-push';
import { db } from './db.js';
import { env } from './env.js';

/**
 * Real phone / browser push messages (they arrive even when the site is closed).
 * Needs three environment variables in Vercel: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 * (generate the keys once with `npx web-push generate-vapid-keys`). Without them every function here quietly does nothing.
 */
export interface PushPayload { title: string; body?: string; url?: string; tag?: string }
interface SubRow { id: string; endpoint: string; p256dh: string; auth: string; user_id: string | null }

let ready: boolean | null = null;
export const vapidPublicKey = (): string => env('VAPID_PUBLIC_KEY') ?? '';

function configure(): boolean {
  if (ready !== null) return ready;
  const pub = env('VAPID_PUBLIC_KEY');
  const priv = env('VAPID_PRIVATE_KEY');
  if (!pub || !priv) return (ready = false);
  try {
    webpush.setVapidDetails(env('VAPID_SUBJECT') ?? 'mailto:admin@example.com', pub, priv);
    return (ready = true);
  } catch (e) {
    console.error('[push] invalid VAPID keys:', e);
    return (ready = false);
  }
}

async function deliver(subs: SubRow[], payload: PushPayload): Promise<void> {
  if (!subs.length || !configure()) return;
  const body = JSON.stringify({ title: payload.title.slice(0, 120), body: (payload.body ?? '').slice(0, 200), url: payload.url ?? '/', tag: payload.tag });
  const dead: string[] = [];
  for (let i = 0; i < subs.length; i += 25) {
    await Promise.all(subs.slice(i, i + 25).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 86_400, urgency: 'normal' });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id); // the person removed the permission or uninstalled the app
        else console.error('[push] send failed:', code ?? e);
      }
    }));
  }
  if (dead.length) await db().from('push_subscriptions').delete().in('id', dead);
}

/** Push to every device of these signed-in users. Never throws: a push problem must not fail the action that caused it. */
export async function pushToUsers(userIds: string[], payload: PushPayload | ((userId: string) => PushPayload)): Promise<void> {
  try {
    if (!configure()) return;
    const ids = [...new Set(userIds.filter(Boolean))];
    for (let i = 0; i < ids.length; i += 100) {
      const r = await db().from('push_subscriptions').select('id,endpoint,p256dh,auth,user_id').in('user_id', ids.slice(i, i + 100));
      if (r.error) { console.error('[push] list failed (is migration 0010 applied?):', r.error); return; }
      const subs = (r.data ?? []) as SubRow[];
      if (typeof payload === 'function') {
        const byUser = new Map<string, SubRow[]>();
        for (const s of subs) if (s.user_id) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
        for (const [uid, list] of byUser) await deliver(list, payload(uid));
      } else {
        await deliver(subs, payload);
      }
    }
  } catch (e) {
    console.error('[push] pushToUsers threw:', e);
  }
}

/** Push to everyone who allowed notifications - signed in or guest - except the given user ids (they already got a personal one). */
export async function pushToAll(payload: PushPayload, excludeUserIds: string[] = []): Promise<void> {
  try {
    if (!configure()) return;
    const skip = new Set(excludeUserIds);
    for (let from = 0; from < 5000; from += 1000) {
      const r = await db().from('push_subscriptions').select('id,endpoint,p256dh,auth,user_id').order('created_at', { ascending: true }).range(from, from + 999);
      if (r.error) { console.error('[push] list failed (is migration 0010 applied?):', r.error); return; }
      const rows = ((r.data ?? []) as SubRow[]).filter((s) => !s.user_id || !skip.has(s.user_id));
      await deliver(rows, payload);
      if ((r.data ?? []).length < 1000) break;
    }
  } catch (e) {
    console.error('[push] pushToAll threw:', e);
  }
}
