import { Users, Shield, Handshake, Images, Lightbulb, Activity } from 'lucide-react';
import { adminOverview } from '@/lib/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { InlineError, EmptyState } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import SetupCheck from './SetupCheck';
import { fmtDateTime } from '../../lib/format';

export default function Overview() {
  const { data, error, loading, reload } = useLoad('Admin overview', () => adminOverview({}));
  if (error) return <div className="space-y-4"><SetupCheck /><InlineError error={error} onRetry={reload} /></div>;
  const c = data?.counts;
  const cards = [
    { icon: Users, label: 'Total users', v: c?.users }, { icon: Shield, label: 'Staff', v: c?.staff }, { icon: Handshake, label: 'Partners', v: c?.partners },
    { icon: Images, label: 'Pending album', v: c?.pending }, { icon: Lightbulb, label: 'Suggestions', v: c?.suggestions, sub: c ? `${c.openSuggestions} open` : '' },
  ];
  return (
    <div className="space-y-8">
      <SetupCheck />
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((k, i) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4 md:p-5">
            <k.icon className="h-5 w-5 text-primary" />
            {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{k.v ?? 0}</p>}
            <p className="text-sm text-muted-foreground">{k.label}{k.sub ? ` - ${k.sub}` : ''}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-4 md:p-5">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold"><Activity className="h-4 w-4 text-primary" />Recent activity</h3>
        {loading ? <Skeleton className="h-40" /> : !data?.recent.length ? <EmptyState icon={Activity} title="No activity yet" message="Admin actions will be listed here." /> : (
          <ul className="divide-y divide-border">{data.recent.map((r) => <li key={r.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"><span><span className="font-medium">{r.action}</span> <span className="text-muted-foreground">- {r.resource}</span></span><span className="text-xs text-muted-foreground">{r.adminEmail} - {fmtDateTime(r.loggedAt)}</span></li>)}</ul>
        )}
      </div>
    </div>
  );
}
