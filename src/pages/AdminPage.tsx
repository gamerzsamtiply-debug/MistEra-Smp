import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, Server, ListOrdered, FileText, Megaphone, Sparkles, Users, UserRound, Handshake, Images, Lightbulb, ScrollText, Bug, MessageSquareHeart } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { useSite } from '../lib/site';
import { LOGO_MARK } from '../lib/brand';
import ThemeToggle from '../components/ThemeToggle';
import Overview from './admin/Overview';
import SettingsTab from './admin/SettingsTab';
import StepsTab from './admin/StepsTab';
import PagesTab from './admin/PagesTab';
import PostsTab from './admin/PostsTab';
import UsersTab from './admin/UsersTab';
import PartnersTab from './admin/PartnersTab';
import StaffTab from './admin/StaffTab';
import AlbumTab from './admin/AlbumTab';
import SuggestionsTab from './admin/SuggestionsTab';
import LogsTab from './admin/LogsTab';
import FeedbackTab from './admin/FeedbackTab';

const TABS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, el: <Overview /> },
  { id: 'settings', label: 'Server & Help Settings', icon: Server, el: <SettingsTab /> },
  { id: 'steps', label: 'Whitelist Guide', icon: ListOrdered, el: <StepsTab /> },
  { id: 'pages', label: 'Pages (About, Info, Terms...)', icon: FileText, el: <PagesTab /> },
  { id: 'ann', label: 'Announcements', icon: Megaphone, el: <PostsTab kind="Announcement" /> },
  { id: 'upd', label: 'Updates', icon: Sparkles, el: <PostsTab kind="Update" /> },
  { id: 'staff', label: 'Staff', icon: UserRound, el: <StaffTab /> },
  { id: 'users', label: 'Users & Roles', icon: Users, el: <UsersTab /> },
  { id: 'partners', label: 'Partners', icon: Handshake, el: <PartnersTab /> },
  { id: 'album', label: 'Album Approvals', icon: Images, el: <AlbumTab /> },
  { id: 'sugg', label: 'Suggestions', icon: Lightbulb, el: <SuggestionsTab /> },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareHeart, el: <FeedbackTab /> },
  { id: 'logs', label: 'Activity Logs', icon: ScrollText, el: <LogsTab type="activity" /> },
  { id: 'errors', label: 'Error Logs', icon: Bug, el: <LogsTab type="error" /> },
];

export default function AdminPage() {
  const { me } = useSite();
  const [tab, setTab] = useState('overview');
  const cur = TABS.find((t) => t.id === tab) ?? TABS[0];
  const item = (t: (typeof TABS)[number]) => (
    <button key={t.id} type="button" onClick={() => setTab(t.id)} title={t.label} aria-label={t.label} aria-current={tab === t.id ? 'page' : undefined} className="rail-link">
      <t.icon /><span className="rail-label">{t.label}</span>
    </button>
  );
  return (
    <div className="dash">
      {/* Laptops and desktops: compact icon sidebar (labels on wide screens) */}
      <aside className="dash-rail" aria-label="Admin sections">
        <div className="mb-4 flex h-10 w-full items-center justify-center min-[1360px]:justify-start min-[1360px]:px-2">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Back to MistEra SMP">
            <img src={LOGO_MARK} alt="" width={36} height={36} className="logo-plate h-9 w-9 object-contain" />
            <span className="rail-label font-display text-[15px] font-semibold tracking-tight">Admin Panel</span>
          </Link>
        </div>
        <nav className="flex w-full flex-col items-center gap-1 min-[1360px]:items-stretch">{TABS.map(item)}</nav>
        <div className="mt-auto flex w-full flex-col items-center gap-1 pt-4 min-[1360px]:items-stretch">
          <Link to="/" title="Back to site" aria-label="Back to site" className="rail-link"><ArrowLeft /><span className="rail-label">Back to site</span></Link>
        </div>
      </aside>

      {/* Tablets and phones: scrollable section strip */}
      <nav className="dash-strip" aria-label="Admin sections">
        <Link to="/" title="Back to site" aria-label="Back to site" className="rail-link"><ArrowLeft /></Link>
        {TABS.map(item)}
      </nav>

      <div className="dash-main">
        <div className="dash-content">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Admin Panel - @{me?.profile.username}</p>
              <h1 className="mt-1 text-2xl font-semibold md:text-3xl">{cur.label}</h1>
            </div>
            <ThemeToggle />
          </header>
          <section key={tab} className="dash-panel min-w-0">
            {cur.el}
          </section>
        </div>
      </div>
    </div>
  );
}
