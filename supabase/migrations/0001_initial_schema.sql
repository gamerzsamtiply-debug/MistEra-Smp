-- ============================================================================
-- MistEra SMP — initial schema (migrated from the Zite database export)
--
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query → Run
-- (or `supabase db push` if you use the Supabase CLI).
--
-- Zite table        → Postgres table
-- Site Settings     → site_settings
-- Join Steps        → join_steps
-- Profiles          → profiles
-- Partners          → partners
-- Posts             → posts
-- Content Pages     → content_pages
-- Album Submissions → album_submissions
-- Suggestions       → suggestions
-- Activity Logs     → activity_logs
-- Error Logs        → error_logs
--
-- Security model: every table has Row Level Security ENABLED with NO policies and
-- all client-role privileges revoked. The browser never queries these tables.
-- All reads/writes go through the Vercel API (server/), which uses the
-- service_role key and performs its own authorization checks.
-- ============================================================================

-- ---------- helpers ----------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- site_settings (single row, key = 'main') -------------------------
create table if not exists public.site_settings (
  id                  uuid primary key default gen_random_uuid(),
  key                 text not null unique,
  server_address      text not null default '',
  server_port         integer check (server_port is null or (server_port between 1 and 65535)),
  platform            text not null default '',
  server_status       text not null default 'Online' check (server_status in ('Online','Offline','Restarting')),
  discord_url         text not null default '',
  vote_url            text not null default '',
  ticket_url          text not null default '',
  hero_tagline        text not null default '',
  intro_text          text not null default '',
  maintenance_mode    boolean not null default false,
  maintenance_message text not null default '',
  hero_image          text not null default '',
  gallery_image_one   text not null default '',
  gallery_image_two   text not null default '',
  banner_image        text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
drop trigger if exists trg_site_settings_updated on public.site_settings;
create trigger trg_site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------- join_steps (How to Join guide: slots 1..5) -----------------------
create table if not exists public.join_steps (
  id           uuid primary key default gen_random_uuid(),
  slot         integer not null unique check (slot between 1 and 5),
  title        text not null default '',
  instructions text not null default '',
  image_url    text not null default '',
  enabled      boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_join_steps_updated on public.join_steps;
create trigger trg_join_steps_updated before update on public.join_steps
  for each row execute function public.set_updated_at();

-- ---------- profiles (linked 1:1 to Supabase Auth users) ---------------------
create table if not exists public.profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  username   text not null unique,
  bio        text not null default '',
  avatar_url text not null default '',
  role       text not null default 'Member' check (role in ('Owner','Admin','Moderator','Staff','Member')),
  joined_at  timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);

-- ---------- partners ---------------------------------------------------------
create table if not exists public.partners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default 'Community' check (category in ('Discord','Hosting','Shop','Server','SMP','Community')),
  description text not null default '',
  logo_url    text not null default '',
  website_url text not null default '',
  created_at  timestamptz not null default now()
);

-- ---------- posts (announcements + updates) ----------------------------------
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  kind         text not null check (kind in ('Announcement','Update')),
  body         text not null default '',
  image_url    text not null default '',
  published    boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists posts_kind_pub_idx on public.posts (kind, published, published_at desc);

-- ---------- content_pages (Information + Terms) ------------------------------
create table if not exists public.content_pages (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug in ('information','terms')),
  title      text not null default '',
  content    text not null default '',
  published  boolean not null default false,
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_content_pages_updated on public.content_pages;
create trigger trg_content_pages_updated before update on public.content_pages
  for each row execute function public.set_updated_at();

-- ---------- album_submissions ------------------------------------------------
create table if not exists public.album_submissions (
  id           uuid primary key default gen_random_uuid(),
  caption      text not null default '',
  image_url    text not null,
  uploader     uuid references auth.users (id) on delete set null,
  status       text not null default 'Pending' check (status in ('Pending','Approved','Declined')),
  submitted_at timestamptz not null default now()
);
create index if not exists album_status_idx   on public.album_submissions (status, submitted_at desc);
create index if not exists album_uploader_idx on public.album_submissions (uploader, status);

-- ---------- suggestions ------------------------------------------------------
create table if not exists public.suggestions (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null default '',
  author       uuid references auth.users (id) on delete set null,
  status       text not null default 'Open' check (status in ('Open','Under Review','Accepted','Declined')),
  submitted_at timestamptz not null default now()
);
create index if not exists suggestions_status_idx on public.suggestions (status, submitted_at desc);
create index if not exists suggestions_author_idx on public.suggestions (author, status);

-- ---------- activity_logs (admin audit trail) --------------------------------
create table if not exists public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  action      text not null,
  admin_email text not null default '',
  resource    text not null default '',
  details     text not null default '',
  logged_at   timestamptz not null default now()
);
create index if not exists activity_logged_idx on public.activity_logs (logged_at desc);

-- ---------- error_logs (client/server errors) --------------------------------
create table if not exists public.error_logs (
  id             uuid primary key default gen_random_uuid(),
  operation      text not null default '',
  category       text not null default '',
  correlation_id text not null default '',
  message        text not null default '',
  logged_at      timestamptz not null default now()
);
create index if not exists error_logged_idx on public.error_logs (logged_at desc);

-- ---------- lock the tables down (RLS on, no policies, no client grants) ------
alter table public.site_settings      enable row level security;
alter table public.join_steps         enable row level security;
alter table public.profiles           enable row level security;
alter table public.partners           enable row level security;
alter table public.posts              enable row level security;
alter table public.content_pages      enable row level security;
alter table public.album_submissions  enable row level security;
alter table public.suggestions        enable row level security;
alter table public.activity_logs      enable row level security;
alter table public.error_logs         enable row level security;

revoke all on table
  public.site_settings, public.join_steps, public.profiles, public.partners, public.posts,
  public.content_pages, public.album_submissions, public.suggestions,
  public.activity_logs, public.error_logs
from anon, authenticated;

-- service_role keeps full access (it also bypasses RLS)
grant all on table
  public.site_settings, public.join_steps, public.profiles, public.partners, public.posts,
  public.content_pages, public.album_submissions, public.suggestions,
  public.activity_logs, public.error_logs
to service_role;

-- ---------- storage bucket for uploaded images --------------------------------
-- Public-read bucket (images are shown on the public site). Uploads never use
-- anon/authenticated policies: the API hands out short-lived signed upload URLs
-- to signed-in users only. The bucket itself enforces 5 MB + image types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads', 'uploads', true, 5242880,
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- default settings row (same defaults the original app created) -----
insert into public.site_settings (key, server_status, platform, maintenance_mode)
values ('main', 'Online', 'Minecraft Bedrock Edition', false)
on conflict (key) do nothing;
