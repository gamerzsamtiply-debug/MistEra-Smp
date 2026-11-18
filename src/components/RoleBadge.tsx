import { Crown, Shield, Gavel, Code, Hammer, LifeBuoy, BadgeCheck, User } from 'lucide-react';
import { cn } from '@project/components/lib/utils';

const MAP: Record<string, { icon: typeof Crown; cls: string }> = {
  Owner: { icon: Crown, cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  Admin: { icon: Shield, cls: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30' },
  Moderator: { icon: Gavel, cls: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30' },
  Developer: { icon: Code, cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  Builder: { icon: Hammer, cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  Helper: { icon: LifeBuoy, cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30' },
  Staff: { icon: BadgeCheck, cls: 'bg-primary/10 text-primary border-primary/30' },
  Member: { icon: User, cls: 'bg-secondary text-muted-foreground border-border' },
};

export default function RoleBadge({ role }: { role: string }) {
  const m = MAP[role] ?? MAP.Member;
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', m.cls)}><m.icon className="h-3 w-3" />{role}</span>;
}
