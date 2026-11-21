-- 0004: Feedback box. Anyone (logged in or not) can send feedback; only admins can read it.
-- Safe to run more than once.
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '',
  contact    text not null default '',
  message    text not null check (char_length(message) between 5 and 2000),
  user_id    uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;
revoke all on table public.feedback from anon, authenticated;
grant all on table public.feedback to service_role;
