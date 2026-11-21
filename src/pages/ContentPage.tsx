import { Component, type ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { report } from '../lib/errors';
import { getPage } from '@/lib/api';
import { Markdown } from '@project/components/markdown';
import PageHeader from '../components/PageHeader';
import WhitelistNotice from '../components/WhitelistNotice';
import { EmptyState, InlineError, Spinner } from '../components/States';
import { useLoad } from '../lib/useLoad';
import { fmtDate } from '../lib/format';

/** If the markdown renderer ever crashes, show the text as plain paragraphs instead of the 500 page. */
class SafeMarkdown extends Component<{ text: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[markdown render error]', error, info?.componentStack);
    report('Render markdown', new Error(`${String(error?.message ?? '').slice(0, 150)} @ ${String(info?.componentStack ?? '').trim().split('\n')[0]?.slice(0, 120)}`), 'render');
  }
  render(): ReactNode {
    if (this.state.failed) return <div className="space-y-4">{this.props.text.split(/\n\s*\n/).map((t, i) => <p key={i} className="whitespace-pre-line text-muted-foreground leading-relaxed">{t.replace(/[#*_`>]/g, '')}</p>)}</div>;
    return <Markdown demoteH1>{this.props.text}</Markdown>;
  }
}

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
          <article className="prose-site"><SafeMarkdown text={typeof data?.content === 'string' ? data.content : ''} /></article>
        )}
      </div>
    </>
  );
}
