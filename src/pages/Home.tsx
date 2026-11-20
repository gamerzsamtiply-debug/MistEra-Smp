import { Link } from 'react-router-dom';
import { MessageCircle, Vote, BookOpen, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@project/components/lib/utils';
import { useSite, type Settings } from '../lib/site';
import { LOGO_FULL } from '../lib/brand';
import CopyField from '../components/CopyField';
import WhitelistNotice from '../components/WhitelistNotice';
import HowToJoin from '../components/HowToJoin';
import Reveal from '../components/Reveal';

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
        {s && <p className="mt-6 inline-flex items-center gap-2 glass !rounded-full px-3 py-1 text-xs font-medium">
          <span className={cn('h-2 w-2 rounded-full', s.serverStatus === 'Online' && 'pulse-dot', STATUS_DOT[s.serverStatus] ?? 'bg-emerald-400')} />Server {(s.serverStatus || 'Online').toLowerCase()} - {s.platform || 'Minecraft Bedrock'}
        </p>}
        <h1 className="mt-4 font-semibold"><span className="sr-only">MistEra SMP - </span>{s?.heroTitle?.trim() || DEFAULT_HERO_TITLE}</h1>
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

const DEFAULT_HERO_TITLE = "Bangladesh's Bedrock SMP. Online 24/7.";
const DEFAULT_ABOUT_HEADING = 'Private by design. Built together.';
const DEFAULT_ABOUT_TAGLINE = 'Eras End. MistEra Never Fades.';
const ABOUT_TEXT = [
  'MistEra SMP is a private, whitelist-only Minecraft Bedrock Edition survival server, running 24/7 on dedicated hosting for a smooth and reliable gameplay experience.',
  'Access is managed through our official Discord community. To join the server, simply join our Discord, visit the Gamer Tag channel, and submit your Minecraft Bedrock Gamertag for whitelist approval.',
  "Once approved, you're ready to enter MistEra and become part of the community.",
];

function About({ s }: { s: Settings | null }) {
  const paragraphs = (s?.aboutText ?? '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
  const text = paragraphs.length ? paragraphs : ABOUT_TEXT;
  return (
    <section className="wrap sect">
      <Reveal className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-semibold md:text-4xl">{s?.aboutHeading?.trim() || DEFAULT_ABOUT_HEADING}</h2>
        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          {text.map((t) => <p key={t}>{t}</p>)}
        </div>
        <p className="font-display mt-8 text-xl font-semibold text-primary md:text-2xl">{s?.aboutTagline?.trim() || DEFAULT_ABOUT_TAGLINE}</p>
      </Reveal>
    </section>
  );
}


const GALLERY_ALT = ['Players building together in the MistEra SMP survival world', 'A scenic spot in the MistEra SMP world'];

function Gallery({ s }: { s: Settings | null }) {
  return (
    <section className="wrap pb-12 md:pb-16" aria-label="MistEra SMP screenshots">
      <Reveal className="grid gap-4 md:grid-cols-3 md:gap-6">
        <figure className="surface overflow-hidden md:col-span-2">
          <img src={img(s, 'galleryImageOne')} alt={GALLERY_ALT[0]} loading="lazy" decoding="async" className="h-56 w-full object-cover sm:h-72 md:h-full md:min-h-[22rem]" />
        </figure>
        <figure className="surface overflow-hidden">
          <img src={img(s, 'galleryImageTwo')} alt={GALLERY_ALT[1]} loading="lazy" decoding="async" className="h-56 w-full object-cover sm:h-72 md:h-full md:min-h-[22rem]" />
        </figure>
      </Reveal>
    </section>
  );
}

function JoinBanner({ s }: { s: Settings | null }) {
  return (
    <section className="wrap pb-12 md:pb-20" aria-label="Join MistEra SMP">
      <Reveal className="relative isolate overflow-hidden rounded-2xl border border-border">
        <img src={img(s, 'bannerImage')} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-background/70" />
        <div className="flex flex-col items-start gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <h2 className="text-2xl font-semibold md:text-3xl">Ready to join MistEra?</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground md:text-base">Join our Discord, submit your Gamertag and start playing once staff approve you.</p>
          </div>
          <button onClick={() => openLink(s?.discordUrl, 'Discord')} className="mc-btn mc-btn--lg w-full md:w-auto"><MessageCircle />Join Discord</button>
        </div>
      </Reveal>
    </section>
  );
}

function Join({ s }: { s: Settings | null }) {
  const { steps } = useSite();
  return (
    <section id="join" className="scroll-mt-16 lg:scroll-mt-4">
      <div className="wrap sect grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
        <div>
          <Reveal><h2 className="text-2xl font-semibold md:text-3xl">Get whitelisted</h2><p className="mt-2 max-w-lg text-sm text-muted-foreground md:text-base">Follow these steps. You can only connect once staff have approved your GamerTag.</p></Reveal>
          <div className="mt-8"><HowToJoin steps={steps} /></div>
        </div>
        <Reveal className="surface h-fit p-5 md:p-6 lg:sticky lg:top-6">
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

export default function Home() {
  const { settings: s } = useSite();
  return (
    <>
      <Hero s={s} />
      <About s={s} />
      <Gallery s={s} />
      <Join s={s} />
      <JoinBanner s={s} />
    </>
  );
}
