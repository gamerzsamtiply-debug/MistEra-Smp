import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { listStaff } from '@/lib/api';
import PageHeader from '../components/PageHeader';
import Reveal from '../components/Reveal';
import RoleBadge from '../components/RoleBadge';
import { UserAvatar } from '../components/UserChip';
import { EmptyState, GridSkeleton, InlineError } from '../components/States';
import { useLoad } from '../lib/useLoad';

const ROLES = ['Owner', 'Admin', 'Moderator', 'Staff'];
type S = { id: string; username: string; avatarUrl: string; role: string };

export function StaffCard({ s }: { s: S }) {
  return (
    <motion.div whileHover={{ y: -4 }}>
      <Link to={`/u/${s.id}`} className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center transition-shadow hover:border-primary/50">
        <UserAvatar username={s.username} avatarUrl={s.avatarUrl} className="h-20 w-20 text-xl" />
        <p className="mt-4 font-semibold">@{s.username}</p>
        <div className="mt-2"><RoleBadge role={s.role} /></div>
      </Link>
    </motion.div>
  );
}

export default function StaffPage() {
  const { data, error, loading, reload } = useLoad('Load staff', () => listStaff({}));
  const staff = (data?.staff ?? []) as S[];
  return (
    <>
      <PageHeader eyebrow="The team" title="Staff" subtitle="The people who keep MistEra SMP running smoothly." />
      <div className="container mx-auto px-4 py-12 space-y-12">
        {loading ? <GridSkeleton count={4} className="h-48" /> : error ? <InlineError error={error} onRetry={reload} /> : !staff.length ? (
          <EmptyState icon={Users} title="No staff members yet" message="Staff members will appear here once roles are assigned." />
        ) : ROLES.map((role) => {
          const list = staff.filter((s) => s.role === role);
          if (!list.length) return null;
          return (
            <section key={role}>
              <h2 className="mb-5 text-2xl font-bold">{role}{role === 'Owner' ? '' : 's'}</h2>
              <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">{list.map((s, i) => <Reveal key={s.id} delay={i * 0.04}><StaffCard s={s} /></Reveal>)}</div>
            </section>
          );
        })}
      </div>
    </>
  );
}
