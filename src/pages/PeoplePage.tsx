import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MessageCircle, Search, Users } from 'lucide-react';
import { listPeople, type PersonCard } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { UserAvatar } from '../components/UserChip';
import RoleBadge from '../components/RoleBadge';
import FollowButton from '../components/FollowButton';
import { EmptyState, Spinner } from '../components/States';
import { errText } from '../lib/social';

/** "Add friend": search members by name or browse everyone. Tap a member to open their profile (follow + inbox live there too). */
export default function PeoplePage() {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [people, setPeople] = useState<PersonCard[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyMore, setBusyMore] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  useEffect(() => { const t = window.setTimeout(() => setTerm(q.trim()), 300); return () => window.clearTimeout(t); }, [q]);
  useEffect(() => {
    const my = ++seq.current;
    setLoading(true); setError('');
    listPeople({ q: term || undefined, offset: 0 })
      .then((d) => { if (my === seq.current) { setPeople(d.people); setMore(d.hasMore); } })
      .catch((e) => { if (my === seq.current) setError(errText(e)); })
      .finally(() => { if (my === seq.current) setLoading(false); });
  }, [term]);

  const loadMore = async () => {
    setBusyMore(true);
    try { const d = await listPeople({ q: term || undefined, offset: people.length }); setPeople((p) => [...p, ...d.people]); setMore(d.hasMore); }
    catch (e) { setError(errText(e)); } finally { setBusyMore(false); }
  };
  const setFollowing = (id: string, following: boolean) => setPeople((l) => l.map((p) => (p.id === id ? { ...p, following } : p)));

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Add friend</h1>
      <p className="mt-1 text-sm text-muted-foreground">Search for a player, or browse everyone. Follow someone to send them a message.</p>
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username" className="pl-9" maxLength={40} aria-label="Search members" />
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-5">
        {loading ? <Spinner /> : !people.length ? (
          <EmptyState icon={Users} title={term ? 'No one found' : 'No members yet'} message={term ? `Nobody matches "${term}". Check the spelling or try fewer letters.` : 'Members will appear here once they sign up.'} />
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <Link to={`/u/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3" aria-label={`Open ${p.username}'s profile`}>
                  <UserAvatar username={p.username} avatarUrl={p.avatarUrl} className="h-11 w-11" />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold">@{p.username}</span>{p.role !== 'Member' && <RoleBadge role={p.role} />}</span>
                    {p.bio && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{p.bio}</span>}
                  </span>
                </Link>
                {p.isMe ? <span className="text-xs text-muted-foreground">You</span> : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {p.following && <Button asChild size="icon" variant="ghost" aria-label={`Message ${p.username}`}><Link to={`/inbox/${p.id}`}><MessageCircle className="h-4 w-4" /></Link></Button>}
                    <FollowButton size="sm" profileId={p.id} following={p.following} onChange={(f) => setFollowing(p.id, f)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {more && !loading && <div className="mt-4 flex justify-center"><Button variant="secondary" onClick={loadMore} disabled={busyMore}>{busyMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Show more</Button></div>}
      </div>
    </div>
  );
}
