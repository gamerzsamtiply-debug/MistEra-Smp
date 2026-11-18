import { useParams } from 'react-router-dom';
import { Images } from 'lucide-react';
import { getPublicProfile } from '@/lib/api';
import RoleBadge from '../components/RoleBadge';
import Reveal from '../components/Reveal';
import { UserAvatar } from '../components/UserChip';
import { EmptyState, InlineError, Spinner } from '../components/States';
import ErrorPage from '../components/ErrorPage';
import { useLoad } from '../lib/useLoad';
import { fmtDate } from '../lib/format';

export default function PublicProfile() {
  const { id = '' } = useParams();
  const { data, error, loading, reload } = useLoad('Load profile', () => getPublicProfile({ profileId: id }), [id]);
  if (loading) return <Spinner />;
  if (error?.kind === 'notFound') return <ErrorPage code="404" message="This player profile doesn't exist." />;
  if (error || !data) return <div className="container mx-auto px-4 py-16">{error && <InlineError error={error} onRetry={reload} />}</div>;
  const p = data.profile;
  return (
    <>
      <section className="sky-glow border-b border-border">
        <div className="container mx-auto flex flex-col items-center gap-5 px-4 py-14 text-center md:flex-row md:text-left">
          <UserAvatar username={p.username} avatarUrl={p.avatarUrl} className="h-28 w-28 text-3xl ring-4 ring-primary/40" />
          <div>
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start"><h1 className="text-4xl font-extrabold">@{p.username}</h1><RoleBadge role={p.role} /></div>
            {p.joinedAt && <p className="mt-1 text-sm text-muted-foreground">Member since {fmtDate(p.joinedAt)}</p>}
            <p className="mt-3 max-w-xl whitespace-pre-line text-muted-foreground">{p.bio || 'This player hasn’t written a bio yet.'}</p>
          </div>
        </div>
      </section>
      <div className="container mx-auto px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold">Album</h2>
        {!data.images.length ? <EmptyState icon={Images} title="No approved images" message="This player hasn't had any album images approved yet." /> : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{data.images.map((a, i) => <Reveal key={a.id} delay={i * 0.04}><img src={a.imageUrl} alt={a.caption} loading="lazy" className="aspect-square w-full rounded-2xl border border-border object-cover" /></Reveal>)}</div>
        )}
      </div>
    </>
  );
}
