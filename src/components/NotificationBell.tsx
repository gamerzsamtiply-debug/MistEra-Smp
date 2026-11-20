import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Megaphone, Sparkles } from 'lucide-react';
import { latestPosts } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@project/components/ui/popover';
import { fmtDate } from '../lib/format';

type Item = Awaited<ReturnType<typeof latestPosts>>['posts'][number];
const KEY = 'mistera-notif-seen';
const POLL_MS = 120_000;

const readSeen = (): number => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };
const writeSeen = (t: number) => { try { localStorage.setItem(KEY, String(t)); } catch { /* storage unavailable */ } };
const time = (p: Item) => (p.publishedAt ? new Date(p.publishedAt).getTime() : 0);

/**
 * Bell with a badge. New announcements/updates (anything published after the visitor last opened the bell) count as unread.
 * "Seen" is kept in this browser, so it works for visitors without an account too.
 */
export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [seen, setSeen] = useState<number>(readSeen);

  const load = useCallback(() => {
    latestPosts({}).then((d) => {
      setItems(d.posts);
      // first ever visit: start from "now" so a new visitor isn't greeted with 15 unread items
      if (!localStorage.getItem(KEY)) { const t = Date.now(); writeSeen(t); setSeen(t); }
    }).catch(() => undefined); // the bell is optional: a failed refresh must never break the page
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const unread = items.filter((p) => time(p) > seen).length;
  const onOpen = (open: boolean) => { if (open) { const t = Date.now(); writeSeen(t); setSeen(t); } };

  return (
    <Popover onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative" aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}>
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">{unread > 9 ? '9+' : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="glass w-80 p-0">
        <p className="border-b border-border px-4 py-3 text-sm font-semibold">Notifications</p>
        {!items.length ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing new yet.</p> : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {items.map((p) => {
              const Icon = p.kind === 'Announcement' ? Megaphone : Sparkles;
              const fresh = time(p) > seen;
              return (
                <li key={p.id}>
                  <Link to={p.kind === 'Announcement' ? '/announcements' : '/updates'} className="flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/60">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary"><Icon className="h-4 w-4 text-primary" /></span>
                    <span className="min-w-0">
                      <span className="block text-xs text-muted-foreground">{p.kind} - {fmtDate(p.publishedAt)}{fresh && <span className="ml-2 font-semibold text-primary">New</span>}</span>
                      <span className="block truncate text-sm font-semibold">{p.title}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
