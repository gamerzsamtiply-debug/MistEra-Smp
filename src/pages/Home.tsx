import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Vote, BookOpen, ArrowDown, ArrowRight, Clock, ShieldCheck, MapPin, Gamepad2, Users, Megaphone, Sparkles, Images, Handshake } from 'lucide-react';
import { toast } from 'sonner';
import { getHome } from '@/lib/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { cn } from '@project/components/lib/utils';
import { useSite, type Settings } from '../lib/site';
import { useLoad } from '../lib/useLoad';
import { LOGO_FULL } from '../lib/brand';
import { fmtDate, albumAlt } from '../lib/format';
import CopyField from '../components/CopyField';
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

function Hero({ s }: { s: Settings | null }) {
  return (
    <section className="hero">
      {/* decorative background; it is the largest image above the fold, so tell the browser to fetch it first */}
      <img src={img(s, 'heroImage')} alt="" decoding="async" {...HIGH_PRIORITY} className="hero-img" />
      <div className="wrap hero-inner">
        <img src={LOGO_FULL} alt="MistEra SMP logo" decoding="async" {...HIGH_PRIORITY} className="logo-plate h-14 w-auto max-w-[70%] object-contain md:h-16" />
        {s && <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium">
          <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[s.serverStatus] ?? 'bg-muted')} />Server {s.serverStatus.toLowerCase()} - {s.platform || 'Minecraft Bedrock'}
        </p>}
        <h1 className="mt-4 font-semibold"><span className="sr-only">MistEra SMP - </span>Bangladesh's Bedrock SMP. Online 24/7.</h1>
        <p className="mt-4 max-w-lg text-base text-foreground/80 md:text-lg">{s?.heroTagline}</p>
        <div className="mt-8 grid w-full max-w-xl gap-3 sm:grid-cols-[1fr_9rem]">
          <CopyField label="Server IP" value={s?.serverAddress ?? ''} />
          <CopyField label="Port" value={s?.serverPort ? String(s.serverPort) : ''} />
        </div>
        <div className="mt-3 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <button onClick={() => openLink(s?.discordUrl, 'Discord')} className="mc-btn mc-btn--lg w-full sm:w-auto"><MessageCircle />Join Discord</button>
          <button onClick={() => openLink(s?.voteUrl, 'Voting')} className="mc-btn mc-btn--lg mc-btn--gold w-full sm:w-auto"><Vote />Vote for us</button>
        </div>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href="#join" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">How to join <ArrowDown className="h-3.5 w-3.5" /></a>
          <Link to="/information" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"><BookOpen className="h-3.5 w-3.5" />Server info</Link>
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
    <section className="wrap sect">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <Reveal>
          <h2 className="text-2xl font-semibold md:text-3xl">Private by design. Built together.</h2>
          <p className="mt-4 max-w-prose whitespace-pre-line text-base leading-relaxed text-muted-foreground">{s?.introText}</p>
        </Reveal>
        <ul className="grid gap-3 sm:grid-cols-2">
          {FACTS.map((f) => (
            <li key={f.t} className="surface p-5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary"><f.icon className="h-4 w-4 text-primary" /></span>
              <h3 className="mt-4 text-base font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Gallery({ s }: { s: Settings | null }) {
  return (
    <section className="wrap pb-12 md:pb-16">
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <div className="relative isolate flex min-h-[260px] overflow-hidden rounded-xl border border-border md:min-h-[340px]">
          <img src={img(s, 'galleryImageOne')} alt="A castle build above a misty lake" loading="lazy" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
          <div className="mt-auto p-5 md:p-7"><h3 className="text-xl font-semibold md:text-2xl">A world shaped by its players.</h3><p className="mt-1.5 max-w-md text-sm text-foreground/75">Every base, farm and town you see was built by someone on the whitelist.</p></div>
        </div>
        <div className="relative isolate flex min-h-[260px] overflow-hidden rounded-xl border border-border">
          <img src={img(s, 'galleryImageTwo')} alt="A lantern-lit village at night" loading="lazy" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
          <div className="mt-auto p-5"><h3 className="text-lg font-semibold">Discord-first community</h3><p className="mt-1 text-sm text-foreground/75">Whitelist, support and news all live there.</p></div>
        </div>
      </div>
    </section>
  );
}

function Join({ s }: { s: Settings | null }) {
  const { steps } = useSite();
  return (
    <section id="join" className="scroll-mt-16 border-y border-border bg-card/40 lg:scroll-mt-4">
      <div className="wrap sect grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
        <div>
          <Reveal><h2 className="text-2xl font-semibold md:text-3xl">Get whitelisted</h2><p className="mt-2 max-w-lg text-sm text-muted-foreground md:text-base">Follow these steps. You can only connect once staff have approved your GamerTag.</p></Reveal>
          <div className="mt-8"><HowToJoin steps={steps} /></div>
        </div>
        <Reveal className="surface h-fit bg-background p-5 md:p-6 lg:sticky lg:top-6">
          <h3 className="text-lg font-semibold">Server details</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add these in Minecraft: Play, Servers, Add Server.</p>
          <div className="mt-5 space-y-3"><CopyField label="Server IP" value={s?.serverAddress ?? ''} /><CopyField label="Port" value={s?.serverPort ? String(s.serverPort) : ''} /></div>
          <button onClick={() => openLink(s?.discordUrl, 'Discord')} className="mc-btn mt-5 w-full"><MessageCircle className="h-4 w-4" />Join Discord to get whitelisted</button>
          <div className="mt-5"><WhitelistNotice compact /></div>
        </Reveal>
      </div>
    </section>
  );
}

function Head({ title, to, cta = 'View all' }: { label?: string; title: React.ReactNode; to?: string; cta?: string }) {
  return (
    <Reveal className="sect-head">
      <h2>{title}</h2>
      {to && <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">{cta} <ArrowRight className="h-4 w-4" /></Link>}
    </Reveal>
  );
}

function PostList({ posts, loading, icon, empty, onOpen }: { posts?: Post[]; loading: boolean; icon: typeof Megaphone; empty: string; onOpen: (p: Post) => void }) {
  if (loading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!posts?.length) return <EmptyState icon={icon} title={empty} message="Check back soon." />;
  return (
    <ul className="surface divide-y divide-border overflow-hidden">
      {posts.map((p) => (
        <li key={p.id}><button onClick={() => onOpen(p)} className="group flex w-full gap-4 p-4 text-left transition-colors hover:bg-secondary/60">
          {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" className="h-16 w-24 shrink-0 rounded-md object-cover" />}
          <span className="min-w-0"><span className="block text-xs text-muted-foreground tabular-nums">{fmtDate(p.publishedAt)}</span><span className="block truncate text-sm font-semibold group-hover:text-primary">{p.title}</span><span className="block truncate text-sm text-muted-foreground">{p.body}</span></span>
        </button></li>
      ))}
    </ul>
  );
}

export default function Home() {
  const { settings: s } = useSite();
  const { data, error, loading, reload } = useLoad('Load homepage', () => getHome({}), [], { cache: true });
  const [open, setOpen] = useState<Post | null>(null);
  const sk = <div className="grid gap-4 grid-cols-2 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div>;
  return (
    <>
      <Hero s={s} />
      <About s={s} />
      <Gallery s={s} />
      <Join s={s} />
      {error ? <div className="wrap py-16"><InlineError error={error} onRetry={reload} /></div> : (<>
        <section className="wrap sect grid gap-10 lg:grid-cols-2 lg:gap-12">
          <div><Head title="Announcements" to="/announcements" /><PostList posts={data?.announcements} loading={loading} icon={Megaphone} empty="No announcements yet" onOpen={setOpen} /></div>
          <div><Head title="Latest updates" to="/updates" /><PostList posts={data?.updates} loading={loading} icon={Sparkles} empty="No updates yet" onOpen={setOpen} /></div>
        </section>
        <section className="wrap pb-12 md:pb-16"><Head title="Run by players" to="/staff" />
          {loading ? sk : !data?.staff.length ? <EmptyState icon={Users} title="No staff members yet" message="Our team will appear here soon." /> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{data.staff.slice(0, 4).map((m) => <Reveal key={m.id}><StaffCard s={m} /></Reveal>)}</div>}
        </section>
        <section className="wrap pb-12 md:pb-16"><Head title="From the album" to="/album" cta="Open album" />
          {loading ? sk : !data?.album.length ? <EmptyState icon={Images} title="No approved images yet" message="Log in and share your best screenshots." /> : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{data.album.map((a) => (
              <Reveal key={a.id}><div className="group surface overflow-hidden"><Link to="/album" className="block aspect-square overflow-hidden bg-secondary"><img src={a.imageUrl} alt={albumAlt(a)} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></Link><div className="p-3"><UserChip user={a.uploader} /></div></div></Reveal>
            ))}</div>
          )}
        </section>
      </>)}
      <section className="relative isolate overflow-hidden border-t border-border">
        <img src={img(s, 'bannerImage')} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover" style={{ filter: 'blur(2px)' }} />
        <div className="absolute inset-0 -z-10 bg-background/85" />
        <div className="wrap flex flex-col items-start py-14 md:py-20">
          <h2 className="text-2xl font-semibold md:text-3xl">Your spot is waiting.</h2>
          <p className="mt-3 max-w-lg text-foreground/80">Join the Discord, post your GamerTag in the whitelist channel and wait for approval.</p>
          <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><button onClick={() => openLink(s?.discordUrl, 'Discord')} className="mc-btn mc-btn--lg"><MessageCircle />Join our Discord</button><button onClick={() => openLink(s?.voteUrl, 'Voting')} className="mc-btn mc-btn--lg mc-btn--gold"><Vote />Vote us</button></div>
        </div>
      </section>
      <PostDialog post={open} onClose={() => setOpen(null)} />
    </>
  );
}
