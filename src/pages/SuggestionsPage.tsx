import { useState } from 'react';
import { Lightbulb, Loader2, Trash2 } from 'lucide-react';
import { submitSuggestion, mySuggestions, deleteMySuggestion } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Badge } from '@project/components/ui/badge';
import PageHeader from '../components/PageHeader';
import ConfirmDelete from '../components/ConfirmDelete';
import { EmptyState, InlineError, Spinner } from '../components/States';
import { useLoad } from '../lib/useLoad';
import { run } from '../lib/errors';
import { fmtDate } from '../lib/format';

export function MySuggestions() {
  const { data, error, loading, reload, setData } = useLoad('Load my suggestions', () => mySuggestions({}));
  const [f, setF] = useState({ title: '', description: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const e: Record<string, string> = {};
    if (f.title.trim().length < 4) e.title = 'Title must be at least 4 characters.';
    if (f.description.trim().length < 10) e.description = 'Please describe your idea in at least 10 characters.';
    setErrs(e); if (Object.keys(e).length) return;
    setBusy(true);
    try { await run('Suggestion submission', () => submitSuggestion(f), { success: 'Suggestion submitted — thank you!', failTitle: 'Suggestion submission failed' }); setF({ title: '', description: '' }); reload(); } catch { /* preserved */ } finally { setBusy(false); }
  };
  const del = (id: string) => run('Delete suggestion', () => deleteMySuggestion({ id }), { success: 'Suggestion deleted' }).then(() => setData((d) => d && { items: d.items.filter((i) => i.id !== id) })).catch(() => undefined);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 h-fit">
        <h3 className="text-lg font-bold">New suggestion</h3>
        <div className="space-y-1.5"><Label htmlFor="st">Title</Label><Input id="st" maxLength={100} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />{errs.title && <p className="text-sm text-destructive">{errs.title}</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="sd">Description</Label><Textarea id="sd" rows={5} maxLength={2000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />{errs.description && <p className="text-sm text-destructive">{errs.description}</p>}</div>
        <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit suggestion</Button>
      </div>
      <div className="space-y-3">
        {loading ? <Spinner /> : error ? <InlineError error={error} onRetry={reload} /> : !data?.items.length ? <EmptyState icon={Lightbulb} title="No suggestions available" message="Your submitted ideas will show up here." /> : data.items.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div><h4 className="font-semibold">{s.title}</h4><p className="text-xs text-muted-foreground">{fmtDate(s.submittedAt)}</p></div>
              <div className="flex items-center gap-1"><Badge variant={s.status === 'Accepted' ? 'default' : s.status === 'Declined' ? 'destructive' : 'secondary'}>{s.status}</Badge>
                <ConfirmDelete title="Delete this suggestion?" onConfirm={() => del(s.id)}><Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></ConfirmDelete></div>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{s.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SuggestionsPage() {
  return (<><PageHeader eyebrow="Community" title="Suggestions" subtitle="Share ideas to make MistEra SMP even better." /><div className="container mx-auto px-4 py-10"><MySuggestions /></div></>);
}
