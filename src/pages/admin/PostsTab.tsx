import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import { adminListPosts, adminSavePost, adminDeletePost } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Switch } from '@project/components/ui/switch';
import { Badge } from '@project/components/ui/badge';
import { DateTimePicker } from '@project/components/ui/date-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import ImageUpload from '../../components/ImageUpload';
import ConfirmDelete from '../../components/ConfirmDelete';
import { Spinner, InlineError, EmptyState } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import { run } from '../../lib/errors';
import { fmtDate } from '../../lib/format';
import Field from './Field';

type Kind = 'Announcement' | 'Update';
type P = { id?: string; title: string; body: string; imageUrl: string; published: boolean; publishedAt: string };
const blank = (): P => ({ title: '', body: '', imageUrl: '', published: true, publishedAt: new Date().toISOString() });

export default function PostsTab({ kind }: { kind: Kind }) {
  const { data, error, loading, reload } = useLoad(`Admin ${kind}s`, () => adminListPosts({ kind }), [kind]);
  const [edit, setEdit] = useState<P | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!edit) return;
    const e: Record<string, string> = {};
    if (edit.title.trim().length < 3) e.title = 'Title must be at least 3 characters.';
    if (!edit.body.trim()) e.body = 'Description is required.';
    setErrs(e); if (Object.keys(e).length) return;
    setBusy(true);
    try { await run(`Save ${kind}`, () => adminSavePost({ ...edit, kind }), { success: `${kind} ${edit.published ? 'published' : 'saved as draft'}`, failTitle: `Failed to save ${kind.toLowerCase()}` }); setEdit(null); reload(); } catch { /* kept */ } finally { setBusy(false); }
  };
  const togglePub = (p: P) => run(`Publish ${kind}`, () => adminSavePost({ ...p, kind, published: !p.published }), { success: p.published ? 'Unpublished' : 'Published', failTitle: 'Failed to change publication' }).then(reload).catch(() => undefined);
  const del = (id: string) => run(`Delete ${kind}`, () => adminDeletePost({ id }), { success: `${kind} deleted` }).then(reload).catch(() => undefined);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => { setErrs({}); setEdit(blank()); }}><Plus className="mr-2 h-4 w-4" />New {kind.toLowerCase()}</Button></div>
      {loading ? <Spinner /> : error ? <InlineError error={error} onRetry={reload} /> : !data?.posts.length ? <EmptyState icon={Megaphone} title={`No ${kind.toLowerCase()}s yet`} message="Create your first one." /> : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">{data.posts.map((p) => (
          <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            {p.imageUrl && <img src={p.imageUrl} alt="" className="h-14 w-24 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.title}</p><p className="text-xs text-muted-foreground">{fmtDate(p.publishedAt)}</p></div>
            <div className="flex items-center gap-2">
              <Badge variant={p.published ? 'default' : 'secondary'}>{p.published ? 'Published' : 'Draft'}</Badge>
              <Switch checked={p.published} onCheckedChange={() => togglePub(p)} aria-label="Published" />
              <Button size="icon" variant="ghost" onClick={() => { setErrs({}); setEdit(p); }} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
              <ConfirmDelete title={`Delete "${p.title}"?`} onConfirm={() => del(p.id)}><Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></ConfirmDelete>
            </div>
          </div>
        ))}</div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && !busy && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? 'Edit' : 'New'} {kind.toLowerCase()}</DialogTitle></DialogHeader>
          {edit && <div className="space-y-4">
            <Field label="Title" error={errs.title}><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Description" error={errs.body}><Textarea rows={7} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
            <Field label="Image (optional)"><ImageUpload value={edit.imageUrl} onChange={(u) => setEdit({ ...edit, imageUrl: u })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Publication date"><DateTimePicker value={edit.publishedAt ? new Date(edit.publishedAt) : undefined} onChange={(d) => setEdit({ ...edit, publishedAt: d ? d.toISOString() : '' })} /></Field>
              <label className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3 text-sm font-medium">Published<Switch checked={edit.published} onCheckedChange={(v) => setEdit({ ...edit, published: v })} /></label>
            </div>
          </div>}
          <DialogFooter><Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
