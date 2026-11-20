import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { adminListPages, adminSavePage } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Switch } from '@project/components/ui/switch';
import { MarkdownEditor } from '@project/components/markdown-editor';
import { Spinner, InlineError } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import { run } from '../../lib/errors';
import Field from './Field';

type Pg = { slug: 'information' | 'about' | 'rules' | 'terms' | 'privacy'; title: string; content: string; published: boolean };

function PageEditor({ page, onSaved }: { page: Pg; onSaved: () => void }) {
  const [f, setF] = useState(page);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => setF(page), [page]);
  const save = async () => {
    if (!f.title.trim()) return setErr('Title is required.');
    if (f.published && !f.content.trim()) return setErr("You can't publish an empty page.");
    setErr(''); setBusy(true);
    try { await run('Content page update', () => adminSavePage(f), { success: `${f.title} saved`, failTitle: 'Failed to save page' }); onSaved(); } catch { /* kept */ } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-end gap-4"><div className="flex-1 min-w-[200px]"><Field label="Page title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field></div><label className="flex items-center gap-2 pb-2 text-sm font-medium">Published<Switch checked={f.published} onCheckedChange={(v) => setF({ ...f, published: v })} /></label></div>
      <div className="rounded-xl border border-border"><MarkdownEditor key={page.slug} content={page.content} onChange={(v: string) => setF((p) => ({ ...p, content: v }))} editorClassName="min-h-[260px] p-4" /></div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex justify-end"><Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save page</Button></div>
    </div>
  );
}

export default function PagesTab() {
  const { data, error, loading, reload } = useLoad('Load pages', () => adminListPages({}));
  if (loading) return <Spinner />;
  if (error) return <InlineError error={error} onRetry={reload} />;
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Each page has its own address (/about, /information, /rules, /terms, /privacy). A page only appears on the website, in Google and for AI assistants once it is <strong>Published</strong> and has text.</p>
      {(data?.pages ?? []).map((p: Pg) => <div key={p.slug}><p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">/{p.slug}</p><PageEditor page={p} onSaved={reload} /></div>)}
    </div>
  );
}
