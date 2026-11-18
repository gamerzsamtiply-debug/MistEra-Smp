import { useMemo, useState } from 'react';
import { Lightbulb, Trash2 } from 'lucide-react';
import { adminListSuggestions, adminUpdateSuggestion } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import UserChip from '../../components/UserChip';
import ConfirmDelete from '../../components/ConfirmDelete';
import { Spinner, InlineError, EmptyState } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import { run } from '../../lib/errors';
import { fmtDate } from '../../lib/format';

const STATUSES = ['Open', 'Under Review', 'Accepted', 'Declined'];

export default function SuggestionsTab() {
  const { data, error, loading, reload, setData } = useLoad('Admin suggestions', () => adminListSuggestions({}));
  const [filter, setFilter] = useState('All');
  const list = useMemo(() => (data?.items ?? []).filter((s) => filter === 'All' || s.status === filter), [data, filter]);
  const act = async (id: string, action: string) => {
    try {
      await run('Suggestion update', () => adminUpdateSuggestion({ id, action: action as 'Open' }), { success: action === 'Delete' ? 'Suggestion deleted' : `Marked ${action}` });
      setData((d) => d && { items: action === 'Delete' ? d.items.filter((i) => i.id !== id) : d.items.map((i) => (i.id === id ? { ...i, status: action } : i)) });
    } catch { /* shown */ }
  };
  return (
    <div className="space-y-4">
      <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      {loading ? <Spinner /> : error ? <InlineError error={error} onRetry={reload} /> : !list.length ? <EmptyState icon={Lightbulb} title="No suggestions available" message="Player suggestions will appear here." /> : list.map((s) => (
        <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h4 className="font-semibold">{s.title}</h4><div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><UserChip user={s.author} /> · {fmtDate(s.submittedAt)}</div></div>
            <div className="flex items-center gap-2">
              <Select value={s.status} onValueChange={(v) => act(s.id, v)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
              <ConfirmDelete title="Delete this suggestion?" onConfirm={() => act(s.id, 'Delete')}><Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></ConfirmDelete>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{s.description}</p>
        </div>
      ))}
    </div>
  );
}
