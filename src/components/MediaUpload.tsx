import { useRef } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { useUpload } from '@/lib/upload';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const MAX_IMAGE_MB = 5;
export const MAX_VIDEO_MB = 50;

export interface UploadedMedia { url: string; type: 'image' | 'video' }

/** Photo or video picker for the community album. Uploads straight to storage and reports the public URL and the kind. */
export default function MediaUpload({ value, onChange }: { value: UploadedMedia | null; onChange: (m: UploadedMedia | null) => void }) {
  const { upload, isUploading } = useUpload();
  const ref = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    const isVideo = VIDEO_TYPES.includes(f.type);
    if (!isVideo && !IMAGE_TYPES.includes(f.type)) return toast.error('Unsupported file', { description: 'Use PNG, JPG, WEBP or GIF for photos, or MP4, WEBM or MOV for videos.' });
    const max = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (f.size > max * 1024 * 1024) return toast.error(isVideo ? 'Video too large' : 'Image too large', { description: `${isVideo ? 'Videos' : 'Images'} must be ${max} MB or smaller.` });
    try {
      const { url } = await upload(f);
      onChange({ url, type: isVideo ? 'video' : 'image' });
    } catch {
      toast.error('Upload failed', { description: "Your file couldn't be uploaded. Check it and try again." });
    } finally { if (ref.current) ref.current.value = ''; }
  };
  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-border">
          {value.type === 'video'
            ? <video src={value.url} controls playsInline preload="metadata" className="max-h-64 w-full bg-black" />
            : <img src={value.url} alt="" className="max-h-64 w-full object-cover" />}
          <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2 h-8 w-8" onClick={() => onChange(null)} aria-label="Remove file"><X className="h-4 w-4" /></Button>
        </div>
      ) : (
        <button type="button" disabled={isUploading} onClick={() => ref.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 py-8 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground disabled:opacity-60">
          {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <ImagePlus className="h-6 w-6 text-primary" />}
          {isUploading ? 'Uploading...' : 'Upload a photo or video'}
          <span className="text-xs">Photos up to {MAX_IMAGE_MB} MB - videos (MP4, WEBM, MOV) up to {MAX_VIDEO_MB} MB</span>
        </button>
      )}
      <input ref={ref} type="file" accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(',')} hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
