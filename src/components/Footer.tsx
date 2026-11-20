import { Link } from 'react-router-dom';
import { useSite } from '../lib/site';
import { LOGO_FULL } from '../lib/brand';
import WhitelistNotice from './WhitelistNotice';
import { openHelp } from './Navbar';

const linkCls = 'text-muted-foreground transition-colors hover:text-foreground';

export default function Footer() {
  const { settings } = useSite();
  return (
    <footer className="mt-8 border-t border-border">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <img src={LOGO_FULL} alt="MistEra SMP logo" loading="lazy" decoding="async" className="logo-plate h-16 w-auto object-contain" />
          <p className="max-w-sm text-sm text-muted-foreground">A Bangladesh-based, 24/7 Minecraft Bedrock survival community.</p>
          <WhitelistNotice compact />
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Explore</p>
          <ul className="space-y-2 text-sm">
            {[['/information', 'Information'], ['/staff', 'Staff'], ['/partners', 'Partners'], ['/announcements', 'Announcements'], ['/updates', 'Updates'], ['/album', 'Community Album']].map(([to, l]) => <li key={to}><Link className={linkCls} to={to}>{l}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Community</p>
          <ul className="space-y-2 text-sm">
            {settings?.discordUrl && <li><a className={linkCls} href={settings.discordUrl} target="_blank" rel="noreferrer">Discord</a></li>}
            {settings?.voteUrl && <li><a className={linkCls} href={settings.voteUrl} target="_blank" rel="noreferrer">Vote for us</a></li>}
            <li><button className={linkCls} onClick={() => openHelp(settings?.ticketUrl)}>Help / Support ticket</button></li>
            <li><Link className={linkCls} to="/suggestions">Suggestions</Link></li>
            <li><Link className={linkCls} to="/terms">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">Copyright {new Date().getFullYear()} MistEra SMP. Not affiliated with Mojang or Microsoft.</div>
    </footer>
  );
}
