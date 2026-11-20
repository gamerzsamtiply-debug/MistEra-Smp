import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, LifeBuoy, LogOut, User, ShieldCheck, LogIn, Home, BookOpen, Users, Handshake, Megaphone, Sparkles, Images, type LucideIcon } from 'lucide-react';
import { useAuth, loginWithRedirect, logout } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@project/components/ui/dropdown-menu';
import { useSite } from '../lib/site';
import { LOGO_MARK } from '../lib/brand';
import { UserAvatar } from './UserChip';
import ThemeToggle from './ThemeToggle';

const LINKS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: Home }, { to: '/information', label: 'Information', icon: BookOpen }, { to: '/staff', label: 'Staff', icon: Users },
  { to: '/partners', label: 'Partners', icon: Handshake }, { to: '/announcements', label: 'Announcements', icon: Megaphone }, { to: '/updates', label: 'Updates', icon: Sparkles }, { to: '/album', label: 'Album', icon: Images },
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
        <UserAvatar username={me?.profile.username || user.email} avatarUrl={me?.profile.avatarUrl} className="h-8 w-8 shrink-0" />
        {compact && <span className="rail-label truncate">@{me?.profile.username ?? '...'}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">@{me?.profile.username ?? '...'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/profile"><User className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
        {me?.isAdmin && <DropdownMenuItem asChild><Link to="/admin"><ShieldCheck className="mr-2 h-4 w-4" />Admin Panel</Link></DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()}><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Navbar() {
  const { user } = useAuth();
  const { me, settings } = useSite();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <>
      {/* Laptops and desktops: compact icon rail (labels appear on wide screens) */}
      <aside className="rail" aria-label="Main">
        <div className="mb-4 flex h-10 w-full items-center justify-center min-[1360px]:justify-start min-[1360px]:px-2"><Brand label /></div>
        <nav className="flex w-full flex-col items-center gap-1 min-[1360px]:items-stretch" aria-label="Pages">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end title={l.label} aria-label={l.label} className="rail-link"><l.icon /><span className="rail-label">{l.label}</span></NavLink>
          ))}
        </nav>
        <div className="mt-auto flex w-full flex-col items-center gap-1 min-[1360px]:items-stretch">
          <button onClick={() => openHelp(settings?.ticketUrl)} title="Help" aria-label="Help" className="rail-link"><LifeBuoy /><span className="rail-label">Help</span></button>
          <div className="flex items-center justify-center min-[1360px]:justify-start"><ThemeToggle /></div>
          <AccountMenu compact />
        </div>
      </aside>

      {/* Tablets and phones: compact top bar with a menu panel */}
      <header className="topbar">
        <Brand label />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <AccountMenu />
          <Button size="icon" variant="ghost" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X /> : <Menu />}</Button>
        </div>
      </header>
      {open && (
        <div className="drawer">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end className="rail-link"><l.icon /><span>{l.label}</span></NavLink>
          ))}
          <button onClick={() => openHelp(settings?.ticketUrl)} className="rail-link"><LifeBuoy /><span>Help</span></button>
          {user && <NavLink to="/profile" className="rail-link"><User /><span>Profile</span></NavLink>}
          {user && me?.isAdmin && <NavLink to="/admin" className="rail-link"><ShieldCheck /><span>Admin Panel</span></NavLink>}
        </div>
      )}
    </>
  );
}
