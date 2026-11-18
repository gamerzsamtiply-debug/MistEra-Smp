import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@project/components/ui/dialog';
import { fmtDate } from '../lib/format';
import type { Post } from './PostCard';

export default function PostDialog({ post, onClose }: { post: Post | null; onClose: () => void }) {
  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        {post && (<>
          {post.imageUrl && <img src={post.imageUrl} alt="" className="-mx-6 -mt-6 mb-2 max-h-72 w-[calc(100%+3rem)] max-w-none object-cover" />}
          <DialogHeader><DialogTitle className="text-2xl">{post.title}</DialogTitle><DialogDescription>{fmtDate(post.publishedAt)}</DialogDescription></DialogHeader>
          <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{post.body}</p>
        </>)}
      </DialogContent>
    </Dialog>
  );
}
