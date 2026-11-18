import { Link } from 'react-router-dom';
import { useSite } from '../lib/site';
import { LOGO_FULL } from '../lib/brand';
import WhitelistNotice from './WhitelistNotice';
import { openHelp } from './Navbar';

export default function Footer() {
  const { settings } = useSite();
  return (
    <footer className="mt-24 border-t border-border bg-card/40">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div className="space-y-4">
          <img src={LOGO_FULL} alt="MistEra SMP logo" loading="lazy" decoding="async" className="logo-plate h-24 w-auto object-contain" />
          <p className="max-w-sm text-sm text-muted-foreground">A Bangladesh-based, 24/7 Minecraft Bedrock survival community.</p>
          <WhitelistNotice compact />
        </div>
        <div>
          <p className="mb-3 font-display font-semibold ">Explore</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[['/information', 'Information'], ['/staff', 'Staff'], ['/partners', 'Partners'], ['/announcements', 'Announcements'], ['/updates', 'Updates'], ['/album', 'Community Album']].map(([to, l]) => <li key={to}><Link className="hover:text-foreground" to={to}>{l}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="mb-3 font-display font-semibold ">Community</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {settings?.discordUrl && <li><a className="hover:text-foreground" href={settings.discordUrl} target="_blank" rel="noreferrer">Discord</a></li>}
            {settings?.voteUrl && <li><a className="hover:text-foreground" href={settings.voteUrl} target="_blank" rel="noreferrer">Vote for us</a></li>}
            <li><button className="hover:text-foreground" onClick={() => openHelp(settings?.ticketUrl)}>Help / Support ticket</button></li>
            <li><Link className="hover:text-foreground" to="/suggestions">Suggestions</Link></li>
            <li><Link className="hover:text-foreground" to="/terms">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">Copyright {new Date().getFullYear()} MistEra SMP. Not affiliated with Mojang or Microsoft.</div>
    </footer>
  );
}
