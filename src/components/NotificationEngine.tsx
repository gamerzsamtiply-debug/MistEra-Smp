import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { getBadges, latestPosts, listNotifications } from '@/lib/api';
import { setNotifState, resetNotifState } from '../lib/notifStore';
import { notificationPermission, registerWorker, showSystemNotification, syncPushSubscription } from '../lib/notify';

const POST_KEY = 'mistera-sys-post';
const noteKey = (uid: string) => `mistera-sys-n:${uid}`;
const read = (k: string): string => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
const BADGE_MS = 15_000;
const POSTS_MS = 120_000;

/**
 * Invisible. Keeps the badges, the notification list and the new-post list fresh, and announces anything new:
 * as a device notification when the tab is in the background (or the app is closed to the tray on a phone),
 * as a small in-app toast when the person is looking at the site.
 */
export default function NotificationEngine() {
  const { user } = useAuth();
  const nav = useNavigate();
  const navRef = useRef(nav); navRef.current = nav;
  const uid = user?.id ?? '';

  // re-runs after login/logout so the phone's push subscription gets linked to the account
  useEffect(() => { if (notificationPermission() === 'granted') void registerWorker().then(() => syncPushSubscription()); }, [uid]);

  const announce = (title: string, body: string, url: string, tag: string) => {
    const looking = document.visibilityState === 'visible' && document.hasFocus();
    if (!looking) { void showSystemNotification({ title, body, url, tag }); return; }
    toast(title, { description: body || undefined, action: { label: 'Open', onClick: () => navRef.current(url) } });
  };

  // new announcements / updates (everyone, signed in or not)
  useEffect(() => {
    let alive = true;
    const run = () => {
      latestPosts({}).then((d) => {
        if (!alive) return;
        const posts = Array.isArray(d?.posts) ? d.posts : [];
        setNotifState({ posts });
        const t = (p: { publishedAt: string }) => (p.publishedAt ? new Date(p.publishedAt).getTime() : 0);
        const last = Number(read(POST_KEY)) || 0;
        const newest = posts.reduce((m, p) => Math.max(m, t(p)), 0);
        if (!last) { write(POST_KEY, String(newest || Date.now())); return; } // first visit: start from now
        const fresh = posts.filter((p) => t(p) > last).sort((a, b) => t(a) - t(b));
        if (fresh.length) {
          write(POST_KEY, String(newest));
          for (const p of fresh.slice(-2)) announce(p.kind === 'Announcement' ? 'New announcement' : 'New update', p.title, p.kind === 'Announcement' ? '/announcements' : '/updates', `post-${p.id}`);
        }
      }).catch(() => undefined);
    };
    run();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') run(); }, POSTS_MS);
    return () => { alive = false; window.clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // personal: followers, comments, posts from people you follow
  useEffect(() => {
    if (!uid) { resetNotifState(); return; }
    let alive = true;
    let lastCount = -1;
    const refreshList = async (first: boolean) => {
      const d = await listNotifications();
      if (!alive) return;
      setNotifState({ items: d.notifications, unread: d.unread });
      const stamp = (n: { createdAt: string }) => (n.createdAt ? new Date(n.createdAt).getTime() : 0);
      const newest = d.notifications.reduce((m, n) => Math.max(m, stamp(n)), 0);
      const last = Number(read(noteKey(uid))) || 0;
      if (first && !last) { write(noteKey(uid), String(newest)); return; } // never flood a brand-new browser with old items
      const fresh = d.notifications.filter((n) => !n.read && stamp(n) > last).sort((a, b) => stamp(a) - stamp(b));
      if (!fresh.length) return;
      write(noteKey(uid), String(newest));
      for (const n of fresh.slice(-3)) {
        announce(n.title, n.body, n.url || '/', `n-${n.id}`);
      }
    };
    const tick = async (first = false) => {
      try {
        const b = await getBadges();
        if (!alive) return;
        setNotifState({ unread: b.notifications });
        // fetch the list only when something changed (the badge call is the cheap one)
        if (first || b.notifications !== lastCount) await refreshList(first);
        lastCount = b.notifications;
      } catch { /* offline or signed out: try again next time */ }
    };
    void tick(true);
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void tick(); }, BADGE_MS);
    const vis = () => { if (document.visibilityState === 'visible') void tick(); };
    document.addEventListener('visibilitychange', vis);
    return () => { alive = false; window.clearInterval(id); document.removeEventListener('visibilitychange', vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  return null;
}
