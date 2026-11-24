import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { Download, Eye, Heart, Link2, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addAlbumComment, deleteAlbumComment, listAlbumComments, toggleAlbumLike, trackAlbumView, type AlbumComment, type AlbumItem } from '@/lib/api';
import { visitorId } from '@/lib/visitor';
import { sfx } from '@/lib/sfx';
import { useAuth } from '@/lib/auth';
import { getGuestName, randomGuestName, setGuestName, validGuestName } from '@/lib/guest';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@project/components/ui/dialog';
import { cn } from '@project/components/lib/utils';
import { UserAvatar } from './UserChip';
import Media from './Media';
import { albumAlt } from '../lib/format';
import { downloadUrl } from '../lib/media';
import { run } from '../lib/errors';

const CAPTION_LIMIT = 30;
const counted = new Set<string>(); // posts already counted in this tab

const ago = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '' : `${formatDistanceToNowStrict(d)} ago`; };

/** Captions up to 30 characters are shown in full; longer ones are cut with a "show more" toggle. */
function Caption({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const long = text.length > CAPTION_LIMIT;
  return (
    <p className="mt-3 whitespace-pre-line break-words text-sm">
      {long && !open ? `${text.slice(0, CAPTION_LIMIT).trimEnd()}...` : text}
      {long && <button type="button" onClick={() => setOpen((o) => !o)} className="ml-1.5 font-medium text-primary hover:underline">{open ? 'show less' : 'show more'}</button>}
    </p>
  );
}

function CommentInput({ placeholder, onSubmit, autoFocus, onCancel }: { placeholder: string; onSubmit: (text: string) => Promise<boolean>; autoFocus?: boolean; onCancel?: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try { if (await onSubmit(t)) setText(''); } finally { setBusy(false); }
  };
  return (
    <div className="flex items-center gap-2">
      <Input value={text} autoFocus={autoFocus} maxLength={500} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void send(); } if (e.key === 'Escape') onCancel?.(); }} className="h-9" />
      <Button type="button" size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={busy || !text.trim()} aria-label="Send">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
      {onCancel && <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>}
    </div>
  );
}

function CommentRow({ c, onReply, onDelete, small }: { c: AlbumComment; onReply?: () => void; onDelete: () => void; small?: boolean }) {
  return (
    <div className="flex gap-2.5">
      {c.user ? <Link to={`/u/${c.user.id}`}><UserAvatar username={c.user.username} avatarUrl={c.user.avatarUrl} className={small ? 'h-6 w-6' : 'h-8 w-8'} /></Link> : <UserAvatar username={c.guestName ?? '??'} className={small ? 'h-6 w-6' : 'h-8 w-8'} />}
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm"><span className="font-semibold">{c.user ? `@${c.user.username}` : c.guestName ? c.guestName : 'Former member'}</span>{!c.user && c.guestName && <span className="ml-1.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Guest</span>} <span className="text-foreground/90">{c.body}</span></p>
        <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{ago(c.createdAt)}</span>
          {onReply && <button type="button" onClick={onReply} className="font-medium hover:text-foreground">Reply</button>}
          {c.canDelete && <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 hover:text-destructive"><Trash2 className="h-3 w-3" />Delete</button>}
        </p>
      </div>
    </div>
  );
}

/** Shown to a guest the first time they comment: pick the name the comment will carry (a random one is suggested). */
function GuestNameForm({ onDone, onCancel, initial }: { onDone: (name: string) => void; onCancel: () => void; initial?: string }) {
  const [name, setName] = useState(initial || randomGuestName());
  const ok = validGuestName(name);
  const save = () => { if (!ok) return; setGuestName(name); onDone(name.trim()); };
  return (
    <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
      <p className="text-sm font-medium">Set guest name</p>
      <p className="text-xs text-muted-foreground">This is the name shown on your comments. You can change it any time. Log in to comment as yourself.</p>
      <div className="flex items-center gap-2">
        <Input value={name} maxLength={24} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} className="h-9" aria-label="Guest name" />
        <Button type="button" size="sm" onClick={save} disabled={!ok}>Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
      {!ok && <p className="text-xs text-destructive">2 to 24 characters: letters, numbers, spaces, _ . -</p>}
    </div>
  );
}

