import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, MessageCircle, Vote, BookOpen, ArrowDown, Clock, ShieldCheck, MapPin, Gamepad2, Users, Megaphone, Sparkles, Images, Handshake } from 'lucide-react';
import { toast } from 'sonner';
import { getHome } from '@/lib/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { cn } from '@project/components/lib/utils';
import { useSite, type Settings } from '../lib/site';
import { useLoad } from '../lib/useLoad';
import { LOGO_FULL } from '../lib/brand';
import { fmtDate, albumAlt } from '../lib/format';
import WhitelistNotice from '../components/WhitelistNotice';
import HowToJoin from '../components/HowToJoin';
import Reveal from '../components/Reveal';
import type { Post } from '../components/PostCard';
import PostDialog from '../components/PostDialog';
import UserChip from '../components/UserChip';
import { StaffCard } from './StaffPage';
import { PartnerCard } from './PartnersPage';
import { EmptyState, InlineError } from '../components/States';

const DEFAULT_IMG: Record<string, string> = {
  heroImage: 'https://images.fillout.com/872088/5zcagqvsd6/generated-images/1qcZBWWSSbZYPYgyYUjrSD/img_vqKzM_FyN0-tyLQM.jpg',
  galleryImageOne: 'https://images.fillout.com/872088/5zcagqvsd6/generated-images/cGXoNihMNJdZ2o3HboDsFJ/img_UYLR9l-9i-2Bk3ek.jpg',
  galleryImageTwo: 'https://images.fillout.com/872088/5zcagqvsd6/generated-images/7AYYR19JWS1mP1XLSn97JY/img_Ty76SraEIm9rlD26.jpg',
  bannerImage: 'https://images.fillout.com/872088/5zcagqvsd6/generated-images/fW8Mpm68J9HxjGsSjujmpN/img_zlrxa4IsJnANJyOS.jpg',
};
const img = (s: Settings | null, k: string) => ((s as Record<string, string> | null)?.[k]) || DEFAULT_IMG[k];
const openLink = (url: string | undefined, what: string) => url ? window.open(url, '_blank', 'noopener,noreferrer') : toast.error(`${what} link unavailable`, { description: 'This link has not been set up yet. Please check back soon.' });
// React 18's typings don't know the lowercase `fetchpriority` attribute yet; spreading it avoids the type error.
const HIGH_PRIORITY = { fetchpriority: 'high' };
const STATUS_DOT: Record<string, string> = { Online: 'bg-emerald-400', Offline: 'bg-red-400', Restarting: 'bg-amber-400' };

function useCopy() {
  const [done, setDone] = useState('');
  const copy = async (label: string, v: string) => {
    try { await navigator.clipboard.writeText(v); setDone(label); toast.success(`${label} copied`); setTimeout(() => setDone(''), 1600); }
    catch { toast.error("Couldn't copy", { description: 'Please select and copy it manually.' }); }
  };
  return { done, copy };
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const { done, copy } = useCopy();
  return (
    <div className="flex items-center gap-3 border border-border bg-background/60 px-4 py-3">
      <span className="label !text-muted-foreground w-20 shrink-0">{label}</span>
      <code className="flex-1 truncate font-mono text-sm">{value || 'Not set yet'}</code>
      {value && <button onClick={() => copy(label, value)} className="mc-btn mc-btn--stone !h-8 !px-3 !text-xs">{done === label ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{done === label ? 'Copied' : 'Copy'}</button>}
    </div>
  );
}

function Hero({ s }: { s: Settings | null }) {
  const { done, copy } = useCopy();
  return (
    <section className="relative isolate -mt-16 flex min-h-[86vh] items-center overflow-hidden pt-16">
      {/* decorative background; it is the largest image above the fold, so tell the browser to fetch it first */}
      <img src={img(s, 'heroImage')} alt="" decoding="async" {...HIGH_PRIORITY} className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/80 via-background/40 to-background" />
      <div className="container mx-auto flex flex-col items-center px-4 py-16 text-center">
        <img src={LOGO_FULL} alt="MistEra SMP logo" decoding="async" {...HIGH_PRIORITY} className="w-[min(78vw,380px)] h-auto object-contain" />
        {s && <p className="mt-2 inline-flex items-center gap-2 border border-border bg-background/70 px-3 py-1.5 text-xs font-semibold">
          <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[s.serverStatus] ?? 'bg-muted')} />Server {s.serverStatus.toLowerCase()} · {s.platform || 'Minecraft Bedrock'}
        </p>}
        <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight md:text-7xl"><span className="sr-only">MistEra SMP — </span>Bangladesh's Bedrock SMP. <em>Online 24/7.</em></h1>
        <p className="mt-5 max-w-xl text-lg text-foreground/80">{s?.heroTagline}</p>
        <div className="mt-8 flex w-full max-w-2xl flex-col items-stretch gap-3 sm:flex-row">
          <button disabled={!s?.serverAddress} onClick={() => s && copy('Server IP', s.serverAddress)} className="group flex flex-1 items-center gap-3 rounded-[var(--radius)] border border-border bg-background/80 px-4 text-left transition-colors hover:border-primary h-12">
            <span className="flex-1 min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Server address{s?.serverPort ? ` · port ${s.serverPort}` : ''}</span><span className="block truncate font-mono text-sm">{s?.serverAddress || 'Not set yet'}</span></span>
            <span className="flex items-center gap-1 text-xs font-semibold text-primary">{done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{done ? 'Copied' : 'Copy'}</span>
          </button>
          <button onClick={() => openLink(s?.discordUrl, 'Discord')} className="mc-btn mc-btn--lg"><MessageCircle />Join Discord</button>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <a href="#join" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary">How to join <ArrowDown className="h-3.5 w-3.5" /></a>
          <button onClick={() => openLink(s?.voteUrl, 'Voting')} className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><Vote className="h-3.5 w-3.5" />Vote for us</button>
          <Link to="/information" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"><BookOpen className="h-3.5 w-3.5" />Server info</Link>
        </div>
      </div>
    </section>
  );
}

