import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Handshake } from 'lucide-react';
import { adminSavePartner, adminDeletePartner, listPartners, type AdminSavePartnerInputType } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Badge } from '@project/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import ImageUpload from '../../components/ImageUpload';
import ConfirmDelete from '../../components/ConfirmDelete';
import { Spinner, InlineError, EmptyState } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import { run } from '../../lib/errors';
import Field from './Field';

const CATS = ['Discord', 'Hosting', 'Shop', 'Server', 'SMP', 'Community'] as const;
type P = AdminSavePartnerInputType;

export default function PartnersTab() {
  const { data, error, loading, reload } = useLoad('Admin partners', () => listPartners({}));
  const [edit, setEdit] = useState<P | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!edit) return;
    const e: Record<string, string> = {};
    if (edit.name.trim().length < 2) e.name = 'Partner name is required.';
    if (edit.websiteUrl && !/^https?:\/\/\S+$/i.test(edit.websiteUrl)) e.websiteUrl = 'Must start with http:// or https://';
    setErrs(e); if (Object.keys(e).length) return;
    setBusy(true);
    try { await run('Partner update', () => adminSavePartner(edit), { success: edit.id ? 'Partner updated' : 'Partner created', failTitle: 'Failed to update partner' }); setEdit(null); reload(); } catch { /* kept */ } finally { setBusy(false); }
  };
  const del = (id: string) => run('Delete partner', () => adminDeletePartner({ id }), { success: 'Partner deleted' }).then(reload).catch(() => undefined);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => { setErrs({}); setEdit({ name: '', category: 'Community', description: '', logoUrl: '', websiteUrl: '' }); }}><Plus className="mr-2 h-4 w-4" />Add partner</Button></div>
      {loading ? <Spinner /> : error ? <InlineError error={error} onRetry={reload} /> : !data?.partners.length ? <EmptyState icon={Handshake} title="No partners available" message="Add your first partner." /> : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">{data.partners.map((p) => (
          <div key={p.id} className="flex items-center gap-4 p-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">{p.logoUrl ? <img src={p.logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="font-bold text-primary">{p.name[0]}</span>}</div>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.name}</p><Badge variant="secondary">{p.category}</Badge></div>
            <Button size="icon" variant="ghost" onClick={() => { setErrs({}); setEdit(p as P); }} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
            <ConfirmDelete title={`Delete ${p.name}?`} onConfirm={() => del(p.id)}><Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></ConfirmDelete>
          </div>
        ))}</div>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && !busy && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? 'Edit partner' : 'Add partner'}</DialogTitle></DialogHeader>
          {edit && <div className="space-y-4">
            <Field label="Name" error={errs.name}><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Category"><Select value={edit.category} onValueChange={(v) => setEdit({ ...edit, category: v as P['category'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Description"><Textarea rows={3} maxLength={600} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label="Website URL" error={errs.websiteUrl}><Input value={edit.websiteUrl} onChange={(e) => setEdit({ ...edit, websiteUrl: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Logo"><ImageUpload value={edit.logoUrl} onChange={(u) => setEdit({ ...edit, logoUrl: u })} label="Upload logo" /></Field>
          </div>}
          <DialogFooter><Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save partner</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
