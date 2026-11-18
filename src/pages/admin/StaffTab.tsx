import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, UserRound, Link2, Link2Off, KeyRound, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { adminSaveStaff, adminDeleteStaff, adminListStaff, adminLinkStaff, adminStaffClaimCode, STAFF_POSITIONS, type AdminSaveStaffInputType } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import ImageUpload from '../../components/ImageUpload';
import ConfirmDelete from '../../components/ConfirmDelete';
import RoleBadge from '../../components/RoleBadge';
import { UserAvatar } from '../../components/UserChip';
import { Spinner, InlineError, EmptyState } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import { useSite } from '../../lib/site';
import { run } from '../../lib/errors';
import Field from './Field';

interface Row { id: string; name: string; avatarUrl: string; position: AdminSaveStaffInputType['position']; profileId: string | null; username: string | null; system: boolean; claimPending: boolean }

export default function StaffTab() {
  const { me } = useSite();
  const { data, error, loading, reload } = useLoad('Admin staff', () => adminListStaff({}));
  const [edit, setEdit] = useState<AdminSaveStaffInputType | null>(null);
  const [link, setLink] = useState<Row | null>(null);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const positions = me?.isOwner ? STAFF_POSITIONS : STAFF_POSITIONS.filter((p) => p !== 'Owner' && p !== 'Admin');
  const canEdit = (r: Row) => !r.system && (me?.isOwner || (r.position !== 'Owner' && r.position !== 'Admin'));

  const save = async () => {
    if (!edit) return;
    if (edit.name.trim().length < 2) return setErrs({ name: 'Name must be at least 2 characters.' });
    setErrs({}); setBusy(true);
    try { await run('Staff update', () => adminSaveStaff(edit), { success: edit.id ? 'Staff member updated' : 'Staff member added', failTitle: 'Failed to save staff member' }); setEdit(null); reload(); } catch { /* shown */ } finally { setBusy(false); }
  };
  const del = (id: string) => run('Delete staff', () => adminDeleteStaff({ id }), { success: 'Staff member removed' }).then(reload).catch(() => undefined);
  const doLink = async (u: string | null) => {
    if (!link) return;
    setBusy(true);
    try { await run('Link staff', () => adminLinkStaff({ id: link.id, username: u }), { success: u ? 'Account linked' : 'Account unlinked' }); setLink(null); setUsername(''); reload(); } catch { /* shown */ } finally { setBusy(false); }
  };
  const makeCode = async () => {
    if (!link) return;
    setBusy(true);
    try { const c = await run('Staff link code', () => adminStaffClaimCode({ id: link.id }), { failTitle: 'Could not create a code' }); if (c) { setCode(c); reload(); } } catch { /* shown */ } finally { setBusy(false); }
  };
  const close = () => { setLink(null); setCode(null); setUsername(''); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => { setErrs({}); setEdit({ name: '', avatarUrl: '', position: 'Staff' }); }}><Plus className="mr-2 h-4 w-4" />Add staff member</Button></div>
      {loading ? <Spinner /> : error ? <InlineError error={error} onRetry={reload} /> : !data?.staff.length ? <EmptyState icon={UserRound} title="No staff members yet" message="Add your first staff member." /> : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">{(data.staff as Row[]).map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
            <UserAvatar username={s.name} avatarUrl={s.avatarUrl} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{s.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2"><RoleBadge role={s.position} /><span className="text-xs text-muted-foreground">{s.system ? 'Site owner account (automatic)' : s.username ? `Linked to @${s.username}` : s.claimPending ? 'Link code pending' : 'No account linked'}</span></div>
            </div>
            {canEdit(s) && (
              <div className="flex items-center">
                <Button size="icon" variant="ghost" onClick={() => { setCode(null); setUsername(''); setLink(s); }} aria-label="Link account"><Link2 className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setErrs({}); setEdit({ id: s.id, name: s.name, avatarUrl: s.avatarUrl, position: s.position }); }} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                <ConfirmDelete title={`Remove ${s.name}?`} onConfirm={() => del(s.id)}><Button size="icon" variant="ghost" aria-label="Remove"><Trash2 className="h-4 w-4" /></Button></ConfirmDelete>
              </div>
            )}
          </div>
        ))}</div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && !busy && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? 'Edit staff member' : 'Add staff member'}</DialogTitle><DialogDescription>Shown on the public Staff page. No account is needed.</DialogDescription></DialogHeader>
          {edit && <div className="space-y-4">
            <Field label="Name" error={errs.name}><Input value={edit.name} maxLength={40} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Position"><Select value={edit.position} onValueChange={(v) => setEdit({ ...edit, position: v as AdminSaveStaffInputType['position'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Logo / avatar"><ImageUpload value={edit.avatarUrl} onChange={(u) => setEdit({ ...edit, avatarUrl: u })} label="Upload avatar" /></Field>
          </div>}
          <DialogFooter><Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!link} onOpenChange={(o) => !o && !busy && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link account: {link?.name}</DialogTitle><DialogDescription>Linking only connects this entry to a registered profile. It never grants any permissions.</DialogDescription></DialogHeader>
          {link && <div className="space-y-5">
            {link.username ? (
              <Button variant="outline" onClick={() => doLink(null)} disabled={busy}><Link2Off className="mr-2 h-4 w-4" />Unlink @{link.username}</Button>
            ) : (
              <>
                <Field label="Link to a username" hint="Use this if you know the member's exact username."><div className="flex gap-2"><Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" /><Button onClick={() => doLink(username.trim())} disabled={busy || username.trim().length < 3}>Link</Button></div></Field>
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-sm font-medium">Or let them link it themselves</p>
                  <p className="text-xs text-muted-foreground">Create a one-time code and send it to them privately. They enter it on their Profile page. It expires in 48 hours and works once.</p>
                  {code ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3"><code className="flex-1 font-mono text-base ">{code.code}</code><Button size="icon" variant="ghost" aria-label="Copy code" onClick={() => navigator.clipboard?.writeText(code.code).then(() => toast.success('Code copied'))}><Copy className="h-4 w-4" /></Button></div>
                  ) : <Button variant="outline" onClick={makeCode} disabled={busy}><KeyRound className="mr-2 h-4 w-4" />Create link code</Button>}
                  {code && <p className="text-xs text-muted-foreground">This code is shown only once. Creating another replaces it.</p>}
                </div>
              </>
            )}
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
