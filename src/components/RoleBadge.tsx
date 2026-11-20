import { Crown, Shield, Gavel, Code, Hammer, LifeBuoy, BadgeCheck, User } from 'lucide-react';
import { cn } from '@project/components/lib/utils';

const MAP: Record<string, { icon: typeof Crown; cls: string }> = {
  Owner: { icon: Crown, cls: 'text-amber-500' },
  Admin: { icon: Shield, cls: 'text-primary' },
  Moderator: { icon: Gavel, cls: 'text-primary' },
  Developer: { icon: Code, cls: 'text-primary' },
  Builder: { icon: Hammer, cls: 'text-primary' },
  Helper: { icon: LifeBuoy, cls: 'text-primary' },
  Staff: { icon: BadgeCheck, cls: 'text-primary' },
  Member: { icon: User, cls: 'text-muted-foreground' },
};

export default function RoleBadge({ role }: { role: string }) {
  const m = MAP[role] ?? MAP.Member;
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"><m.icon className={cn('h-3 w-3', m.cls)} />{role}</span>;
}
