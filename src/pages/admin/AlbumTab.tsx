import { useState } from 'react';
import Media from '../../components/Media';
import { Check, X, Trash2, Images } from 'lucide-react';
import { adminListAlbum, adminReviewAlbum } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import UserChip from '../../components/UserChip';
import ConfirmDelete from '../../components/ConfirmDelete';
import { GridSkeleton, InlineError, EmptyState } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import { run } from '../../lib/errors';
import { useSite } from '../../lib/site';
import { fmtDate } from '../../lib/format';

type St = 'Pending' | 'Approved' | 'Declined';

export default function AlbumTab({ onChanged }: { onChanged?: () => void } = {}) {
  const { me } = useSite();
  const [status, setStatus] = useState<St>('Pending');
  const { data, error, loading, reload, setData } = useLoad(`Admin album ${status}`, () => adminListAlbum({ status }), [status]);
  const act = async (id: string, action: St | 'Delete') => {
    try {
      await run('Album review', () => adminReviewAlbum({ id, action: action as 'Approved' }), { success: action === 'Delete' ? 'Image deleted' : `Image ${action.toLowerCase()}`, failTitle: 'Album review failed' });
      setData((d) => d && { items: d.items.filter((i) => i.id !== id) });
      onChanged?.();
    } catch { /* shown */ }
  };
  return (
    <div className="space-y-5">
      <Tabs value={status} onValueChange={(v) => setStatus(v as St)}><TabsList><TabsTrigger value="Pending">Pending</TabsTrigger><TabsTrigger value="Approved">Approved</TabsTrigger><TabsTrigger value="Declined">Declined</TabsTrigger></TabsList></Tabs>
      {loading ? <GridSkeleton /> : error ? <InlineError error={error} onRetry={reload} /> : !data?.items.length ? <EmptyState icon={Images} title={`No ${status.toLowerCase()} submissions`} message="Nothing to review here right now." /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((a) => (
          <div key={a.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <a href={a.imageUrl} target="_blank" rel="noreferrer"><Media type={a.mediaType} src={a.imageUrl} alt={a.caption} controls={false} className="aspect-video w-full object-cover" /></a>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between"><UserChip user={a.uploader} /><span className="text-xs text-muted-foreground">{fmtDate(a.submittedAt)}</span></div>
              {a.caption && <p className="text-sm text-muted-foreground">{a.caption}</p>}
              <div className="flex gap-2">
                {status !== 'Approved' && <Button size="sm" className="flex-1" onClick={() => act(a.id, 'Approved')}><Check className="mr-1 h-4 w-4" />Approve</Button>}
                {status !== 'Declined' && <Button size="sm" variant="secondary" className="flex-1" onClick={() => act(a.id, 'Declined')}><X className="mr-1 h-4 w-4" />Decline</Button>}
                {me?.isAdmin && <ConfirmDelete title="Delete this image permanently?" onConfirm={() => act(a.id, 'Delete')}><Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Delete"><Trash2 className="h-4 w-4" /></Button></ConfirmDelete>}
              </div>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
