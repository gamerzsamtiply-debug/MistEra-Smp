import { Images, LogIn } from 'lucide-react';
import { useAuth, loginWithRedirect } from '@/lib/auth';
import { listAlbum } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import AlbumPost from '../components/AlbumPost';
import SubmitImageDialog from '../components/SubmitImageDialog';
import { EmptyState, GridSkeleton, InlineError } from '../components/States';
import { useLoad } from '../lib/useLoad';

export default function AlbumPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useLoad('Load album', () => listAlbum({}), [user?.id ?? '']);
  return (
    <>
      <PageHeader eyebrow="Community" title="Community Album" subtitle="Screenshots, builds and videos shared by our players. Like, comment and reply.">
        <div className="mt-6">{user ? <SubmitImageDialog /> : <Button onClick={() => loginWithRedirect()}><LogIn className="mr-2 h-4 w-4" />Log in to post</Button>}</div>
      </PageHeader>
      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        {loading ? <GridSkeleton count={2} className="h-96" /> : error ? <InlineError error={error} onRetry={reload} /> : !data?.images?.length ? (
          <EmptyState icon={Images} title="No posts yet" message="Be the first to share a screenshot or video from MistEra SMP!" />
        ) : (
          <div className="space-y-6">
            {data.images.map((p, i) => <Reveal key={p.id} delay={Math.min(i, 4) * 0.05}><AlbumPost post={p} /></Reveal>)}
          </div>
        )}
      </div>
    </>
  );
}
