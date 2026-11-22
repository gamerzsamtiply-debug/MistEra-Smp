import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CircleHelp, LogOut, User, ShieldCheck, LogIn, BookOpen, Users, Building2, Newspaper, History, MessageSquare, type LucideIcon } from 'lucide-react';
import { useAuth, loginWithRedirect, logout } from '@/lib/auth';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@project/components/ui/dropdown-menu';
import { useSite } from '../lib/site';
import { LOGO_MARK } from '../lib/brand';
import { UserAvatar } from './UserChip';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import SoundToggle from './SoundToggle';
import { sfx } from '../lib/sfx';

// Home and Album live in the bottom bar (BottomNav); everything else stays up here.
const LINKS: { to: string; label: string; short?: string; icon: LucideIcon }[] = [
  { to: '/information', label: 'Information', short: 'Info', icon: BookOpen }, { to: '/staff', label: 'Staff', icon: Users },
  { to: '/partners', label: 'Partners', icon: Building2 }, { to: '/announcements', label: 'Announcements', short: 'News', icon: Newspaper }, { to: '/updates', label: 'Updates', icon: History }, { to: '/feedback', label: 'Feedback', short: 'Feedback', icon: MessageSquare },
];

export function openHelp(url?: string) {
  if (!url) return toast.error('Help is unavailable', { description: 'The support ticket link has not been set up yet. Please ask in our Discord.' });
  window.open(url, '_blank', 'noopener,noreferrer');
}

function Brand({ label }: { label?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="MistEra SMP home">
      <img src={LOGO_MARK} alt="" width={36} height={36} className="logo-plate h-9 w-9 object-contain" />
      <span className={`font-display text-[15px] font-semibold tracking-tight ${label ? 'rail-label' : ''}`}>MISTERA SMP</span>
    </Link>
  );
}

function AccountMenu({ compact }: { compact?: boolean }) {
  const { user } = useAuth();
  const { me } = useSite();
  if (!user) {
    return (
      <button onClick={() => loginWithRedirect()} title="Login / Create Account" aria-label="Login / Create Account" className={compact ? 'rail-link' : 'mc-btn !h-9 !px-3'}>
        <LogIn className="h-4 w-4" /><span className={compact ? 'rail-label' : 'hidden sm:inline'}>Login / Create Account</span>
      </button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={compact ? 'rail-link' : 'rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'} aria-label="Account menu" title="Account">
        <UserAvatar username={me?.profile?.username || user.email || 'user'} avatarUrl={me?.profile?.avatarUrl} className="h-8 w-8 shrink-0" />
        {compact && <span className="rail-label truncate">@{me?.profile?.username ?? '...'}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">@{me?.profile?.username ?? '...'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/profile"><User className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
        {me?.isModerator && <DropdownMenuItem asChild><Link to="/admin"><ShieldCheck className="mr-2 h-4 w-4" />{me.isAdmin ? 'Admin Panel' : 'Moderation'}</Link></DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  const { me, settings } = useSite();
  const loc = useLocation();
  const chipsRef = useRef<HTMLElement>(null);
  // keep the current section's chip in view when the row is scrolled sideways
  useEffect(() => {
    chipsRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [loc.pathname]);

  return (
    <>
      {/* Laptops and desktops: YouTube-style sidebar (icon + small label, full labels on wide screens). Every section is always one click away. */}
      <aside className="rail" aria-label="Main">
        <div className="mb-4 flex h-10 w-full items-center justify-center min-[1360px]:justify-start min-[1360px]:px-2"><Brand label /></div>
        <nav className="flex w-full flex-col items-center gap-1 min-[1360px]:items-stretch" aria-label="Pages">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end title={l.label} aria-label={l.label} className="rail-link" onClick={() => sfx.tap()}><l.icon /><span className="rail-mini">{l.short ?? l.label}</span><span className="rail-label">{l.label}</span></NavLink>
          ))}
        </nav>
        <div className="mt-auto flex w-full flex-col items-center gap-1 min-[1360px]:items-stretch">
          <button onClick={() => openHelp(settings?.ticketUrl)} title="Help" aria-label="Help" className="rail-link"><CircleHelp /><span className="rail-mini">Help</span><span className="rail-label">Help</span></button>
          <div className="flex items-center justify-center gap-1 min-[1360px]:justify-start"><NotificationBell /><ThemeToggle /><SoundToggle /></div>
          <AccountMenu compact />
        </div>
      </aside>

      {/* Tablets and phones: top bar + a YouTube-style row of section chips (no hidden menu to open) */}
      <header className="topbar">
        <Brand label />
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
          <SoundToggle />
          <AccountMenu />
        </div>
      </header>
      <nav ref={chipsRef} className="chips" aria-label="Sections">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end className="chip" onClick={() => sfx.tap()}><l.icon />{l.label}</NavLink>
        ))}
        <button type="button" onClick={() => openHelp(settings?.ticketUrl)} className="chip"><CircleHelp />Help</button>
        {user && me?.isModerator && <NavLink to="/admin" className="chip"><ShieldCheck />{me.isAdmin ? 'Admin' : 'Moderation'}</NavLink>}
      </nav>
    </>
  );
}
