import { Crown, Shield, Gavel, BadgeCheck, User } from 'lucide-react';
import { cn } from '@project/components/lib/utils';

const MAP: Record<string, { icon: typeof Crown; cls: string }> = {
  Owner: { icon: Crown, cls: 'bg-accent/15 text-accent border-accent/30' },
  Admin: { icon: Shield, cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  Moderator: { icon: Gavel, cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  Staff: { icon: BadgeCheck, cls: 'bg-primary/15 text-primary border-primary/30' },
  Member: { icon: User, cls: 'bg-secondary text-muted-foreground border-border' },
};

export default function RoleBadge({ role }: { role: string }) {
  const m = MAP[role] ?? MAP.Member;
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', m.cls)}><m.icon className="h-3 w-3" />{role}</span>;
}
