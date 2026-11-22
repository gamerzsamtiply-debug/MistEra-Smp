import type { ReactNode } from 'react';
import { UserAvatar } from './UserChip';
import RoleBadge from './RoleBadge';
import { fmtDate } from '../lib/format';

/** Profile top section used by every profile (your own and other players'): big round photo, name, bio, a stats line and action buttons. Follow counts go in `social`, the follow / message buttons in `actions`. */
export default function ProfileHeader({ profile, stats, social, actions }: { profile: { username: string; avatarUrl: string; bannerUrl?: string; role: string; bio: string; joinedAt?: string }; stats?: string; social?: ReactNode; actions?: ReactNode }) {
  return (
    <>
    {profile.bannerUrl && (
      <div className="mx-auto w-full max-w-4xl px-4 pt-6"><img src={profile.bannerUrl} alt="" className="aspect-[3/1] w-full rounded-2xl border border-border object-cover" /></div>
    )}
    <section className={`mx-auto flex w-full max-w-xl flex-col items-center px-4 pb-6 text-center ${profile.bannerUrl ? '-mt-12 pt-0 sm:-mt-14' : 'pt-10'}`}>
      <UserAvatar username={profile.username} avatarUrl={profile.avatarUrl} className="h-28 w-28 text-3xl ring-4 ring-background sm:h-32 sm:w-32" />
      <h1 className="mt-4 break-all text-3xl font-semibold tracking-tight">{profile.username}</h1>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>@{profile.username}</span><RoleBadge role={profile.role} />
      </div>
      {social}
      {stats && <p className="mt-3 text-sm font-medium">{stats}</p>}
      <p className="mt-3 max-w-md whitespace-pre-line text-sm text-muted-foreground">{profile.bio || 'No bio yet.'}</p>
      {profile.joinedAt && <p className="mt-2 text-xs text-muted-foreground">Member since {fmtDate(profile.joinedAt)}</p>}
      {actions && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </section>
    </>
  );
}
