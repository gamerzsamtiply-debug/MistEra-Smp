-- 0005: Community Album becomes a social feed: video uploads, likes, comments and replies.
-- Safe to run more than once. Run it in Supabase -> SQL Editor.

-- 1) photos AND videos in the album
alter table public.album_submissions
  add column if not exists media_type text not null default 'image' check (media_type in ('image','video'));

-- 2) likes (one per person per post)
create table if not exists public.album_likes (
  submission_id uuid not null references public.album_submissions (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (submission_id, user_id)
);

-- 3) comments; parent_id is set for replies (one level of replies)
create table if not exists public.album_comments (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.album_submissions (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  parent_id     uuid references public.album_comments (id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 500),
  created_at    timestamptz not null default now()
);
create index if not exists album_comments_post_idx on public.album_comments (submission_id, created_at);

alter table public.album_likes    enable row level security;
alter table public.album_comments enable row level security;
revoke all on table public.album_likes, public.album_comments from anon, authenticated;
grant all on table public.album_likes, public.album_comments to service_role;

-- 4) like / comment counts (and "did this person like it") for many posts in one query
create or replace function public.album_stats(p_ids uuid[], p_user uuid default null)
returns table (submission_id uuid, likes bigint, comments bigint, liked boolean)
language sql stable
as $$
  select s.id,
         (select count(*) from public.album_likes l where l.submission_id = s.id),
         (select count(*) from public.album_comments c where c.submission_id = s.id),
         exists (select 1 from public.album_likes l where l.submission_id = s.id and l.user_id = p_user)
  from unnest(p_ids) as s(id);
$$;
revoke all on function public.album_stats(uuid[], uuid) from public, anon, authenticated;
grant execute on function public.album_stats(uuid[], uuid) to service_role;

-- 5) the uploads bucket also accepts videos (up to 50 MB; Supabase's free plan allows at most 50 MB per file).
-- Images are still limited to 5 MB by the API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads', 'uploads', true, 52428800,
  array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
