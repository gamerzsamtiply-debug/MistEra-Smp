import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { adminListUsers, adminSetRole } from '@/lib/api';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { UserAvatar } from '../../components/UserChip';
import RoleBadge from '../../components/RoleBadge';
import { Spinner, InlineError, EmptyState } from '../../components/States';
import { useLoad } from '../../lib/useLoad';
import { useSite } from '../../lib/site';
import { run } from '../../lib/errors';
import { fmtDate } from '../../lib/format';

const FILTERS = ['All', 'Admin', 'Moderator', 'Staff', 'Member'];
const PAGE = 20;

export default function UsersTab() {
  const { me } = useSite();
  const { data, error, loading, reload, setData } = useLoad('Admin users', () => adminListUsers({}));
  const [q, setQ] = useState('');
  const [role, setRole] = useState('All');
  const [page, setPage] = useState(0);
  const list = useMemo(() => (data?.users ?? []).filter((u) => (role === 'All' || u.role === role) && u.username.toLowerCase().includes(q.toLowerCase())), [data, q, role]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const change = async (id: string, next: string) => {
    const prev = data;
    setData((d) => d && { users: d.users.map((u) => (u.id === id ? { ...u, role: next } : u)) });
    try { await run('Staff role update', () => adminSetRole({ profileId: id, role: next as 'Admin' }), { success: 'Staff role updated', failTitle: 'Failed to update staff role' }); }
    catch { setData(prev); }
  };
  const options = me?.isOwner ? ['Admin', 'Moderator', 'Staff', 'Member'] : ['Moderator', 'Staff', 'Member'];
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search username..." value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></div>
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(0); }}><SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger><SelectContent>{FILTERS.map((f) => <SelectItem key={f} value={f}>{f === 'All' ? 'All roles' : f}</SelectItem>)}</SelectContent></Select>
      </div>
      <p className="text-xs text-muted-foreground">{me?.isOwner ? 'You can grant or remove Admin access.' : 'Only the site owner can grant or remove Admin access.'} These roles control admin permissions; the public Staff page is managed in the Staff tab. The site owner account always shows as Admin and can't be changed.</p>
      {loading ? <Spinner /> : error ? <InlineError error={error} onRetry={reload} /> : !list.length ? <EmptyState icon={Users} title="No users found" message="Try a different search or filter." /> : (
        <>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">{list.slice(page * PAGE, page * PAGE + PAGE).map((u) => {
            const locked = u.locked || u.id === me?.profile.id || (!me?.isOwner && u.role === 'Admin');
            return (
              <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                <Link to={`/u/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3"><UserAvatar username={u.username} avatarUrl={u.avatarUrl} /><div className="min-w-0"><p className="truncate font-semibold">@{u.username}</p><p className="text-xs text-muted-foreground">Joined {fmtDate(u.joinedAt)}</p></div></Link>
                {locked ? <RoleBadge role={u.role} /> : (
                  <Select value={u.role} onValueChange={(v) => change(u.id, v)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                )}
              </div>
            );
          })}</div>
          {pages > 1 && <div className="flex items-center justify-end gap-2 text-sm"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span>{page + 1} / {pages}</span><Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button></div>}
        </>
      )}
    </div>
  );
}
