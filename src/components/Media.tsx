import { cn } from '@project/components/lib/utils';

/** A photo or a video from the album. Videos get native controls and only preload their first frame. */
export default function Media({ type, src, alt, className, controls = true }: { type?: 'image' | 'video' | string; src: string; alt?: string; className?: string; controls?: boolean }) {
  if (type === 'video') {
    return <video src={src} controls={controls} playsInline preload="metadata" className={cn('bg-black', className)} aria-label={alt || 'Video'} />;
  }
  return <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" className={className} />;
}
