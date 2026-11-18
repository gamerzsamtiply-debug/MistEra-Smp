-- 0003: Staff members (managed like Partners; no account required) + one-off backfill.
-- Safe to run more than once. Existing data is not modified or deleted.

create table if not exists public.staff_members (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 40),
  avatar_url    text not null default '',
  position      text not null default 'Staff'
                check (position in ('Owner','Admin','Moderator','Developer','Builder','Helper','Staff')),
  -- Optional link to a registered account (cosmetic only: it never grants any access).
  profile_id    uuid unique references public.profiles (id) on delete set null,
  -- One-time link code: only a hash is stored, and it expires.
  claim_hash    text unique,
  claim_expires timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists staff_members_position_idx on public.staff_members (position, created_at);

alter table public.staff_members enable row level security;
revoke all on table public.staff_members from anon, authenticated;
grant all on table public.staff_members to service_role;

-- Keep everyone who is already shown on the Staff page today.
-- (The owner account is not copied: it always appears automatically, as "Admin".)
insert into public.staff_members (name, avatar_url, position, profile_id)
select p.username, p.avatar_url, p.role, p.id
from public.profiles p
where p.role in ('Admin', 'Moderator', 'Staff')
  and not exists (select 1 from public.staff_members s where s.profile_id = p.id)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- OPTIONAL one-off (run separately, only if you want it): accounts that were created
-- earlier and never confirmed their e-mail can sign in without the confirmation link.
-- Replace the address below with your OWNER_EMAIL so that account is never auto-confirmed.
--
-- update auth.users
--    set email_confirmed_at = now()
--  where email_confirmed_at is null
--    and lower(email) <> lower('YOUR-OWNER-EMAIL@example.com');
-- ─────────────────────────────────────────────────────────────────────────────
