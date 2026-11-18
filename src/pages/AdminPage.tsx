import { useState } from 'react';
import { LayoutDashboard, Server, ListOrdered, FileText, Megaphone, Sparkles, Users, UserRound, Handshake, Images, Lightbulb, ScrollText, Bug } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { useSite } from '../lib/site';
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

const TABS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, el: <Overview /> },
  { id: 'settings', label: 'Server & Help Settings', icon: Server, el: <SettingsTab /> },
  { id: 'steps', label: 'Whitelist Guide', icon: ListOrdered, el: <StepsTab /> },
  { id: 'pages', label: 'Information & Terms', icon: FileText, el: <PagesTab /> },
  { id: 'ann', label: 'Announcements', icon: Megaphone, el: <PostsTab kind="Announcement" /> },
  { id: 'upd', label: 'Updates', icon: Sparkles, el: <PostsTab kind="Update" /> },
  { id: 'staff', label: 'Staff', icon: UserRound, el: <StaffTab /> },
  { id: 'users', label: 'Users & Roles', icon: Users, el: <UsersTab /> },
  { id: 'partners', label: 'Partners', icon: Handshake, el: <PartnersTab /> },
  { id: 'album', label: 'Album Approvals', icon: Images, el: <AlbumTab /> },
  { id: 'sugg', label: 'Suggestions', icon: Lightbulb, el: <SuggestionsTab /> },
  { id: 'logs', label: 'Activity Logs', icon: ScrollText, el: <LogsTab type="activity" /> },
  { id: 'errors', label: 'Error Logs', icon: Bug, el: <LogsTab type="error" /> },
];

export default function AdminPage() {
  const { me } = useSite();
  const [tab, setTab] = useState('overview');
  const cur = TABS.find((t) => t.id === tab) ?? TABS[0];
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Admin · @{me?.profile.username}</p><h1 className="mt-1 text-3xl font-bold">Admin Panel</h1></div>
      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn('relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors', tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {tab === t.id && <span className="absolute inset-0 rounded-lg bg-secondary" />}
              <t.icon className="relative h-4 w-4" /><span className="relative">{t.label}</span>
            </button>
          ))}
        </nav>
        <section key={tab} className="min-w-0">
          <h2 className="mb-5 text-xl font-bold">{cur.label}</h2>
          {cur.el}
        </section>
      </div>
    </div>
  );
}
