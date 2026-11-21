import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Trash2, Images, Eye, Share2, Pencil, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { updateMyProfile, myAlbum, deleteMyAlbum, claimStaff } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Badge } from '@project/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import ImageUpload from '../components/ImageUpload';
import SubmitImageDialog from '../components/SubmitImageDialog';
import ProfileHeader from '../components/ProfileHeader';
import Media from '../components/Media';
import RoleBadge from '../components/RoleBadge';
import { EmptyState, GridSkeleton, InlineError, Spinner } from '../components/States';
import ConfirmDelete from '../components/ConfirmDelete';
import { useSite } from '../lib/site';
import { useLoad } from '../lib/useLoad';
import { run } from '../lib/errors';
import { fmtDate } from '../lib/format';
import { sfx } from '../lib/sfx';
import { cn } from '@project/components/lib/utils';
import { MySuggestions } from './SuggestionsPage';

function StaffLink() {
  const { me, reloadMe } = useSite();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  if (!me) return null;
  if (me.staffPosition) return <p className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">Your account is linked to the staff team as <RoleBadge role={me.staffPosition} />.</p>;
  const submit = async () => {
    setBusy(true);
    try { await run('Link staff profile', () => claimStaff({ code }), { success: 'Staff profile linked', failTitle: 'Could not link staff profile' }); setCode(''); reloadMe(); } catch { /* shown */ } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2 rounded-xl border border-border p-4">
      <Label htmlFor="staff-code">Staff link code</Label>
      <p className="text-xs text-muted-foreground">Part of the team? Enter the one-time code an admin gave you to connect your account to your staff profile.</p>
      <div className="flex gap-2"><Input id="staff-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" autoComplete="off" className="font-mono" /><Button onClick={submit} disabled={busy || code.replace(/[^a-zA-Z0-9]/g, '').length < 16}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Link</Button></div>
    </div>
  );
}

/** Edit your name (username), bio and round profile photo. */
function EditProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { me, reloadMe } = useSite();
  const [f, setF] = useState({ username: '', bio: '', avatarUrl: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (me && open) setF({ username: me.profile.username, bio: me.profile.bio, avatarUrl: me.profile.avatarUrl }); }, [me, open]);
  const save = async () => {
    const e: Record<string, string> = {};
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(f.username.trim())) e.username = 'Use 3-20 letters, numbers or underscores.';
    if (f.bio.length > 300) e.bio = 'Bio must be 300 characters or fewer.';
    setErrs(e); if (Object.keys(e).length) return;
    setBusy(true);
    try { await run('Profile update', () => updateMyProfile(f), { success: 'Profile updated', failTitle: 'Profile update failed' }); reloadMe(); onOpenChange(false); } catch { /* shown */ } finally { setBusy(false); }
  };
  if (!me) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Edit profile</DialogTitle><DialogDescription>Change your photo, name and bio.</DialogDescription></DialogHeader>
        <div className="space-y-5">
          <ImageUpload round name={f.username || me.profile.username} value={f.avatarUrl} onChange={(u) => setF({ ...f, avatarUrl: u })} label="Upload photo" />
          <div className="space-y-1.5"><Label htmlFor="un">Name (username)</Label><Input id="un" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} aria-invalid={!!errs.username} />{errs.username && <p className="text-sm text-destructive">{errs.username}</p>}</div>
          <div className="space-y-1.5"><Label htmlFor="bio">Bio</Label><Textarea id="bio" rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="Tell the community about yourself" /><p className="text-xs text-muted-foreground">{f.bio.length}/300</p>{errs.bio && <p className="text-sm text-destructive">{errs.bio}</p>}</div>
          <Button onClick={save} disabled={busy} className="w-full">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button>
          <StaffLink />
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Mine = { id: string; mediaType: string; imageUrl: string; caption: string; status: string; submittedAt: string; viewCount?: number };

function MyAlbums() {
  const { data, error, loading, reload, setData } = useLoad('Load my album', () => myAlbum({}));
  const del = async (id: string) => {
    await run('Delete album image', () => deleteMyAlbum({ id }), { success: 'Album removed' }).then(() => setData((d) => d && { items: d.items.filter((i: Mine) => i.id !== id) })).catch(() => undefined);
  };
  const items: Mine[] = data?.items ?? [];
  if (loading) return <GridSkeleton count={3} />;
  if (error) return <InlineError error={error} onRetry={reload} />;
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-14 text-center">
        <h2 className="text-2xl font-semibold">Share your first album</h2>
        <p className="max-w-xs text-sm text-muted-foreground">Post a screenshot or video from the server. Staff will review it before it appears.</p>
        <SubmitImageDialog onDone={reload} label="Upload album" />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex justify-center"><SubmitImageDialog onDone={reload} label="Upload album" variant="secondary" /></div>
      <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
        {items.map((a) => (
          <div key={a.id} className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card">
            <Media type={a.mediaType} src={a.imageUrl} alt={a.caption || 'Your album post'} className="w-full object-cover" />
            <div className="absolute left-2 top-2"><Badge variant={a.status === 'Approved' ? 'default' : a.status === 'Declined' ? 'destructive' : 'secondary'}>{a.status}</Badge></div>
            <div className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0 text-xs text-muted-foreground">
                <p className="truncate">{a.caption || fmtDate(a.submittedAt)}</p>
                {a.status === 'Approved' && <p className="mt-0.5 inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{a.viewCount ?? 0} views</p>}
              </div>
              <ConfirmDelete title="Delete this album?" onConfirm={() => del(a.id)}><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></ConfirmDelete>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { me } = useSite();
  const [tab, setTab] = useState<'albums' | 'suggestions'>('albums');
  const [edit, setEdit] = useState(false);
  const stats = useLoad('Load my album stats', () => myAlbum({}));
  if (!me) return <Spinner />;
  const items: Mine[] = stats.data?.items ?? [];
  const approved = items.filter((i) => i.status === 'Approved');
  const views = approved.reduce((n, i) => n + (i.viewCount ?? 0), 0);
  const share = async () => {
    const url = `${window.location.origin}/u/${me.profile.id}`;
    try { await navigator.clipboard.writeText(url); toast.success('Profile link copied'); sfx.pop(); } catch { toast.error('Could not copy the link', { description: url }); }
  };
  const tabBtn = (id: typeof tab, label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); sfx.tap(); }} className={cn('relative px-4 py-3 text-base font-semibold transition-colors', tab === id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
      {label}
      <span className={cn('absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-foreground transition-transform duration-300', tab === id ? 'scale-x-100' : 'scale-x-0')} />
    </button>
  );
  return (
    <>
      <ProfileHeader
        profile={me.profile}
        stats={`${approved.length} album${approved.length === 1 ? '' : 's'} - ${views} view${views === 1 ? '' : 's'}`}
        actions={<>
          <Button variant="secondary" onClick={() => setEdit(true)}><Pencil className="mr-2 h-4 w-4" />Edit profile</Button>
          <Button variant="ghost" size="icon" onClick={share} aria-label="Copy profile link"><Share2 className="h-5 w-5" /></Button>
          <Link to={`/u/${me.profile.id}`} className="text-sm text-primary hover:underline">View public profile</Link>
        </>}
      />
      <div className="container mx-auto px-4 pb-10">
        <div role="tablist" className="mb-6 flex justify-center">{tabBtn('albums', 'Albums')}{tabBtn('suggestions', 'Suggestions')}</div>
        {tab === 'albums' ? <MyAlbums /> : <MySuggestions />}
      </div>
      <EditProfileDialog open={edit} onOpenChange={setEdit} />
    </>
  );
}
