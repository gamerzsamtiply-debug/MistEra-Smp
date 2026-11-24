import { useState } from 'react';
import { Building2, ExternalLink } from 'lucide-react';
import { listPartners } from '@/lib/api';
import { Badge } from '@project/components/ui/badge';
import { cn } from '@project/components/lib/utils';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import { EmptyState, GridSkeleton, InlineError } from '../components/States';
import { useLoad } from '../lib/useLoad';

const CATS = ['All', 'Discord', 'Hosting', 'Shop', 'Server', 'SMP', 'Community'];
export interface Partner { id: string; name: string; category: string; description: string; logoUrl: string; websiteUrl: string }

export function PartnerCard({ p }: { p: Partner }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
      <header className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
          {p.logoUrl ? <img src={p.logoUrl} alt={`${p.name} logo`} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <span className="font-display text-xl font-semibold text-primary">{p.name.slice(0, 1)}</span>}
        </div>
        <div className="min-w-0"><h2 className="truncate font-semibold">{p.name}</h2><Badge variant="secondary" className="mt-1">{p.category}</Badge></div>
      </header>
      <p className="mt-4 flex-1 text-sm text-muted-foreground line-clamp-4">{p.description}</p>
      {p.websiteUrl && <a href={p.websiteUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Visit <ExternalLink className="h-3.5 w-3.5" /></a>}
    </article>
  );
}

export default function PartnersPage() {
  const { data, error, loading, reload } = useLoad('Load partners', () => listPartners({}), [], { cache: true });
  const [cat, setCat] = useState('All');
  const list = (data?.partners ?? []).filter((p) => cat === 'All' || p.category === cat);
  return (
    <>
      <PageHeader eyebrow="Friends of MistEra" title="Partners" subtitle="Communities, hosts and creators we proudly work with." />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-wrap gap-2">
          {CATS.map((c) => <button key={c} onClick={() => setCat(c)} className={cn('rounded-full border px-4 py-1.5 text-sm font-medium transition', cat === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>{c}</button>)}
        </div>
        {loading ? <GridSkeleton /> : error ? <InlineError error={error} onRetry={reload} /> : !list.length ? (
          <EmptyState icon={Building2} title="No partners yet" message={cat === 'All' ? 'Our partners will be listed here soon.' : `No ${cat} partners yet.`} />
        ) : <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((p, i) => <li key={p.id} className="contents"><Reveal delay={(i % 3) * 0.05}><PartnerCard p={p} /></Reveal></li>)}</ul>}
      </div>
    </>
  );
}
