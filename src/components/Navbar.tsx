import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LifeBuoy, LogOut, User, ShieldCheck, LogIn } from 'lucide-react';
import { useAuth, loginWithRedirect, logout } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@project/components/ui/dropdown-menu';
import { cn } from '@project/components/lib/utils';
import { useSite } from '../lib/site';
import { LOGO_MARK } from '../lib/brand';
import { UserAvatar } from './UserChip';

const LINKS = [
  { to: '/', label: 'Home' }, { to: '/information', label: 'Information' }, { to: '/staff', label: 'Staff' },
  { to: '/partners', label: 'Partners' }, { to: '/announcements', label: 'Announcements' }, { to: '/updates', label: 'Updates' }, { to: '/album', label: 'Album' },
];

export function openHelp(url?: string) {
  if (!url) return toast.error('Help is unavailable', { description: 'The support ticket link has not been set up yet. Please ask in our Discord.' });
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function Navbar() {
  const { user } = useAuth();
  const { me, settings } = useSite();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 10); f(); window.addEventListener('scroll', f); return () => window.removeEventListener('scroll', f); }, []);

  return (
    <header className={cn('sticky top-0 z-50 transition-all', scrolled ? 'glass border-x-0 border-t-0 shadow-lg shadow-black/20' : 'bg-transparent')}>
      <nav className="container mx-auto flex h-16 items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <motion.img whileHover={{ rotate: -6, scale: 1.08 }} src={LOGO_MARK} alt="MistEra SMP" className="h-10 w-10 object-contain" />
          <span className="font-display text-lg font-black tracking-tight" style={{ fontStretch: '115%' }}>MISTERA <span className="text-accent">SMP</span></span>
        </Link>
        <div className="mx-auto hidden xl:flex items-center gap-1">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end className={({ isActive }) => cn('relative rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {({ isActive }) => <>{l.label}{isActive && <motion.span layoutId="nav-pill" className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary" />}</>}
            </NavLink>
          ))}
          <button onClick={() => openHelp(settings?.ticketUrl)} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"><LifeBuoy className="h-4 w-4" />Help</button>
        </div>
        <div className="ml-auto xl:ml-0 flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                <UserAvatar username={me?.profile.username || user.email} avatarUrl={me?.profile.avatarUrl} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">@{me?.profile.username ?? '…'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/profile"><User className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
                {me?.isAdmin && <DropdownMenuItem asChild><Link to="/admin"><ShieldCheck className="mr-2 h-4 w-4" />Admin Panel</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button onClick={() => loginWithRedirect()} className="mc-btn !h-9 !px-4 !text-xs hidden sm:inline-flex"><LogIn className="h-4 w-4" />Login / Create Account</button>
          )}
          <Button size="icon" variant="ghost" className="xl:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</Button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="xl:hidden overflow-hidden glass border-x-0">
            <div className="container mx-auto grid gap-1 px-4 py-4">
              {LINKS.map((l, i) => (
                <motion.div key={l.to} initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <NavLink to={l.to} end className={({ isActive }) => cn('block rounded-lg px-3 py-2.5 font-medium', isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground')}>{l.label}</NavLink>
                </motion.div>
              ))}
              <button onClick={() => openHelp(settings?.ticketUrl)} className="rounded-lg px-3 py-2.5 text-left font-medium text-muted-foreground">Help</button>
              {user ? (
                <>
                  <NavLink to="/profile" className="rounded-lg px-3 py-2.5 font-medium text-muted-foreground">Profile</NavLink>
                  {me?.isAdmin && <NavLink to="/admin" className="rounded-lg px-3 py-2.5 font-medium text-muted-foreground">Admin Panel</NavLink>}
                </>
              ) : <Button className="mt-2" onClick={() => loginWithRedirect()}>Login / Create Account</Button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
