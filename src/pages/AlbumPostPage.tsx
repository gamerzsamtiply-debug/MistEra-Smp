import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { getAlbumPost } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import AlbumPost from '../components/AlbumPost';
import ErrorPage from '../components/ErrorPage';
import { GridSkeleton, InlineError } from '../components/States';
import { useLoad } from '../lib/useLoad';
import { visitorId } from '../lib/visitor';

/** What a shared link (/album/<id>) opens: that one photo or video with its likes and comments. Works without an account. */
export default function AlbumPostPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { data, error, loading, reload } = useLoad('Load album post', () => getAlbumPost({ id, visitorId: visitorId() }), [id, user?.id ?? '']);
  if (!loading && error && error.kind === 'notFound') return <ErrorPage code="404" message="This post is no longer available." />;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/album"><ArrowLeft className="mr-2 h-4 w-4" />Community Album</Link></Button>
      {loading ? <GridSkeleton count={1} className="h-96" /> : error ? <InlineError error={error} onRetry={reload} /> : data?.post ? <AlbumPost post={data.post} /> : null}
    </div>
  );
}
