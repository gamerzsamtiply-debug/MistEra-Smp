import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Images, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSite } from '../lib/site';
import { UserAvatar } from './UserChip';
import { sfx } from '../lib/sfx';
import { cn } from '@project/components/lib/utils';

/**
 * Pinterest-style floating bar at the bottom of every page: Home, Album (where Pinterest has Search) and Profile.
 * Tapping Profile while signed out takes the visitor to the login page and back to their profile afterwards.
 */
export default function BottomNav() {
  const { user } = useAuth();
  const { me } = useSite();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const onHome = pathname === '/';
  const onAlbum = pathname === '/album' || pathname.startsWith('/album/');
  const onProfile = pathname === '/profile';
  const item = 'bnav-item';
  return (
    <nav className="bnav" aria-label="Main navigation">
      <Link to="/" className={cn(item, onHome && 'is-on')} aria-label="Home" aria-current={onHome ? 'page' : undefined} onClick={() => sfx.tap()}>
        <Home className={cn('h-6 w-6', onHome && 'fill-current')} />
      </Link>
      <Link to="/album" className={cn(item, onAlbum && 'is-on')} aria-label="Album" aria-current={onAlbum ? 'page' : undefined} onClick={() => sfx.tap()}>
        <Images className={cn('h-6 w-6', onAlbum && 'fill-current')} />
      </Link>
      {user ? (
        <Link to="/profile" className={cn(item, onProfile && 'is-on')} aria-label="Profile" aria-current={onProfile ? 'page' : undefined} onClick={() => sfx.tap()}>
          <UserAvatar username={me?.profile?.username || user.email || 'user'} avatarUrl={me?.profile?.avatarUrl} className={cn('h-8 w-8 ring-2', onProfile ? 'ring-foreground' : 'ring-transparent')} />
        </Link>
      ) : (
        <button type="button" className={item} aria-label="Log in to see your profile" onClick={() => { sfx.tap(); nav(`/login?next=${encodeURIComponent('/profile')}`); }}>
          <User className="h-6 w-6" />
        </button>
      )}
    </nav>
  );
}
