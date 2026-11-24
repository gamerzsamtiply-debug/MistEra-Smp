import { useState } from 'react';
import { Newspaper, History } from 'lucide-react';
import { listPosts } from '@/lib/api';
import PageHeader from '../components/PageHeader';
import PostCard, { type Post } from '../components/PostCard';
import PostDialog from '../components/PostDialog';
import Reveal from '../components/Reveal';
import { EmptyState, GridSkeleton, InlineError } from '../components/States';
import { useLoad } from '../lib/useLoad';

export default function PostsPage({ kind }: { kind: 'Announcement' | 'Update' }) {
  const { data, error, loading, reload } = useLoad(`Load ${kind}s`, () => listPosts({ kind }), [kind], { cache: true });
  const [open, setOpen] = useState<Post | null>(null);
  const isA = kind === 'Announcement';
  return (
    <>
      <PageHeader eyebrow={isA ? 'News' : 'Changelog'} title={isA ? 'Announcements' : 'Updates'} subtitle={isA ? 'Official news and events from the MistEra SMP team.' : 'Server changes, new features and patch notes.'} />
      <div className="container mx-auto px-4 py-12">
        {loading ? <GridSkeleton /> : error ? <InlineError error={error} onRetry={reload} /> : !data?.posts.length ? (
          <EmptyState icon={isA ? Newspaper : History} title={isA ? 'No announcements yet' : 'No updates yet'} message="Check back soon - new posts will appear here." />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.posts.map((p, i) => <li key={p.id} className="contents"><Reveal delay={(i % 3) * 0.06}><PostCard post={p} onOpen={() => setOpen(p)} /></Reveal></li>)}
          </ul>
        )}
      </div>
      <PostDialog post={open} onClose={() => setOpen(null)} />
    </>
  );
}
