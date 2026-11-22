import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Image as ImageIcon, Loader2, MessageCircle, MoreHorizontal, Paperclip, Pencil, Send, Trash2, Users, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { createMessageUpload, deleteMessage, editMessage, getThread, listInbox, sendMessage, type ChatMessage, type Conversation } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@project/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@project/components/ui/alert-dialog';
import { cn } from '@project/components/lib/utils';
import { UserAvatar } from '../components/UserChip';
import FollowButton from '../components/FollowButton';
import { EmptyState, Spinner } from '../components/States';
import { errText, fmtBytes, timeAgo } from '../lib/social';
import { sfx } from '../lib/sfx';

// Must match server/social.ts ATTACHMENT_TYPES (the server re-checks everything).
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'application/zip', 'application/x-zip-compressed', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'video/mp4', 'video/webm']);
const MAX_BYTES = 25 * 1024 * 1024;
const FILE_ACCEPT = [...ALLOWED].join(',');

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dayLabel = (iso: string) => {
  const d = new Date(iso); const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  const y = new Date(); y.setDate(today.getDate() - 1);
  return same(d, y) ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

// ───────────── one message ─────────────
function Bubble({ m, onEdited, onDeleted }: { m: ChatMessage; onEdited: (id: string, body: string) => void; onDeleted: (id: string, scope: 'me' | 'everyone') => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'me' | 'everyone' | null>(null);

  if (m.deleted) {
    return (
      <div className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
        <p className="rounded-2xl border border-dashed border-border px-3 py-2 text-xs italic text-muted-foreground">{m.mine ? 'You deleted this message' : 'This message was deleted'}</p>
      </div>
    );
  }
  const saveEdit = async () => {
    const body = draft.trim();
    if (!body && !m.attachment) { toast.error('A message cannot be empty. Delete it instead.'); return; }
    if (body === m.body) { setEditing(false); return; }
    setBusy(true);
    try { await editMessage({ id: m.id, body }); onEdited(m.id, body); setEditing(false); sfx.pop(); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  const doDelete = async (scope: 'me' | 'everyone') => {
    setBusy(true);
    try { await deleteMessage({ id: m.id, scope }); onDeleted(m.id, scope); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); setConfirm(null); }
  };
  const a = m.attachment;
  return (
    <div className={cn('group flex items-end gap-1.5', m.mine ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn('max-w-[78%] space-y-1.5 rounded-2xl px-3 py-2 text-sm', m.mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary text-secondary-foreground')}>
        {a && (a.isImage ? (
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="block"><img src={a.url} alt={a.name} loading="lazy" className="max-h-64 w-full rounded-lg object-cover" /></a>
        ) : (
          <a href={a.url} target="_blank" rel="noopener noreferrer" download={a.name} className={cn('flex items-center gap-2 rounded-lg px-2.5 py-2', m.mine ? 'bg-black/15' : 'bg-background/60')}>
            <FileText className="h-5 w-5 shrink-0" /><span className="min-w-0"><span className="block truncate text-xs font-semibold">{a.name}</span><span className="block text-[11px] opacity-80">{fmtBytes(a.size)}</span></span>
          </a>
        ))}
        {editing ? (
          <div className="space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={2000} autoFocus className="min-h-0 bg-background text-foreground" onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void saveEdit(); } }} aria-label="Edit message" />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setDraft(m.body); }} disabled={busy}><X className="mr-1 h-3.5 w-3.5" />Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={busy}>{busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}Save</Button>
            </div>
          </div>
        ) : m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
        <p className={cn('text-[10px] leading-none', m.mine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{clock(m.createdAt)}{m.edited && ' - edited'}{m.mine && m.read && ' - seen'}</p>
      </div>
      {!editing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Message options" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground opacity-100 transition-opacity hover:bg-secondary focus-visible:opacity-100 data-[state=open]:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={m.mine ? 'end' : 'start'} className="w-52">
            {m.mine && <DropdownMenuItem onClick={() => { setDraft(m.body); setEditing(true); }}><Pencil className="mr-2 h-4 w-4" />Edit message</DropdownMenuItem>}
            {m.mine && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={() => setConfirm('me')}><Trash2 className="mr-2 h-4 w-4" />Delete for me</DropdownMenuItem>
            {m.mine && <DropdownMenuItem onClick={() => setConfirm('everyone')} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete for everyone</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === 'everyone' ? 'Delete for everyone?' : 'Delete for you?'}</AlertDialogTitle>
            <AlertDialogDescription>{confirm === 'everyone' ? 'The message and any file will be removed for both of you. The chat will show that you deleted a message.' : 'This removes the message from your side only. The other person can still see it.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={(e) => { e.preventDefault(); if (confirm) void doDelete(confirm); }} disabled={busy}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ───────────── one conversation ─────────────
type Thread = Awaited<ReturnType<typeof getThread>>;

function ThreadView({ profileId, onActivity }: { profileId: string; onActivity: () => void }) {
  const [data, setData] = useState<Thread | null>(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const first = useRef(true);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try { const d = await getThread({ profileId }); setData(d); setError(''); onActivity(); }
    catch (e) { setError(errText(e)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    setData(null); setError(''); setText(''); setFile(null); first.current = true; stick.current = true;
    void load();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 4000);
    return () => window.clearInterval(id);
  }, [load]);

  const count = data?.messages.length ?? 0;
  useEffect(() => {
    if (!count) return;
    if (first.current || stick.current) endRef.current?.scrollIntoView({ block: 'end', behavior: first.current ? 'auto' : 'smooth' });
    first.current = false;
  }, [count]);

  const onScroll = () => { const el = scroller.current; if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; };
  const patch = (fn: (l: ChatMessage[]) => ChatMessage[]) => setData((d) => (d ? { ...d, messages: fn(d.messages) } : d));

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!ALLOWED.has(f.type)) { toast.error('That file type is not allowed', { description: 'You can send images, PDF, Office documents, text, ZIP, audio and short videos.' }); return; }
    if (f.size > MAX_BYTES) { toast.error('That file is too big', { description: 'Files must be 25 MB or smaller.' }); return; }
    setFile(f);
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !file) || sending) return;
    setSending(true);
    try {
      let attachment: { path: string; name: string; type: string; size: number } | undefined;
      if (file) {
        const t = await createMessageUpload({ contentType: file.type, size: file.size });
        const up = await supabase.storage.from(t.bucket).uploadToSignedUrl(t.path, t.token, file, { contentType: file.type });
        if (up.error) throw up.error;
        attachment = { path: t.path, name: file.name, type: file.type, size: file.size };
      }
      const r = await sendMessage({ profileId, body, attachment });
      stick.current = true;
      patch((l) => [...l, r.message]);
      setText(''); setFile(null); sfx.pop(); onActivity();
    } catch (e) { toast.error(errText(e)); } finally { setSending(false); }
  };

  if (error && !data) return <div className="grid flex-1 place-items-center p-6 text-center text-sm text-muted-foreground">{error}</div>;
  if (!data) return <div className="grid flex-1 place-items-center"><Spinner /></div>;
  const u = data.with;
  let lastDay = '';
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-3 py-2.5">
        <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Back to inbox"><Link to="/inbox"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <Link to={`/u/${u.id}`} className="flex min-w-0 items-center gap-3"><UserAvatar username={u.username} avatarUrl={u.avatarUrl} className="h-9 w-9" /><span className="truncate text-sm font-semibold">@{u.username}</span></Link>
      </header>
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4" aria-live="polite">
        {!data.messages.length && <p className="py-10 text-center text-sm text-muted-foreground">{data.canMessage ? `Say hi to @${u.username}.` : 'No messages yet.'}</p>}
        {data.messages.map((m) => {
          const label = m.createdAt ? dayLabel(m.createdAt) : '';
          const showDay = label !== lastDay; lastDay = label;
          return (
            <div key={m.id} className="space-y-2">
              {showDay && label && <p className="py-1 text-center text-[11px] font-medium text-muted-foreground">{label}</p>}
              <Bubble m={m} onEdited={(id, body) => patch((l) => l.map((x) => (x.id === id ? { ...x, body, edited: true } : x)))} onDeleted={(id, scope) => { patch((l) => (scope === 'me' ? l.filter((x) => x.id !== id) : l.map((x) => (x.id === id ? { ...x, deleted: true, body: '', attachment: null } : x)))); onActivity(); }} />
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {data.canMessage ? (
        <div className="border-t border-border p-2.5">
          {file && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs">
              {file.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
              <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span><span className="shrink-0 text-muted-foreground">{fmtBytes(file.size)}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="Remove attachment" className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-background"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          <div className="flex items-end gap-1.5">
            <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            <input ref={fileInput} type="file" accept={FILE_ACCEPT} className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            <Button type="button" variant="ghost" size="icon" onClick={() => photoInput.current?.click()} aria-label="Send an image" disabled={sending}><ImageIcon className="h-5 w-5" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => fileInput.current?.click()} aria-label="Attach a file" disabled={sending}><Paperclip className="h-5 w-5" /></Button>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000} placeholder="Write a message" aria-label="Message" className="max-h-32 min-h-10 flex-1 resize-none py-2.5" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
            <Button type="button" size="icon" onClick={send} disabled={sending || (!text.trim() && !file)} aria-label="Send message">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 border-t border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">Follow @{u.username} to send them a message.</p>
          <FollowButton profileId={u.id} following={false} onChange={(f) => { if (f) void load(); }} />
        </div>
      )}
    </div>
  );
}

// ───────────── the inbox ─────────────
export default function InboxPage() {
  const { id } = useParams();
  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [error, setError] = useState('');
  const loadList = useCallback(() => { listInbox().then((d) => { setConvos(d.conversations); setError(''); }).catch((e) => setError(errText(e))); }, []);
  useEffect(() => {
    loadList();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') loadList(); }, 8000);
    return () => window.clearInterval(t);
  }, [loadList]);
  const active = useMemo(() => convos?.find((c) => c.user.id === id), [convos, id]);

  return (
    <div className="container mx-auto max-w-5xl px-0 py-0 md:px-4 md:py-6">
      <div className="flex h-[calc(100dvh-12.5rem)] min-h-[26rem] overflow-hidden border-border bg-card md:rounded-2xl md:border lg:h-[calc(100dvh-5rem)]">
        <aside className={cn('w-full shrink-0 flex-col border-r border-border md:flex md:w-80', id ? 'hidden' : 'flex')} aria-label="Conversations">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h1 className="text-base font-semibold">Inbox</h1>
            <Button asChild size="sm" variant="secondary"><Link to="/people"><Users className="mr-1.5 h-4 w-4" />Find people</Link></Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {error && !convos ? <p className="p-4 text-sm text-destructive">{error}</p> : !convos ? <Spinner /> : !convos.length ? (
              <div className="p-4"><EmptyState icon={MessageCircle} title="No messages yet" message="Follow someone, then open their profile and tap Message to start a chat." /></div>
            ) : (
              <ul>
                {convos.map((c) => (
                  <li key={c.user.id}>
                    <Link to={`/inbox/${c.user.id}`} className={cn('flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60', c.user.id === id && 'bg-secondary')}>
                      <UserAvatar username={c.user.username} avatarUrl={c.user.avatarUrl} className="h-11 w-11" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2"><span className={cn('truncate text-sm', c.unread ? 'font-bold' : 'font-semibold')}>@{c.user.username}</span><span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(c.at)}</span></span>
                        <span className={cn('block truncate text-xs', c.unread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{c.mine && 'You: '}{c.preview}</span>
                      </span>
                      {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{c.unread > 9 ? '9+' : c.unread}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <section className={cn('min-w-0 flex-1 flex-col md:flex', id ? 'flex' : 'hidden')} aria-label={active ? `Chat with ${active.user.username}` : 'Chat'}>
          {id ? <ThreadView key={id} profileId={id} onActivity={loadList} /> : (
            <div className="grid flex-1 place-items-center p-6 text-center text-sm text-muted-foreground"><div><MessageCircle className="mx-auto mb-3 h-10 w-10 text-primary/70" />Select a conversation, or find someone to message.</div></div>
          )}
        </section>
      </div>
    </div>
  );
}
