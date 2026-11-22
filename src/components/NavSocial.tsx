import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, UserPlus } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useNotifState } from '../lib/notifStore';
import { sfx } from '../lib/sfx';

const Badge = ({ n }: { n: number }) => (n > 0 ? <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">{n > 9 ? '9+' : n}</span> : null);

/**
 * Inbox (with unread count) and Add friend (search / browse members) - the two options that sit beside the bell.
 * `rail` draws them as sidebar entries on laptops; otherwise as icon buttons in the top bar on phones and tablets.
 */
export default function NavSocial({ rail }: { rail?: boolean }) {
  const { user } = useAuth();
  const { messages } = useNotifState();
  const { pathname } = useLocation();
  const onInbox = pathname.startsWith('/inbox');
  const onPeople = pathname === '/people';
  const inboxTo = user ? '/inbox' : `/login?next=${encodeURIComponent('/inbox')}`;
  const unread = user ? messages : 0;

  if (rail) {
    return (
      <>
        <Link to="/people" title="Add friend" aria-label="Add friend" aria-current={onPeople ? 'page' : undefined} className="rail-link" onClick={() => sfx.tap()}><UserPlus /><span className="rail-mini">Friends</span><span className="rail-label">Add friend</span></Link>
        <Link to={inboxTo} title="Inbox" aria-label={unread ? `Inbox, ${unread} unread` : 'Inbox'} aria-current={onInbox ? 'page' : undefined} className="rail-link relative" onClick={() => sfx.tap()}>
          <MessageCircle /><span className="rail-mini">Inbox</span><span className="rail-label">Inbox</span>
          {unread > 0 && <span className="absolute right-1.5 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground min-[1360px]:static min-[1360px]:ml-auto">{unread > 9 ? '9+' : unread}</span>}
        </Link>
      </>
    );
  }
  return (
    <>
      <Button asChild size="icon" variant="ghost" className="relative" title="Add friend">
        <Link to="/people" aria-label="Add friend: search or browse members" aria-current={onPeople ? 'page' : undefined} onClick={() => sfx.tap()}><UserPlus className={`h-5 w-5 ${onPeople ? 'text-primary' : ''}`} /></Link>
      </Button>
      <Button asChild size="icon" variant="ghost" className="relative" title="Inbox">
        <Link to={inboxTo} aria-label={unread ? `Inbox, ${unread} unread` : 'Inbox'} aria-current={onInbox ? 'page' : undefined} onClick={() => sfx.tap()}>
          <MessageCircle className={`h-5 w-5 ${onInbox ? 'text-primary' : ''}`} /><Badge n={unread} />
        </Link>
      </Button>
    </>
  );
}
