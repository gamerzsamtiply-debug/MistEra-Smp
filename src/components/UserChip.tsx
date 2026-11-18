import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@project/components/ui/avatar';
import { cn } from '@project/components/lib/utils';

export function UserAvatar({ username, avatarUrl, className }: { username: string; avatarUrl?: string; className?: string }) {
  return (
    <Avatar className={cn('h-9 w-9 ring-2 ring-border', className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={username} className="object-cover" />}
      <AvatarFallback className="bg-primary/15 font-semibold text-primary">{username.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export default function UserChip({ user, size = 'sm' }: { user: { id: string; username: string; avatarUrl: string } | null; size?: 'sm' | 'md' }) {
  if (!user) return <span className="text-sm text-muted-foreground">Former member</span>;
  return (
    <Link to={`/u/${user.id}`} className="group inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <UserAvatar username={user.username} avatarUrl={user.avatarUrl} className={size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'} />
      <span className="text-sm font-medium group-hover:text-primary transition-colors">@{user.username}</span>
    </Link>
  );
}
