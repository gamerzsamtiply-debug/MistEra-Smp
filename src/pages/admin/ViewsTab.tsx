import { Eye, Users, CalendarDays, TrendingUp, LogIn, ShieldCheck } from 'lucide-react';
import { adminViews } from '@/lib/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { InlineError, EmptyState } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import { fmtDateTime } from '../../lib/format';

const nf = (n: number) => n.toLocaleString();

/** Admin only: how many people viewed the website, which pages, and the recent sign-in log. */
export default function ViewsTab() {
  const { data, error, loading, reload } = useLoad('Admin views', () => adminViews({}));
  if (error) return <InlineError error={error} onRetry={reload} />;
  const cards = [
    { icon: Eye, label: 'Total views', v: data?.total }, { icon: Users, label: 'Unique visitors', v: data?.unique },
    { icon: CalendarDays, label: 'Views today', v: data?.today }, { icon: TrendingUp, label: 'Last 7 days', v: data?.last7 },
  ];
  const max = Math.max(1, ...(data?.daily ?? []).map((d) => d.views));
  return (
    <div className="space-y-8">
      {data && !data.ready && <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">Run <code>supabase/migrations/0007_views_logins_navigation.sql</code> in the Supabase SQL Editor to turn on view counting and the login log.</p>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4 md:p-5">
            <k.icon className="h-5 w-5 text-primary" />
            {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{nf(k.v ?? 0)}</p>}
            <p className="text-sm text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 md:p-5">
        <h3 className="mb-4 text-base font-semibold">Views - last 14 days</h3>
        {loading ? <Skeleton className="h-40" /> : !data?.daily.length ? <EmptyState icon={Eye} title="No views yet" message="Visits will be counted from now on." /> : (
          <div className="flex h-40 items-end gap-1.5 overflow-x-auto" role="img" aria-label="Views per day">
            {data.daily.map((d) => (
              <div key={d.day} className="flex min-w-[1.5rem] flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${d.views} views, ${d.visitors} visitors`}>
                <span className="text-[10px] tabular-nums text-muted-foreground">{d.views}</span>
                <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(4, (d.views / max) * 100)}%` }} />
                <span className="text-[10px] text-muted-foreground">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 md:p-5">
        <h3 className="mb-4 text-base font-semibold">Most viewed pages</h3>
        {loading ? <Skeleton className="h-32" /> : !data?.topPages.length ? <p className="text-sm text-muted-foreground">Nothing yet.</p> : (
          <ul className="divide-y divide-border">{data.topPages.map((p) => <li key={p.path} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="truncate font-mono">{p.path}</span><span className="tabular-nums text-muted-foreground">{nf(p.views)}</span></li>)}</ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 md:p-5">
        <h3 className="mb-1 flex items-center gap-2 text-base font-semibold"><LogIn className="h-4 w-4 text-primary" />Login log</h3>
        <p className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Only admins can see this. Passwords are never stored or shown.</p>
        {loading ? <Skeleton className="h-40" /> : !data?.logins.length ? <EmptyState icon={LogIn} title="No logins recorded" message="Sign-ins will be listed here." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="pb-2 font-medium">Email</th><th className="pb-2 font-medium">Method</th><th className="pb-2 font-medium">IP</th><th className="pb-2 font-medium">When</th></tr></thead>
              <tbody className="divide-y divide-border">{data.logins.map((l) => <tr key={l.id}><td className="py-2 pr-3">{l.email}</td><td className="py-2 pr-3 capitalize">{l.method}</td><td className="py-2 pr-3 font-mono text-xs">{l.ip}</td><td className="py-2 text-muted-foreground">{fmtDateTime(l.at)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
