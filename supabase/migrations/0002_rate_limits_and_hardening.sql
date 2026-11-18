-- ============================================================================
-- MistEra SMP — migration 0002: rate limiting, log retention, extra constraints
--
-- Run AFTER 0001 in: Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to run more than once.
-- ============================================================================

-- ---------- rate_limits (fixed-window counters, written only by the API) -------
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        integer not null default 0
);
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;
grant all on table public.rate_limits to service_role;

-- Atomically counts one hit for p_key and returns TRUE while the caller is within p_limit hits per
-- p_window_seconds. Also prunes stale limiter rows and old error logs now and then (cheap, ~1% of calls).
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit parameters';
  end if;

  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
        count        = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end
  returning r.count into v_count;

  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
    delete from public.error_logs  where logged_at    < now() - interval '30 days';
  end if;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------- defensive length limits (the API validates these too) --------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_bio_len') then
    alter table public.profiles add constraint profiles_bio_len check (char_length(bio) <= 2000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_fmt') then
    alter table public.profiles add constraint profiles_username_fmt check (username ~ '^[A-Za-z0-9_]{3,20}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'error_logs_message_len') then
    alter table public.error_logs add constraint error_logs_message_len check (char_length(message) <= 2000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'album_caption_len') then
    alter table public.album_submissions add constraint album_caption_len check (char_length(caption) <= 500) not valid;
  end if;
end;
$$;

-- ---------- helpful indexes ---------------------------------------------------
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);
create index if not exists posts_published_idx     on public.posts (published, published_at desc);
create index if not exists partners_created_idx    on public.partners (created_at);
