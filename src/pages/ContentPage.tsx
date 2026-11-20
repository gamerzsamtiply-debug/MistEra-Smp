import { FileText } from 'lucide-react';
import { getPage } from '@/lib/api';
import { Markdown } from '@project/components/markdown';
import PageHeader from '../components/PageHeader';
import WhitelistNotice from '../components/WhitelistNotice';
import { EmptyState, InlineError, Spinner } from '../components/States';
import { useLoad } from '../lib/useLoad';
import { fmtDate } from '../lib/format';

const FALLBACK: Record<string, [string, string]> = {
  information: ['Information', 'About the server'], about: ['About Us', 'MistEra SMP'], rules: ['Server Rules', 'Community'], terms: ['Terms of Service', 'Legal'], privacy: ['Privacy Policy', 'Legal'],
};

export default function ContentPage({ slug }: { slug: 'information' | 'about' | 'rules' | 'terms' | 'privacy' }) {
  const { data, error, loading, reload } = useLoad(`Load ${slug}`, () => getPage({ slug }), [slug], { cache: true });
  const [fallback, eyebrow] = FALLBACK[slug];
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={data?.title || fallback} subtitle={data?.updatedAt ? `Last updated ${fmtDate(data.updatedAt)}` : undefined} />
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-8">
        {slug === 'information' && <WhitelistNotice />}
        {loading ? <Spinner /> : error ? (error.kind === 'notFound' ? <EmptyState icon={FileText} title="Not published yet" message="This page hasn't been published yet. Please check back later." /> : <InlineError error={error} onRetry={reload} />) : (
          <article className="prose-site"><Markdown demoteH1>{data?.content ?? ''}</Markdown></article>
        )}
      </div>
    </>
  );
}
