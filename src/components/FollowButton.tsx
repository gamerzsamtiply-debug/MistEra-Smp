import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { toggleFollow } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@project/components/ui/button';
import { errText } from '../lib/social';
import { sfx } from '../lib/sfx';

/** Follow / Following toggle. Signed-out visitors are sent to the login page and come straight back. */
export default function FollowButton({ profileId, following, onChange, size = 'default' }: { profileId: string; following: boolean; onChange: (following: boolean, followers: number) => void; size?: 'default' | 'sm' }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!user) { nav(`/login?next=${encodeURIComponent(window.location.pathname)}`); return; }
    setBusy(true);
    try {
      const r = await toggleFollow({ profileId });
      onChange(r.following, r.followers);
      sfx.pop();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Button size={size} variant={following ? 'secondary' : 'default'} onClick={go} disabled={busy} aria-pressed={following}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : following ? <Check className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
      {following ? 'Following' : 'Follow'}
    </Button>
  );
}
