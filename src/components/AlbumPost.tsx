import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { Heart, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import { addAlbumComment, deleteAlbumComment, listAlbumComments, toggleAlbumLike, type AlbumComment, type AlbumItem } from '@/lib/api';
import { loginWithRedirect, useAuth } from '@/lib/auth';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { UserAvatar } from './UserChip';
import Media from './Media';
import { albumAlt } from '../lib/format';
import { run } from '../lib/errors';

const CAPTION_LIMIT = 30;

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
      {c.user ? <Link to={`/u/${c.user.id}`}><UserAvatar username={c.user.username} avatarUrl={c.user.avatarUrl} className={small ? 'h-6 w-6' : 'h-8 w-8'} /></Link> : <UserAvatar username="??" className={small ? 'h-6 w-6' : 'h-8 w-8'} />}
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm"><span className="font-semibold">{c.user ? `@${c.user.username}` : 'Former member'}</span> <span className="text-foreground/90">{c.body}</span></p>
        <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{ago(c.createdAt)}</span>
          {onReply && <button type="button" onClick={onReply} className="font-medium hover:text-foreground">Reply</button>}
          {c.canDelete && <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 hover:text-destructive"><Trash2 className="h-3 w-3" />Delete</button>}
        </p>
      </div>
    </div>
  );
}

function Comments({ postId, onCount }: { postId: string; onCount: (delta: number) => void }) {
  const [items, setItems] = useState<AlbumComment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const { user } = useAuth();

  const load = useCallback(() => {
    setFailed(false);
    listAlbumComments({ id: postId }).then((d) => setItems(d.comments)).catch(() => setFailed(true));
  }, [postId]);
  useEffect(() => { load(); }, [load]); // loads when the section opens

  const add = async (body: string, parentId: string | null): Promise<boolean> => {
    if (!user) { loginWithRedirect(); return false; }
    try {
      const r = await run('Add comment', () => addAlbumComment({ id: postId, body, parentId }), { failTitle: 'Could not post your comment' });
      if (!r) return false;
      setItems((cur) => [...(cur ?? []), r.comment]);
      onCount(1);
      setReplyTo(null);
      return true;
    } catch { return false; }
  };
  const remove = async (c: AlbumComment) => {
    try {
      await run('Delete comment', () => deleteAlbumComment({ id: c.id }), { failTitle: 'Could not delete the comment' });
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
      {user ? <CommentInput placeholder="Add a comment..." onSubmit={(t) => add(t, null)} /> : <button type="button" onClick={() => loginWithRedirect()} className="text-sm font-medium text-primary hover:underline">Log in to comment</button>}
      {failed ? <p className="text-sm text-muted-foreground">Comments could not be loaded. <button type="button" className="font-medium text-primary hover:underline" onClick={load}>Try again</button></p>
        : items === null ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading comments...</p>
        : !tops.length ? <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
        : (
          <ul className="space-y-4">
            {tops.map((c) => {
              const replies = (items ?? []).filter((r) => r.parentId === c.id);
              return (
                <li key={c.id} className="space-y-3">
                  <CommentRow c={c} onReply={() => (user ? setReplyTo(replyTo === c.id ? null : c.id) : loginWithRedirect())} onDelete={() => remove(c)} />
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

  const like = async () => {
    if (!user) return loginWithRedirect();
    const was = liked;
    setLiked(!was); setLikes((n) => Math.max(0, n + (was ? -1 : 1))); // instant feedback, corrected by the server answer
    try {
      const r = await run('Like', () => toggleAlbumLike({ id: post.id }), { failTitle: 'Could not update your like' });
      if (r) { setLiked(r.liked); setLikes(r.likes); }
    } catch { setLiked(was); setLikes(post.likeCount); }
  };

  return (
    <article className="surface overflow-hidden">
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
      <Media type={post.mediaType} src={post.imageUrl} alt={albumAlt(post)} className="max-h-[70vh] w-full bg-secondary object-contain" />
      <div className="p-4">
        <div className="flex items-center gap-5">
          <button type="button" onClick={like} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} className={cn('like-btn inline-flex items-center gap-1.5 text-sm font-medium transition-colors', liked ? 'text-rose-500' : 'text-muted-foreground hover:text-foreground')}>
            <Heart className={cn('h-5 w-5', liked && 'fill-current is-liked')} />{likes}
          </button>
          <button type="button" onClick={() => setShowComments((s) => !s)} aria-expanded={showComments} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <MessageCircle className="h-5 w-5" />{comments}
          </button>
        </div>
        <Caption text={post.caption} />
        {showComments && <Comments postId={post.id} onCount={(d) => setComments((n) => Math.max(0, n + d))} />}
      </div>
    </article>
  );
}
