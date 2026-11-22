import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listFollows, type PersonCard } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { UserAvatar } from './UserChip';
import { Spinner } from './States';
import { errText } from '../lib/social';

/** "12 followers - 8 following" - tapping either opens the list. */
export default function FollowStats({ profileId, followers, following }: { profileId: string; followers: number; following: number }) {
  const [kind, setKind] = useState<'followers' | 'following' | null>(null);
  const [people, setPeople] = useState<PersonCard[] | null>(null);
  const [err, setErr] = useState('');
  const open = (k: 'followers' | 'following') => {
    setKind(k); setPeople(null); setErr('');
    listFollows({ profileId, kind: k }).then((d) => setPeople(d.people)).catch((e) => setErr(errText(e)));
  };
  const btn = 'font-semibold hover:underline focus-visible:outline-none focus-visible:underline';
  return (
    <>
      <p className="mt-3 text-sm text-muted-foreground">
        <button type="button" className={btn} onClick={() => open('followers')}><span className="text-foreground">{followers}</span> follower{followers === 1 ? '' : 's'}</button>
        <span className="mx-2" aria-hidden="true">-</span>
        <button type="button" className={btn} onClick={() => open('following')}><span className="text-foreground">{following}</span> following</button>
      </p>
      <Dialog open={!!kind} onOpenChange={(o) => { if (!o) setKind(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{kind === 'followers' ? 'Followers' : 'Following'}</DialogTitle></DialogHeader>
          {err ? <p className="py-6 text-center text-sm text-destructive">{err}</p> : !people ? <Spinner /> : !people.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</p>
          ) : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {people.map((p) => (
                <li key={p.id}><Link to={`/u/${p.id}`} onClick={() => setKind(null)} className="flex items-center gap-3 py-2.5 hover:text-primary"><UserAvatar username={p.username} avatarUrl={p.avatarUrl} className="h-9 w-9" /><span className="truncate text-sm font-medium">@{p.username}</span></Link></li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
