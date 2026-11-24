-- ============================================================================
-- MistEra SMP - migration 0010: guest likes + guest comments + phone push notifications
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to run more than once. Run it AFTER 0001 ... 0009.
--
-- Same security model as every other table: Row Level Security is ON, no policies,
-- client roles have no privileges. Only the Vercel API (service_role) touches them.
-- ============================================================================

-- ---------- 1) guest likes ---------------------------------------------------
-- A guest is identified by the anonymous visitor id kept in their browser (guest_key).
alter table public.album_likes add column if not exists guest_key text;
alter table public.album_likes drop constraint if exists album_likes_pkey;   -- must go first: user_id is part of it
alter table public.album_likes alter column user_id drop not null;

create unique index if not exists album_likes_user_uniq
  on public.album_likes (submission_id, user_id) where user_id is not null;
create unique index if not exists album_likes_guest_uniq
  on public.album_likes (submission_id, guest_key) where guest_key is not null;

alter table public.album_likes drop constraint if exists album_likes_who_chk;
alter table public.album_likes add constraint album_likes_who_chk
  check ((user_id is not null) <> (guest_key is not null));

-- ---------- 2) guest comments ------------------------------------------------
alter table public.album_comments add column if not exists guest_name text;
alter table public.album_comments add column if not exists guest_key  text;
alter table public.album_comments alter column user_id drop not null;

alter table public.album_comments drop constraint if exists album_comments_who_chk;
alter table public.album_comments add constraint album_comments_who_chk
  check (
    (user_id is not null and guest_key is null)
    or (user_id is null and guest_key is not null and char_length(coalesce(guest_name, '')) between 2 and 24)
  );

-- ---------- 3) stats function now also knows "did this GUEST like it" --------
drop function if exists public.album_stats(uuid[], uuid);
create or replace function public.album_stats(p_ids uuid[], p_user uuid default null, p_guest text default null)
returns table (submission_id uuid, likes bigint, comments bigint, liked boolean)
language sql stable
as $$
  select s.id,
         (select count(*) from public.album_likes l where l.submission_id = s.id),
         (select count(*) from public.album_comments c where c.submission_id = s.id),
         exists (
           select 1 from public.album_likes l
           where l.submission_id = s.id
             and ((p_user  is not null and l.user_id   = p_user)
               or (p_guest is not null and l.guest_key = p_guest))
         )
  from unnest(p_ids) as s(id);
$$;
revoke all on function public.album_stats(uuid[], uuid, text) from public, anon, authenticated;
grant execute on function public.album_stats(uuid[], uuid, text) to service_role;

-- ---------- 4) phone / browser push subscriptions ----------------------------
-- One row per browser (endpoint). user_id is filled in when the person is (or later becomes) logged in;
-- guests keep user_id = null and are identified only by their anonymous visitor id.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_id     uuid references auth.users (id) on delete cascade,
  visitor_key text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;
grant all on table public.push_subscriptions to service_role;
