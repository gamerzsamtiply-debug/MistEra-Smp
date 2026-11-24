import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listStaff, STAFF_POSITIONS, type StaffMember } from '@/lib/api';
import PageHeader from '../components/PageHeader';
import RoleBadge from '../components/RoleBadge';
import { UserAvatar } from '../components/UserChip';
import { EmptyState, GridSkeleton, InlineError } from '../components/States';
import { useLoad } from '../lib/useLoad';

export function StaffCard({ s }: { s: StaffMember }) {
  const body = (
    <>
      <UserAvatar username={s.name} avatarUrl={s.avatarUrl} className="h-20 w-20 text-xl" />
      <p className="mt-4 max-w-full truncate font-semibold">{s.name}</p>
      <div className="mt-2"><RoleBadge role={s.position} /></div>
    </>
  );
  const cls = 'flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center';
  return s.profileId
    ? <Link to={`/u/${s.profileId}`} className={`${cls} transition-colors hover:border-primary/50`}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

export default function StaffPage() {
  const { data, error, loading, reload } = useLoad('Load staff', () => listStaff({}), [], { cache: true });
  const staff = (data?.staff ?? []) as StaffMember[];
  return (
    <>
      <PageHeader eyebrow="The team" title="Staff" subtitle="The people who keep MistEra SMP running smoothly." />
      <div className="container mx-auto space-y-12 px-4 py-12">
        {loading ? <GridSkeleton count={4} className="h-48" /> : error ? <InlineError error={error} onRetry={reload} /> : !staff.length ? (
          <EmptyState icon={Users} title="No staff members yet" message="Staff members will appear here once they are added." />
        ) : STAFF_POSITIONS.map((pos) => {
          const list = staff.filter((s) => s.position === pos);
          if (!list.length) return null;
          return (
            <section key={pos}>
              <h2 className="mb-5 text-xl font-semibold">{pos}{pos === 'Owner' || pos === 'Staff' ? '' : 's'}</h2>
              <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{list.map((s) => <li key={s.id} className="contents"><StaffCard s={s} /></li>)}</ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
