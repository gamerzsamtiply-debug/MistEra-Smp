import { useRef } from 'react';
import { useUpload } from '@/lib/upload';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';

const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const MAX_MB = 5;

export default function ImageUpload({ value, onChange, label = 'Upload image' }: { value: string; onChange: (url: string) => void; label?: string }) {
  const { upload, isUploading } = useUpload();
  const ref = useRef<HTMLInputElement>(null);
  const pick = async (f?: File) => {
    if (!f) return;
    if (!TYPES.includes(f.type)) return toast.error('Unsupported image format', { description: 'Please use PNG, JPG, WEBP or GIF.' });
    if (f.size > MAX_MB * 1024 * 1024) return toast.error('Image too large', { description: `Images must be ${MAX_MB} MB or smaller.` });
    try {
      const { url } = await upload(f);
      onChange(url);
    } catch {
      toast.error('Upload failed', { description: "Your image couldn't be uploaded. Check the file and try again." });
    } finally { if (ref.current) ref.current.value = ''; }
  };
  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-border">
          <img src={value} alt="" className="max-h-56 w-full object-cover" />
          <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2 h-8 w-8" onClick={() => onChange('')} aria-label="Remove image"><X className="h-4 w-4" /></Button>
        </div>
      ) : (
        <button type="button" disabled={isUploading} onClick={() => ref.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 py-8 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground disabled:opacity-60">
          {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <ImagePlus className="h-6 w-6 text-primary" />}
          {isUploading ? 'Uploading…' : label}
          <span className="text-xs">PNG, JPG, WEBP or GIF · up to {MAX_MB} MB</span>
        </button>
      )}
      <input ref={ref} type="file" accept={TYPES.join(',')} hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
