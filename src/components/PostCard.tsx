import { CalendarDays } from 'lucide-react';
import { fmtDate } from '../lib/format';

export interface Post { id: string; title: string; body: string; imageUrl: string; publishedAt: string }

export default function PostCard({ post, onOpen }: { post: Post; onOpen?: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition-shadow hover:border-primary/50">
      {post.imageUrl && <div className="aspect-video overflow-hidden bg-secondary"><img src={post.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>}
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(post.publishedAt)}</p>
        <h2 className="mt-2 text-lg font-semibold leading-snug group-hover:text-primary transition-colors">{post.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground whitespace-pre-line">{post.body}</p>
        <span className="mt-auto pt-4 text-sm font-semibold text-gold">Read more</span>
      </div>
    </button>
  );
}
