import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Eye, Images, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { getPublicProfile } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import ProfileHeader from '../components/ProfileHeader';
import FollowButton from '../components/FollowButton';
import FollowStats from '../components/FollowStats';
import Reveal from '../components/Reveal';
import Media from '../components/Media';
import { EmptyState, InlineError, Spinner } from '../components/States';
import ErrorPage from '../components/ErrorPage';
import { useLoad } from '../lib/useLoad';
import { albumAlt } from '../lib/format';
import { sfx } from '../lib/sfx';

type Img = { id: string; mediaType: string; imageUrl: string; caption: string; viewCount: number };

export default function PublicProfile() {
  const { id = '' } = useParams();
  const { data, error, loading, reload } = useLoad('Load profile', () => getPublicProfile({ profileId: id }), [id]);
  const [fol, setFol] = useState<{ following: boolean; followers: number } | null>(null);
  useEffect(() => { setFol(null); }, [id, data]);
  if (loading) return <Spinner />;
  if (error?.kind === 'notFound') return <ErrorPage code="404" message="This player profile doesn't exist." />;
  if (error || !data) return <div className="container mx-auto px-4 py-16">{error && <InlineError error={error} onRetry={reload} />}</div>;
  const p = data.profile;
  const images: Img[] = data.images;
  const views = images.reduce((n, i) => n + (i.viewCount ?? 0), 0);
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success('Profile link copied'); sfx.pop(); } catch { toast.error('Could not copy the link'); }
  };
  return (
    <>
      <ProfileHeader
        profile={p}
        stats={`${images.length} album${images.length === 1 ? '' : 's'} - ${views} view${views === 1 ? '' : 's'}`}
        social={<FollowStats profileId={p.id} followers={fol?.followers ?? p.followers ?? 0} following={p.following ?? 0} />}
        actions={<>
          {!p.isMe && <FollowButton profileId={p.id} following={fol?.following ?? !!p.followedByMe} onChange={(following, followers) => setFol({ following, followers })} />}
          <Button variant="ghost" size="icon" onClick={share} aria-label="Copy profile link"><Share2 className="h-5 w-5" /></Button>
        </>}
      />
      <div className="container mx-auto px-4 pb-12">
        <h2 className="mb-5 text-center text-lg font-semibold">Albums</h2>
        {!images.length ? <EmptyState icon={Images} title="No approved albums" message="This player hasn't had any album posts approved yet." /> : (
          <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
            {images.map((a, i) => (
              <Reveal key={a.id} delay={Math.min(i, 8) * 0.04}>
                <div className="relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card">
                  <Media type={a.mediaType} src={a.imageUrl} alt={albumAlt({ caption: a.caption, uploader: { username: p.username } })} className="w-full object-cover" />
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"><Eye className="h-3 w-3" />{a.viewCount}</span>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
