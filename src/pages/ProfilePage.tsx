import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Trash2, Images, ExternalLink } from 'lucide-react';
import { updateMyProfile, myAlbum, deleteMyAlbum } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Badge } from '@project/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import PageHeader from '../components/PageHeader';
import ImageUpload from '../components/ImageUpload';
import SubmitImageDialog from '../components/SubmitImageDialog';
import RoleBadge from '../components/RoleBadge';
import { EmptyState, GridSkeleton, InlineError } from '../components/States';
import ConfirmDelete from '../components/ConfirmDelete';
import { useSite } from '../lib/site';
import { useLoad } from '../lib/useLoad';
import { run } from '../lib/errors';
import { fmtDate } from '../lib/format';
import { MySuggestions } from './SuggestionsPage';

function EditProfile() {
  const { me, reloadMe } = useSite();
  const [f, setF] = useState({ username: '', bio: '', avatarUrl: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (me) setF({ username: me.profile.username, bio: me.profile.bio, avatarUrl: me.profile.avatarUrl }); }, [me]);
  const save = async () => {
    const e: Record<string, string> = {};
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(f.username.trim())) e.username = 'Use 3–20 letters, numbers or underscores.';
    if (f.bio.length > 300) e.bio = 'Bio must be 300 characters or fewer.';
    setErrs(e); if (Object.keys(e).length) return;
    setBusy(true);
    try { await run('Profile update', () => updateMyProfile(f), { success: 'Profile updated', failTitle: 'Profile update failed' }); reloadMe(); } catch { /* shown */ } finally { setBusy(false); }
  };
  if (!me) return null;
  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <div><Label className="mb-2 block">Profile picture</Label><ImageUpload value={f.avatarUrl} onChange={(u) => setF({ ...f, avatarUrl: u })} label="Upload avatar" /></div>
      <div className="space-y-5">
        <div className="flex items-center gap-3"><RoleBadge role={me.profile.role} /><Link to={`/u/${me.profile.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">View public profile <ExternalLink className="h-3.5 w-3.5" /></Link></div>
        <div className="space-y-1.5"><Label htmlFor="un">Username</Label><Input id="un" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} aria-invalid={!!errs.username} />{errs.username && <p className="text-sm text-destructive">{errs.username}</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="bio">Bio</Label><Textarea id="bio" rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="Tell the community about yourself" /><p className="text-xs text-muted-foreground">{f.bio.length}/300</p>{errs.bio && <p className="text-sm text-destructive">{errs.bio}</p>}</div>
        <Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button>
      </div>
    </div>
  );
}

function MyImages() {
  const { data, error, loading, reload, setData } = useLoad('Load my album', () => myAlbum({}));
  const del = async (id: string) => {
    await run('Delete album image', () => deleteMyAlbum({ id }), { success: 'Image removed' }).then(() => setData((d) => d && { items: d.items.filter((i) => i.id !== id) })).catch(() => undefined);
  };
  return (
    <div className="space-y-6">
      <SubmitImageDialog onDone={reload} />
      {loading ? <GridSkeleton count={3} /> : error ? <InlineError error={error} onRetry={reload} /> : !data?.items.length ? <EmptyState icon={Images} title="No submissions yet" message="Share a screenshot from the server." /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((a) => (
          <div key={a.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <img src={a.imageUrl} alt={a.caption} className="aspect-video w-full object-cover" />
            <div className="flex items-center justify-between gap-2 p-4">
              <div className="min-w-0"><Badge variant={a.status === 'Approved' ? 'default' : a.status === 'Declined' ? 'destructive' : 'secondary'}>{a.status}</Badge><p className="mt-1 truncate text-xs text-muted-foreground">{a.caption || fmtDate(a.submittedAt)}</p></div>
              <ConfirmDelete title="Delete this image?" onConfirm={() => del(a.id)}><Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></ConfirmDelete>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader eyebrow="Your account" title="Profile" subtitle="Manage your public profile, album submissions and suggestions." />
      <div className="container mx-auto px-4 py-10">
        <Tabs defaultValue="profile">
          <TabsList className="mb-8"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="album">My Album</TabsTrigger><TabsTrigger value="suggestions">My Suggestions</TabsTrigger></TabsList>
          <TabsContent value="profile"><EditProfile /></TabsContent>
          <TabsContent value="album"><MyImages /></TabsContent>
          <TabsContent value="suggestions"><MySuggestions /></TabsContent>
        </Tabs>
      </div>
    </>
  );
}
