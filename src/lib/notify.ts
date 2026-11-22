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
    await showSystemNotification({ title: 'Notifications are on', body: 'You will see new posts, comments, followers and messages here.', url: '/', tag: 'welcome' });
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
