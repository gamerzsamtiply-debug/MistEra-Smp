import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { updateMyProfile } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import ImageUpload from '../components/ImageUpload';
import { Spinner } from '../components/States';
import { useSite } from '../lib/site';
import { run } from '../lib/errors';
import { sfx } from '../lib/sfx';

/** Shown right after sign-up: set your avatar, name and bio - or skip and do it later from your profile. */
export default function WelcomePage() {
  const { me, reloadMe } = useSite();
  const nav = useNavigate();
  const [f, setF] = useState({ username: '', bio: '', avatarUrl: '' });
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Fill the form once, from the profile that was created automatically at sign-up.
  useEffect(() => {
    if (me && !ready) { setF({ username: me.profile.username, bio: me.profile.bio, avatarUrl: me.profile.avatarUrl }); setReady(true); }
  }, [me, ready]);

  if (!me) return <Spinner />;

  const save = async () => {
    const username = f.username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return setErr('Use 3-20 letters, numbers or underscores for your name.');
    if (f.bio.length > 300) return setErr('Bio must be 300 characters or fewer.');
    setErr(''); setBusy(true);
    try {
      await run('Profile setup', () => updateMyProfile({ username, bio: f.bio, avatarUrl: f.avatarUrl }), { success: 'Your profile is ready', failTitle: 'Could not save your profile' });
      sfx.success();
      reloadMe();
      nav('/', { replace: true });
    } catch { /* toast shown; the form keeps what was typed */ } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to MistEra SMP!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Set up your profile so other players know who you are.</p>
      </div>
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-2">
          <p className="text-center text-sm font-medium">Set your avatar</p>
          <ImageUpload round name={f.username || me.profile.username} value={f.avatarUrl} onChange={(u) => setF({ ...f, avatarUrl: u })} label="Upload photo" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wn">Your name</Label>
          <Input id="wn" value={f.username} maxLength={20} autoComplete="nickname" onChange={(e) => setF({ ...f, username: e.target.value })} />
          <p className="text-xs text-muted-foreground">Letters, numbers and underscores, 3-20 characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wb">Bio (optional)</Label>
          <Textarea id="wb" rows={3} value={f.bio} maxLength={300} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="Tell the community about yourself" />
          <p className="text-right text-xs text-muted-foreground">{f.bio.length}/300</p>
        </div>
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button size="lg" className="w-full" onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save and continue</Button>
      </div>
      <p className="mt-5 text-center text-sm"><Link to="/" replace className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Skip</Link></p>
    </div>
  );
}
