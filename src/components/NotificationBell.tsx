import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, History, MessageSquare, Newspaper, UserPlus, Images } from 'lucide-react';
import { toast } from 'sonner';
import { markNotificationsRead, type AppNotification } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@project/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@project/components/ui/popover';
import { UserAvatar } from './UserChip';
import { fmtDate } from '../lib/format';
import { timeAgo } from '../lib/social';
import { getNotifState, setNotifState, useNotifState, type PostItem } from '../lib/notifStore';
import { enableSystemNotifications, notificationPermission } from '../lib/notify';

const KEY = 'mistera-notif-seen';
const readSeen = (): number => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };
const writeSeen = (t: number) => { try { localStorage.setItem(KEY, String(t)); } catch { /* storage unavailable */ } };
const time = (p: PostItem) => (p.publishedAt ? new Date(p.publishedAt).getTime() : 0);
const ICON: Record<AppNotification['type'], typeof Bell> = { follow: UserPlus, comment: MessageSquare, post: Images, like: Bell };

type Row = { key: string; at: number; fresh: boolean; to: string; icon: typeof Bell; head: string; title: string; actor?: AppNotification['actor'] };

/**
 * Bell with a badge. For everyone: new announcements/updates. When signed in it also lists your own notifications
 * (new followers, comments, posts from people you follow). The data is kept fresh by NotificationEngine.
 */
export default function NotificationBell() {
  const { user } = useAuth();
  const { items, posts, unread } = useNotifState();
  // first ever visit: start from "now" so a new visitor isn't greeted with a pile of unread items
  const [seen, setSeen] = useState<number>(() => { const s = readSeen(); if (s) return s; const t = Date.now(); writeSeen(t); return t; });
  const [perm, setPerm] = useState(notificationPermission);

  const freshPosts = posts.filter((p) => time(p) > seen).length;
  const count = (user ? unread : 0) + freshPosts;

  const rows: Row[] = [
    ...(user ? items.map((n): Row => ({ key: n.id, at: new Date(n.createdAt).getTime(), fresh: !n.read, to: n.url || '/', icon: ICON[n.type] ?? Bell, head: timeAgo(n.createdAt), title: n.title, actor: n.actor })) : []),
    ...posts.map((p): Row => ({ key: `p-${p.id}`, at: time(p), fresh: time(p) > seen, to: p.kind === 'Announcement' ? '/announcements' : '/updates', icon: p.kind === 'Announcement' ? Newspaper : History, head: `${p.kind} - ${fmtDate(p.publishedAt)}`, title: p.title })),
  ].sort((a, b) => b.at - a.at).slice(0, 40);

  const onOpen = (open: boolean) => {
    if (!open) return;
    const t = Date.now(); writeSeen(t); setSeen(t);
    if (user && getNotifState().unread > 0) markNotificationsRead().then(() => setNotifState({ unread: 0, items: getNotifState().items.map((n) => ({ ...n, read: true })) })).catch(() => undefined);
  };
  const turnOn = async () => {
    const r = await enableSystemNotifications();
    setPerm(notificationPermission());
    if (r === 'denied') toast.error('Notifications are blocked', { description: 'Allow them for this site in your browser settings.' });
  };

  return (
    <Popover onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative" aria-label={count ? `Notifications, ${count} new` : 'Notifications'}>
          <Bell className="h-5 w-5" />
          {count > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">{count > 9 ? '9+' : count}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="glass w-[min(20rem,calc(100vw-1.5rem))] p-0">
        <p className="border-b border-border px-4 py-3 text-sm font-semibold">Notifications</p>
        {perm === 'default' && (
          <button type="button" onClick={turnOn} className="flex w-full items-center gap-2 border-b border-border bg-primary/10 px-4 py-2.5 text-left text-xs font-medium text-primary hover:bg-primary/15"><BellRing className="h-4 w-4 shrink-0" />Turn on device notifications</button>
        )}
        {!rows.length ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing new yet.</p> : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {rows.map((r) => (
              <li key={r.key}>
                <Link to={r.to} className="flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/60">
                  {r.actor ? <UserAvatar username={r.actor.username} avatarUrl={r.actor.avatarUrl} className="h-8 w-8 shrink-0" /> : <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary"><r.icon className="h-4 w-4 text-primary" /></span>}
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">{r.head}{r.fresh && <span className="ml-2 font-semibold text-primary">New</span>}</span>
                    <span className="block truncate text-sm font-semibold">{r.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
