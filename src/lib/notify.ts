import { getPushConfig, savePushSubscription } from './api';
import { visitorId } from './visitor';

// System (device) notifications. They go through the service worker, which is the only way they work on phones.

export const systemNotificationsSupported = (): boolean => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
export const notificationPermission = (): NotificationPermission | 'unsupported' => (systemNotificationsSupported() ? Notification.permission : 'unsupported');

export async function registerWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/sw.js'); } catch { return null; }
}

/** Must be called from a click/tap (browsers refuse to ask otherwise). */
export async function enableSystemNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!systemNotificationsSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    await registerWorker();
    await syncPushSubscription();
    await showSystemNotification({ title: 'Notifications are on', body: 'You will see new posts, comments and followers here.', url: '/', tag: 'welcome' });
  }
  return result;
}

export async function showSystemNotification(n: { title: string; body?: string; url?: string; tag?: string }): Promise<void> {
  if (!systemNotificationsSupported() || Notification.permission !== 'granted') return;
  const opts: NotificationOptions = { body: n.body ?? '', icon: '/favicon-192x192.png', badge: '/favicon-48x48.png', tag: n.tag, data: { url: n.url ?? '/' } };
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerWorker());
    if (reg) { await reg.showNotification(n.title, opts); return; }
    new Notification(n.title, opts);
  } catch { /* a notification that cannot be shown is not worth an error */ }
}

const b64ToBytes = (b64: string): Uint8Array => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const bytesToB64Url = (buf: ArrayBuffer | null): string => {
  if (!buf) return '';
  let s = '';
  new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Makes sure this browser is subscribed to real push messages (they reach the phone even when the site is closed) and that the
 * server knows about it. Safe to call repeatedly: when the person logs in later, the same call links the subscription to their account.
 * Does nothing when permission is not granted or the server has no VAPID key yet.
 */
export async function syncPushSubscription(): Promise<void> {
  try {
    if (!systemNotificationsSupported() || !('PushManager' in window) || Notification.permission !== 'granted') return;
    const { publicKey } = await getPushConfig();
    if (!publicKey) return;
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerWorker());
    if (!reg) return;
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) }));
    await savePushSubscription({ endpoint: sub.endpoint, p256dh: bytesToB64Url(sub.getKey('p256dh')), auth: bytesToB64Url(sub.getKey('auth')), visitorId: visitorId() });
  } catch { /* push is a bonus: never break the page for it */ }
}
