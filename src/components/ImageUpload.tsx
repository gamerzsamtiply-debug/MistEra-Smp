import { useRef, useState } from 'react';
import { useUpload } from '@/lib/upload';
import { toast } from 'sonner';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { UserAvatar } from './UserChip';
import ImageEditor from './ImageEditor';

const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MAX_MB = 5;

/** Centre-crops a picture to a square (max 640 px) so a profile photo is always a perfect circle. GIFs are left as they are. */
async function squareCrop(f: File): Promise<File> {
  if (f.type === 'image/gif') return f;
  try {
    const bmp = await createImageBitmap(f);
    const side = Math.min(bmp.width, bmp.height);
    const out = Math.min(side, 640);
    const canvas = document.createElement('canvas');
    canvas.width = out; canvas.height = out;
    const g = canvas.getContext('2d');
    if (!g) return f;
    g.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
    bmp.close?.();
    const type = f.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.92));
    return blob ? new File([blob], f.name.replace(/\.\w+$/, '') + (type === 'image/png' ? '.png' : '.jpg'), { type }) : f;
  } catch { return f; }
}

/** `round` = square profile photo (shown as a circle); `banner` = wide 3:1 banner. Every picture can be cropped, zoomed and drawn on before it is uploaded (GIFs are uploaded as they are). */
export default function ImageUpload({ value, onChange, label = 'Upload image', round, banner, name = 'user' }: { value: string; onChange: (url: string) => void; label?: string; round?: boolean; banner?: boolean; name?: string }) {
  const { upload, isUploading } = useUpload();
  const ref = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<File | null>(null);
  const send = async (f: File) => {
    try {
      const { url } = await upload(f);
      onChange(url);
    } catch {
      toast.error('Upload failed', { description: "Your image couldn't be uploaded. Check the file and try again." });
    } finally { if (ref.current) ref.current.value = ''; }
  };
  const pick = (f?: File) => {
    if (!f) return;
    if (!TYPES.includes(f.type)) return toast.error('Unsupported image format', { description: 'Please use PNG, JPG, WEBP or GIF.' });
    if (f.size > MAX_MB * 1024 * 1024) return toast.error('Image too large', { description: `Images must be ${MAX_MB} MB or smaller.` });
    if (f.type === 'image/gif') { void send(f); return; } // animated pictures can't be edited without losing the animation
    setEditing(f);
  };
  const editor = editing && (
    <ImageEditor
      file={editing}
      aspect={round ? 1 : banner ? 3 : null}
      aspects={round || banner ? undefined : [{ label: 'Original', value: null }, { label: '1:1', value: 1 }, { label: '4:3', value: 4 / 3 }, { label: '16:9', value: 16 / 9 }]}
      outMax={round ? 640 : banner ? 1500 : 1600}
      title={round ? 'Edit your photo' : banner ? 'Edit your banner' : 'Edit your picture'}
      onCancel={() => { setEditing(null); if (ref.current) ref.current.value = ''; }}
      onDone={(edited) => { setEditing(null); void send(edited); }}
      onSkip={() => { const f = editing; setEditing(null); void (round ? squareCrop(f).then(send) : send(f)); }}
    />
  );
  const input = <input ref={ref} type="file" accept={TYPES.join(',')} hidden onChange={(e) => pick(e.target.files?.[0])} />;

  // Profile photo: a round preview, tap to change.
  if (round) {
    return (
      <div className="flex flex-col items-center gap-3">
        <button type="button" disabled={isUploading} onClick={() => ref.current?.click()} className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={label}>
          <UserAvatar username={name} avatarUrl={value} className="h-32 w-32 text-4xl ring-4 ring-border transition group-hover:ring-primary/60" />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
          </span>
          {isUploading && <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45"><Loader2 className="h-6 w-6 animate-spin text-white" /></span>}
        </button>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={isUploading} onClick={() => ref.current?.click()}>{value ? 'Change photo' : label}</Button>
          {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>Remove</Button>}
        </div>
        <p className="text-xs text-muted-foreground">Shown as a circle - PNG, JPG, WEBP or GIF, up to {MAX_MB} MB</p>
        {input}
        {editor}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-border">
          <img src={value} alt="" className={banner ? "aspect-[3/1] w-full object-cover" : "max-h-56 w-full object-cover"} />
          <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2 h-8 w-8" onClick={() => onChange('')} aria-label="Remove image"><X className="h-4 w-4" /></Button>
        </div>
      ) : (
        <button type="button" disabled={isUploading} onClick={() => ref.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 py-8 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground disabled:opacity-60">
          {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <ImagePlus className="h-6 w-6 text-primary" />}
          {isUploading ? 'Uploading...' : label}
          <span className="text-xs">PNG, JPG, WEBP or GIF - up to {MAX_MB} MB</span>
        </button>
      )}
      {input}
      {editor}
    </div>
  );
}
