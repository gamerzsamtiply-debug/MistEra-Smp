import { useState } from 'react';
import { Images, LogIn } from 'lucide-react';
import { useAuth, loginWithRedirect } from '@/lib/auth';
import { listAlbum } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@project/components/ui/dialog';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import UserChip from '../components/UserChip';
import SubmitImageDialog from '../components/SubmitImageDialog';
import { EmptyState, GridSkeleton, InlineError } from '../components/States';
import { useLoad } from '../lib/useLoad';

export default function AlbumPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useLoad('Load album', () => listAlbum({}));
  const [view, setView] = useState<string | null>(null);
  const cur = data?.images.find((i) => i.id === view);
  return (
    <>
      <PageHeader eyebrow="Community" title="Community Album" subtitle="Screenshots and moments shared by our players.">
        <div className="mt-6">{user ? <SubmitImageDialog /> : <Button onClick={() => loginWithRedirect()}><LogIn className="mr-2 h-4 w-4" />Log in to submit</Button>}</div>
      </PageHeader>
      <div className="container mx-auto px-4 py-12">
        {loading ? <GridSkeleton count={8} className="h-64" /> : error ? <InlineError error={error} onRetry={reload} /> : !data?.images.length ? (
          <EmptyState icon={Images} title="No approved album images" message="Be the first to share a screenshot from MistEra SMP!" />
        ) : (
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
            {data.images.map((a, i) => (
              <Reveal key={a.id} delay={(i % 3) * 0.05}>
                <div className="group break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card">
                  <button className="block w-full overflow-hidden bg-secondary" onClick={() => setView(a.id)}><img src={a.imageUrl} alt={a.caption || 'Album image'} loading="lazy" className="w-full transition-transform duration-500 group-hover:scale-[1.03]" /></button>
                  <div className="flex items-center justify-between gap-2 p-4"><UserChip user={a.uploader} />{a.caption && <p className="truncate text-sm text-muted-foreground">{a.caption}</p>}</div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
      <Dialog open={!!cur} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogTitle className="sr-only">{cur?.caption || 'Album image'}</DialogTitle>
          {cur && <><img src={cur.imageUrl} alt={cur.caption} className="max-h-[75vh] w-full rounded-lg object-contain" /><div className="flex items-center justify-between p-3"><UserChip user={cur.uploader} size="md" /><p className="text-sm text-muted-foreground">{cur.caption}</p></div></>}
        </DialogContent>
      </Dialog>
    </>
  );
}
