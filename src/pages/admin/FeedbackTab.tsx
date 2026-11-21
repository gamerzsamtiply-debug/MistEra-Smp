import { MessageSquare, Trash2 } from 'lucide-react';
import { adminListFeedback, adminDeleteFeedback } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import ConfirmDelete from '../../components/ConfirmDelete';
import { Spinner, InlineError, EmptyState } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import { run } from '../../lib/errors';
import { fmtDateTime } from '../../lib/format';

interface Item { id: string; name: string; contact: string; message: string; createdAt: string }

export default function FeedbackTab() {
  const { data, error, loading, reload, setData } = useLoad('Admin feedback', () => adminListFeedback({}));
  const del = async (id: string) => {
    try {
      await run('Delete feedback', () => adminDeleteFeedback({ id }), { success: 'Feedback deleted' });
      setData((d) => d && { items: (d.items as Item[]).filter((i) => i.id !== id) });
    } catch { /* shown */ }
  };
  if (loading) return <Spinner />;
  if (error) return <InlineError error={error} onRetry={reload} />;
  const items = (data?.items ?? []) as Item[];
  if (!items.length) return <EmptyState icon={MessageSquare} title="No feedback yet" message="Messages from the Feedback page will appear here." />;
  return (
    <div className="space-y-3">
      {items.map((f) => (
        <div key={f.id} className="glass p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{f.name || 'Anonymous'}</span>{f.contact && <> - {f.contact}</>} - {fmtDateTime(f.createdAt)}</div>
            <ConfirmDelete title="Delete this feedback?" onConfirm={() => del(f.id)}><Button size="icon" variant="ghost" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></ConfirmDelete>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm">{f.message}</p>
        </div>
      ))}
    </div>
  );
}
