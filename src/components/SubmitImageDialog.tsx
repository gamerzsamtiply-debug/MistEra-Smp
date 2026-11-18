import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { submitAlbum } from '@/lib/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@project/components/ui/dialog';
import ImageUpload from './ImageUpload';
import { run } from '../lib/errors';

export default function SubmitImageDialog({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!url) return setErr('Please upload an image first.');
    if (caption.length > 120) return setErr('Caption must be 120 characters or fewer.');
    setErr(''); setBusy(true);
    try {
      await run('Album submission', () => submitAlbum({ imageUrl: url, caption }), { success: 'Image submitted! It will appear after staff approval.', failTitle: 'Album submission failed' });
      setUrl(''); setCaption(''); setOpen(false); onDone?.();
    } catch { /* toast shown; input preserved */ } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild><Button><Upload className="mr-2 h-4 w-4" />Submit an image</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Submit to the album</DialogTitle><DialogDescription>Images are reviewed by staff before they appear publicly.</DialogDescription></DialogHeader>
        <ImageUpload value={url} onChange={(u) => { setUrl(u); setErr(''); }} />
        <div className="space-y-1.5"><Label htmlFor="cap">Caption (optional)</Label><Input id="cap" maxLength={120} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="My castle at sunset" /></div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter><Button onClick={submit} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for review</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
