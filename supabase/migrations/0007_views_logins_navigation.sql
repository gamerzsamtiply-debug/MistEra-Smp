-- ============================================================================
-- MistEra SMP - migration 0007: site views, album views, admin-only login log
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to run more than once. Run it AFTER 0001 ... 0006.
--
-- What this adds
--   site_views    one row per page visit (every page: /, /album, /profile, /staff ...)  -> admin "Visitors & Logins" tab
--   album_views   one row per (album post, viewer): each person counts once per post     -> view count on posts
--   login_events  who signed in, when, from which IP                                      -> ADMIN ONLY
--   site_view_summary()  / album_view_counts()  helper functions used by the API
--
-- Nobody but the server (service_role key, used only by the Vercel API) can read or write these
-- tables: RLS is on and every grant for anon/authenticated is revoked. The API only returns login
-- info to admins (requireAdmin).
-- ============================================================================

-- ---------- 1) site_views : every page visit ----------
create table if not exists public.site_views (
  id         bigint generated always as identity primary key,
  visitor_id text        not null check (char_length(visitor_id) between 8 and 64),
  path       text        not null check (char_length(path) between 1 and 200),
  user_id    uuid        references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists site_views_created_idx on public.site_views (created_at desc);
create index if not exists site_views_path_idx    on public.site_views (path);
create index if not exists site_views_visitor_idx on public.site_views (visitor_id);

-- ---------- 2) album_views : each viewer counts once per post ----------
create table if not exists public.album_views (
  submission_id uuid        not null references public.album_submissions (id) on delete cascade,
  viewer_key    text        not null check (char_length(viewer_key) between 3 and 80), -- 'u:<user id>' or 'v:<visitor id>'
  created_at    timestamptz not null default now(),
  primary key (submission_id, viewer_key)
);

-- ---------- 3) login_events : ADMIN ONLY ----------
create table if not exists public.login_events (
  id         bigint generated always as identity primary key,
  user_id    uuid        references auth.users (id) on delete set null,
  email      text        not null default '',
  method     text        not null default 'password',
  ip         text        not null default '',
  created_at timestamptz not null default now()
);
create index if not exists login_events_created_idx on public.login_events (created_at desc);

-- ---------- 4) lock everything down ----------
alter table public.site_views   enable row level security;
alter table public.album_views  enable row level security;
alter table public.login_events enable row level security;
revoke all on table public.site_views, public.album_views, public.login_events from anon, authenticated;
grant  all on table public.site_views, public.album_views, public.login_events to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------- 5) view counts for many album posts in one query ----------
create or replace function public.album_view_counts(p_ids uuid[])
returns table (submission_id uuid, views bigint)
language sql stable
as $$
  select s.id, (select count(*) from public.album_views v where v.submission_id = s.id)
  from unnest(p_ids) as s(id);
$$;
revoke all on function public.album_view_counts(uuid[]) from public, anon, authenticated;
grant execute on function public.album_view_counts(uuid[]) to service_role;

-- ---------- 6) numbers for the admin "Visitors & Logins" tab ----------
create or replace function public.site_view_summary(p_days integer default 14)
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'total',  (select count(*) from public.site_views),
    'unique', (select count(distinct visitor_id) from public.site_views),
    'today',  (select count(*) from public.site_views where created_at >= date_trunc('day', now())),
    'last7',  (select count(*) from public.site_views where created_at >= now() - interval '7 days'),
    'daily',  coalesce((
                select jsonb_agg(jsonb_build_object('day', d, 'views', v, 'visitors', u) order by d)
                from (
                  select date_trunc('day', created_at)::date as d, count(*) as v, count(distinct visitor_id) as u
                  from public.site_views
                  where created_at >= now() - make_interval(days => greatest(p_days, 1))
                  group by 1
                ) t), '[]'::jsonb),
    'topPages', coalesce((
                select jsonb_agg(jsonb_build_object('path', path, 'views', v) order by v desc)
                from (select path, count(*) as v from public.site_views group by path order by v desc limit 12) t), '[]'::jsonb)
  );
$$;
revoke all on function public.site_view_summary(integer) from public, anon, authenticated;
grant execute on function public.site_view_summary(integer) to service_role;

-- ---------- 7) housekeeping: keep 180 days of visits and 365 days of logins ----------
-- (run manually now and then, or schedule it with pg_cron)
-- delete from public.site_views   where created_at < now() - interval '180 days';
-- delete from public.login_events where created_at < now() - interval '365 days';