const FACTS = [
  { icon: Clock, t: 'Always on', d: 'A dedicated Bedrock server that runs 24 hours a day, 7 days a week.' },
  { icon: ShieldCheck, t: 'Whitelist only', d: 'Every player is approved by staff through Discord before they can connect.' },
  { icon: MapPin, t: 'Based in Bangladesh', d: 'A local community, so you play with people from your own region.' },
  { icon: Gamepad2, t: 'Bedrock Edition', d: 'Built for Minecraft Bedrock on mobile, console and Windows.' },
];

function About({ s }: { s: Settings | null }) {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <p className="label">The server</p>
          <h2 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">Private by design. <em>Built together.</em></h2>
          <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{s?.introText}</p>
        </Reveal>
        <ul className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
          {FACTS.map((f, i) => (
            <Reveal key={f.t} delay={i * 0.06} className="bg-card p-6">
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-4 text-lg font-bold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Gallery({ s }: { s: Settings | null }) {
  return (
    <section className="container mx-auto px-4 pb-24">
      <div className="grid gap-4 md:grid-cols-2">
        <Reveal className="relative overflow-hidden border border-border min-h-[300px]">
          <img src={img(s, 'galleryImageOne')} alt="A castle build above a misty lake" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-6 md:p-8"><h3 className="text-2xl font-bold md:text-3xl">A world shaped by <em>its players.</em></h3><p className="mt-2 max-w-md text-muted-foreground">Every base, farm and town you see was built by someone on the whitelist.</p></div>
        </Reveal>
        <Reveal delay={0.12} className="relative overflow-hidden border border-border min-h-[300px]">
          <img src={img(s, 'galleryImageTwo')} alt="A lantern-lit village at night" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-6"><h3 className="text-xl font-bold">Discord-first community</h3><p className="text-sm text-muted-foreground">Whitelist, support and news all live there.</p></div>
        </Reveal>
      </div>
    </section>
  );
}

function Join({ s }: { s: Settings | null }) {
  const { steps } = useSite();
  return (
    <section id="join" className="scroll-mt-20 border-y border-border bg-card/40">
      <div className="container mx-auto grid gap-12 px-4 py-24 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <Reveal><p className="label">How to join</p><h2 className="mt-3 text-4xl font-bold md:text-5xl">Get <em>whitelisted.</em></h2><p className="mt-4 max-w-lg text-muted-foreground">Follow these steps. You can only connect once staff have approved your GamerTag.</p></Reveal>
          <div className="mt-10"><HowToJoin steps={steps} /></div>
        </div>
        <Reveal delay={0.1} className="h-fit rounded-xl border border-border bg-background p-6 lg:sticky lg:top-24">
          <h3 className="text-xl font-bold">Server details</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add these in Minecraft → Play → Servers → Add Server.</p>
          <div className="mt-5 space-y-2"><CopyRow label="Address" value={s?.serverAddress ?? ''} /><CopyRow label="Port" value={s?.serverPort ? String(s.serverPort) : ''} /></div>
          <button onClick={() => openLink(s?.discordUrl, 'Discord')} className="mc-btn mt-5 w-full"><MessageCircle className="h-4 w-4" />Join Discord to get whitelisted</button>
          <div className="mt-5"><WhitelistNotice compact /></div>
        </Reveal>
      </div>
    </section>
  );
}

function Head({ label, title, to, cta = 'View all' }: { label: string; title: React.ReactNode; to?: string; cta?: string }) {
  return (
    <Reveal className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-4">
      <div><p className="label">{label}</p><h2 className="mt-2 text-3xl font-bold md:text-4xl">{title}</h2></div>
      {to && <Link to={to} className="shrink-0 text-sm font-semibold text-primary hover:underline">{cta} →</Link>}
    </Reveal>
  );
}

function PostList({ posts, loading, icon, empty, onOpen }: { posts?: Post[]; loading: boolean; icon: typeof Megaphone; empty: string; onOpen: (p: Post) => void }) {
  if (loading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!posts?.length) return <EmptyState icon={icon} title={empty} message="Check back soon." />;
  return (
    <ul className="divide-y divide-border border border-border bg-card">
      {posts.map((p) => (
        <li key={p.id}><button onClick={() => onOpen(p)} className="group flex w-full gap-4 p-4 text-left transition hover:bg-secondary/60">
          {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" className="h-16 w-24 shrink-0 object-cover" />}
          <span className="min-w-0"><span className="block font-mono text-xs text-muted-foreground">{fmtDate(p.publishedAt)}</span><span className="block truncate font-semibold group-hover:text-primary">{p.title}</span><span className="block truncate text-sm text-muted-foreground">{p.body}</span></span>
        </button></li>
      ))}
    </ul>
  );
}

export default function Home() {
  const { settings: s } = useSite();
  const { data, error, loading, reload } = useLoad('Load homepage', () => getHome({}), [], { cache: true });
  const [open, setOpen] = useState<Post | null>(null);
  const sk = <div className="grid gap-5 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div>;
  return (
    <>
      <Hero s={s} />
      <About s={s} />
      <Gallery s={s} />
      <Join s={s} />
      {error ? <div className="container mx-auto px-4 py-16"><InlineError error={error} onRetry={reload} /></div> : (<>
        <section className="container mx-auto grid gap-12 px-4 py-24 lg:grid-cols-2">
          <div><Head label="News" title="Announcements" to="/announcements" /><PostList posts={data?.announcements} loading={loading} icon={Megaphone} empty="No announcements yet" onOpen={setOpen} /></div>
          <div><Head label="Changelog" title="Latest updates" to="/updates" /><PostList posts={data?.updates} loading={loading} icon={Sparkles} empty="No updates yet" onOpen={setOpen} /></div>
        </section>
        <section className="container mx-auto px-4 pb-24"><Head label="The team" title={<>Run by <em>players.</em></>} to="/staff" />
          {loading ? sk : !data?.staff.length ? <EmptyState icon={Users} title="No staff members yet" message="Our team will appear here soon." /> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{data.staff.slice(0, 4).map((m, i) => <Reveal key={m.id} delay={i * 0.05}><StaffCard s={m} /></Reveal>)}</div>}
        </section>
        <section className="container mx-auto px-4 pb-24"><Head label="Community" title="From the album" to="/album" cta="Open album" />
          {loading ? sk : !data?.album.length ? <EmptyState icon={Images} title="No approved images yet" message="Log in and share your best screenshots." /> : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{data.album.map((a, i) => (
              <Reveal key={a.id} delay={i * 0.04}><div className="group overflow-hidden border border-border bg-card"><Link to="/album" className="block aspect-square overflow-hidden bg-secondary"><img src={a.imageUrl} alt={albumAlt(a)} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></Link><div className="p-3"><UserChip user={a.uploader} /></div></div></Reveal>
            ))}</div>
          )}
        </section>
      </>)}
      <section className="relative isolate overflow-hidden">
        <img src={img(s, 'bannerImage')} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/50 to-background/90" />
        <div className="container mx-auto flex flex-col items-center px-4 py-28 text-center">
          <p className="label">Join</p>
          <h2 className="mt-3 text-4xl font-bold md:text-6xl">Your spot is <em>waiting.</em></h2>
          <p className="mt-4 max-w-lg text-foreground/80">Join the Discord, post your GamerTag in the whitelist channel and wait for approval.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><button onClick={() => openLink(s?.discordUrl, 'Discord')} className="mc-btn mc-btn--lg"><MessageCircle />Join our Discord</button><button onClick={() => openLink(s?.voteUrl, 'Voting')} className="mc-btn mc-btn--lg mc-btn--gold"><Vote />Vote us</button></div>
        </div>
      </section>
      <PostDialog post={open} onClose={() => setOpen(null)} />
    </>
  );
}