function Comments({ postId, onCount }: { postId: string; onCount: (delta: number) => void }) {
  const [items, setItems] = useState<AlbumComment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [guestName, setGuest] = useState(getGuestName());
  const [namingGuest, setNamingGuest] = useState(false);
  const { user } = useAuth();

  const load = useCallback(() => {
    setFailed(false);
    listAlbumComments({ id: postId, visitorId: visitorId() }).then((d) => setItems(d.comments)).catch(() => setFailed(true));
  }, [postId]);
  useEffect(() => { load(); }, [load]); // loads when the section opens

  const add = async (body: string, parentId: string | null): Promise<boolean> => {
    if (!user && !guestName) { setNamingGuest(true); return false; } // a guest picks a name before the first comment
    try {
      const r = await run('Add comment', () => addAlbumComment({ id: postId, body, parentId, ...(user ? {} : { visitorId: visitorId(), guestName }) }), { failTitle: 'Could not post your comment' });
      if (!r) return false;
      setItems((cur) => [...(cur ?? []), r.comment]);
      onCount(1);
      setReplyTo(null);
      return true;
    } catch { return false; }
  };
  const remove = async (c: AlbumComment) => {
    try {
      await run('Delete comment', () => deleteAlbumComment({ id: c.id, visitorId: visitorId() }), { failTitle: 'Could not delete the comment' });
      setItems((cur) => {
        const list = cur ?? [];
        const gone = new Set([c.id, ...list.filter((x) => x.parentId === c.id).map((x) => x.id)]);
        onCount(-gone.size);
        return list.filter((x) => !gone.has(x.id));
      });
    } catch { /* toast shown */ }
  };

  const tops = (items ?? []).filter((c) => !c.parentId);
  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      {namingGuest && <GuestNameForm initial={guestName} onDone={(n) => { setGuest(n); setNamingGuest(false); }} onCancel={() => setNamingGuest(false)} />}
      <CommentInput placeholder="Add a comment..." onSubmit={(t) => add(t, null)} />
      {!user && guestName && !namingGuest && <p className="-mt-2 text-xs text-muted-foreground">Commenting as <span className="font-medium text-foreground">{guestName}</span> (guest) · <button type="button" className="font-medium text-primary hover:underline" onClick={() => setNamingGuest(true)}>Change name</button></p>}
      {failed ? <p className="text-sm text-muted-foreground">Comments could not be loaded. <button type="button" className="font-medium text-primary hover:underline" onClick={load}>Try again</button></p>
        : items === null ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading comments...</p>
        : !tops.length ? <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
        : (
          <ul className="space-y-4">
            {tops.map((c) => {
              const replies = (items ?? []).filter((r) => r.parentId === c.id);
              return (
                <li key={c.id} className="space-y-3">
                  <CommentRow c={c} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} onDelete={() => remove(c)} />
                  {(replies.length > 0 || replyTo === c.id) && (
                    <div className="ml-10 space-y-3 border-l border-border pl-3">
                      {replies.map((r) => <CommentRow key={r.id} c={r} small onReply={() => setReplyTo(c.id)} onDelete={() => remove(r)} />)}
                      {replyTo === c.id && <CommentInput autoFocus placeholder={`Reply to @${c.user?.username ?? 'member'}...`} onSubmit={(t) => add(t, c.id)} onCancel={() => setReplyTo(null)} />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}

/** One album post: author on top, photo/video, like + comment buttons, caption with "show more", and a comment thread. */
export default function AlbumPost({ post }: { post: AlbumItem }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likeCount);
  const [comments, setComments] = useState(post.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [views, setViews] = useState(post.viewCount ?? 0);
  const [viewer, setViewer] = useState(false);
  const dl = downloadUrl(post.imageUrl, `mistera-smp-${post.uploader?.username ?? 'album'}`);
  const ref = useRef<HTMLElement>(null);

  // A view is counted when at least half of the post has been on screen for a second (once per person per post).
  useEffect(() => {
    const el = ref.current;
    if (!el || counted.has(post.id) || typeof IntersectionObserver === 'undefined') return;
    let timer: number | undefined;
    const io = new IntersectionObserver(([e]) => {
      window.clearTimeout(timer);
      if (e?.isIntersecting) {
        timer = window.setTimeout(() => {
          if (counted.has(post.id)) return;
          counted.add(post.id);
          io.disconnect();
          trackAlbumView({ id: post.id, visitorId: visitorId() }).then((r) => setViews((v) => Math.max(v, r.views))).catch(() => counted.delete(post.id));
        }, 1000);
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { window.clearTimeout(timer); io.disconnect(); };
  }, [post.id]);

  const shareLink = async () => {
    const url = `${window.location.origin}/album/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement('textarea'); t.value = url; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch { /* clipboard blocked */ }
      t.remove();
    }
    toast.success('Link copied', { description: 'Anyone with this link can watch it - no account needed.' });
  };

  const like = async () => {
    const was = liked;
    setLiked(!was); setLikes((n) => Math.max(0, n + (was ? -1 : 1))); if (!was) sfx.pop(); // instant feedback, corrected by the server answer
    try {
      const r = await run('Like', () => toggleAlbumLike({ id: post.id, ...(user ? {} : { visitorId: visitorId() }) }), { failTitle: 'Could not update your like' });
      if (r) { setLiked(r.liked); setLikes(r.likes); }
    } catch { setLiked(was); setLikes(post.likeCount); }
  };

  return (
    <article ref={ref} className="surface overflow-hidden">
      <header className="flex items-center gap-3 p-4">
        {post.uploader ? (
          <Link to={`/u/${post.uploader.id}`} className="group flex min-w-0 items-center gap-3">
            <UserAvatar username={post.uploader.username} avatarUrl={post.uploader.avatarUrl} className="h-10 w-10" />
            <span className="min-w-0"><span className="block truncate text-sm font-semibold group-hover:text-primary">@{post.uploader.username}</span><span className="block text-xs text-muted-foreground">{ago(post.submittedAt)}</span></span>
          </Link>
        ) : (
          <><UserAvatar username="??" className="h-10 w-10" /><span><span className="block text-sm font-semibold">Former member</span><span className="block text-xs text-muted-foreground">{ago(post.submittedAt)}</span></span></>
        )}
      </header>
      {post.mediaType === 'video'
        ? <Media type={post.mediaType} src={post.imageUrl} alt={albumAlt(post)} className="max-h-[70vh] w-full bg-secondary object-contain" />
        : <button type="button" onClick={() => setViewer(true)} className="block w-full cursor-zoom-in" aria-label="Open picture"><Media type={post.mediaType} src={post.imageUrl} alt={albumAlt(post)} className="max-h-[70vh] w-full bg-secondary object-contain" /></button>}
      <div className="p-4">
        <div className="flex items-center gap-5">
          <button type="button" onClick={like} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} className={cn('like-btn inline-flex items-center gap-1.5 text-sm font-medium transition-colors', liked ? 'text-rose-500' : 'text-muted-foreground hover:text-foreground')}>
            <Heart className={cn('h-5 w-5', liked && 'fill-current is-liked')} />{likes}
          </button>
          <button type="button" onClick={() => setShowComments((s) => !s)} aria-expanded={showComments} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <MessageCircle className="h-5 w-5" />{comments}
          </button>
          <button type="button" onClick={shareLink} aria-label="Copy link" title="Copy link" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><Link2 className="h-5 w-5" /></button>
          <a href={dl} download aria-label={post.mediaType === 'video' ? 'Download video' : 'Download picture'} title="Download" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><Download className="h-5 w-5" /></a>
          <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground" title={`${views} views`} aria-label={`${views} views`}><Eye className="h-5 w-5" />{views}</span>
        </div>
        <Caption text={post.caption} />
        {showComments && <Comments postId={post.id} onCount={(d) => setComments((n) => Math.max(0, n + d))} />}
      </div>
      {post.mediaType !== 'video' && (
        <Dialog open={viewer} onOpenChange={setViewer}>
          <DialogContent className="max-h-[94vh] max-w-4xl gap-3 overflow-y-auto p-3">
            <DialogTitle className="sr-only">Picture by @{post.uploader?.username ?? 'a former member'}</DialogTitle>
            <DialogDescription className="sr-only">Full-size picture. Use the Download button to save it.</DialogDescription>
            <img src={post.imageUrl} alt={albumAlt(post)} className="max-h-[78vh] w-full rounded-lg bg-black object-contain" />
            <div className="flex justify-end"><Button asChild><a href={dl} download><Download className="mr-2 h-4 w-4" />Download</a></Button></div>
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
}
