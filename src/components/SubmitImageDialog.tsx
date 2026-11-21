import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { submitAlbum } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { Label } from '@project/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@project/components/ui/dialog';
import MediaUpload, { type UploadedMedia } from './MediaUpload';
import { run } from '../lib/errors';

export default function SubmitImageDialog({ onDone, label = 'Post a photo or video', variant }: { onDone?: () => void; label?: string; variant?: 'default' | 'secondary' | 'outline' }) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!media) return setErr('Please upload a photo or video first.');
    if (caption.length > 300) return setErr('Caption must be 300 characters or fewer.');
    setErr(''); setBusy(true);
    try {
      await run('Album submission', () => submitAlbum({ imageUrl: media.url, mediaType: media.type, caption }), { success: 'Submitted! It will appear after staff approval.', failTitle: 'Album submission failed' });
      setMedia(null); setCaption(''); setOpen(false); onDone?.();
    } catch { /* toast shown; input preserved */ } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild><Button variant={variant}><Upload className="mr-2 h-4 w-4" />{label}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Post to the album</DialogTitle><DialogDescription>Posts are reviewed by staff before they appear publicly.</DialogDescription></DialogHeader>
        <MediaUpload value={media} onChange={(m) => { setMedia(m); setErr(''); }} />
        <div className="space-y-1.5">
          <Label htmlFor="cap">Caption (optional)</Label>
          <Textarea id="cap" rows={3} maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="My castle at sunset" />
          <p className="text-right text-xs text-muted-foreground">{caption.length}/300</p>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter><Button onClick={submit} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for review</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
