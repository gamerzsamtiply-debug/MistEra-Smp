import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { enableSystemNotifications, notificationPermission } from '../lib/notify';

const KEY = 'mistera-notify-asked';
const SNOOZE_MS = 7 * 86_400_000;

/** Asks, once per visit-week, whether to turn on device notifications. The browser only allows the real permission pop-up after a tap, so this is the tap. */
export default function NotifyPrompt() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (notificationPermission() !== 'default') return;
    let asked = 0;
    try { asked = Number(localStorage.getItem(KEY)) || 0; } catch { /* storage unavailable */ }
    if (asked && Date.now() - asked < SNOOZE_MS) return;
    const t = window.setTimeout(() => setShow(true), 3500);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  const close = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* storage unavailable */ } setShow(false); };
  const turnOn = async () => {
    const r = await enableSystemNotifications();
    if (r === 'denied') toast.error('Notifications are blocked', { description: 'Allow them for this site in your browser settings to get alerts.' });
    close();
  };
  return (
    <div role="dialog" aria-label="Turn on notifications" className="fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl sm:bottom-5 sm:left-auto sm:right-5 sm:mx-0">
      <button type="button" onClick={close} aria-label="Not now" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><Bell className="h-5 w-5" /></span>
        <div className="min-w-0 pr-5">
          <p className="text-sm font-semibold">Turn on notifications?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Get an alert on your device for new posts, videos, comments, and followers.</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={close}>Not now</Button>
        <Button size="sm" onClick={turnOn}>Turn on</Button>
      </div>
    </div>
  );
}
