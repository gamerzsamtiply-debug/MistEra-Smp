-- ============================================================================
-- MistEra SMP - migration 0009: follow system, inbox, notifications, Gmail-only sign-ups
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to run more than once. Run it AFTER 0001 ... 0008.
--
-- Same security model as every other table: Row Level Security is ON, there are no
-- policies and client roles have no privileges. Only the Vercel API (service_role) touches them.
-- ============================================================================

-- ---------- follows ----------------------------------------------------------
create table if not exists public.follows (
  follower_id  uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id, created_at desc);

-- ---------- messages (inbox) -------------------------------------------------
-- deleted_at            = "delete for everyone" (text and file are removed, a notice stays)
-- sender_hidden / recipient_hidden = "delete for me" (only hides it from that person)
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  sender_id        uuid not null references auth.users (id) on delete cascade,
  recipient_id     uuid not null references auth.users (id) on delete cascade,
  body             text not null default '' check (char_length(body) <= 2000),
  attachment_path  text not null default '',
  attachment_name  text not null default '',
  attachment_type  text not null default '',
  attachment_size  integer not null default 0,
  edited_at        timestamptz,
  deleted_at       timestamptz,
  sender_hidden    boolean not null default false,
  recipient_hidden boolean not null default false,
  read_at          timestamptz,
  created_at       timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists messages_pair_idx   on public.messages (sender_id, recipient_id, created_at desc);
create index if not exists messages_inbox_idx  on public.messages (recipient_id, created_at desc);
create index if not exists messages_unread_idx on public.messages (recipient_id) where read_at is null;

-- ---------- notifications ----------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,   -- who receives it
  actor_id   uuid references auth.users (id) on delete set null,           -- who caused it
  type       text not null check (type in ('follow','message','comment','post','like')),
  title      text not null default '',
  body       text not null default '',
  url        text not null default '',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.follows       enable row level security;
alter table public.messages      enable row level security;
alter table public.notifications enable row level security;
revoke all on table public.follows, public.messages, public.notifications from anon, authenticated;
grant all on table public.follows, public.messages, public.notifications to service_role;

-- ---------- private bucket for message attachments ---------------------------
-- Not public: files are only reachable through short-lived signed links the API hands to the two people in the chat.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-files', 'message-files', false, 26214400,
  array['image/png','image/jpeg','image/webp','image/gif','application/pdf','text/plain','application/zip',
        'application/x-zip-compressed','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'audio/mpeg','audio/ogg','audio/webm','video/mp4','video/webm']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- Gmail-only sign-ups (enforced in the database, so it cannot be bypassed) ----------
-- Real Gmail addresses are 6-30 characters of letters, digits and dots. Dots and "+tags" never create a second
-- Gmail inbox, so the address is compared in its canonical form to stop one person registering many accounts.
create or replace function public.normalize_gmail(p text)
returns text
language sql
immutable
as $$
  select case
    when lower(split_part(p, '@', 2)) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(p), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else lower(p)
  end;
$$;

create or replace function public.enforce_gmail_signup()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  dom text;
  loc text;
begin
  if new.email is null or new.email = '' then
    return new;
  end if;
  dom := lower(split_part(new.email, '@', 2));
  loc := split_part(lower(new.email), '@', 1);
  if dom not in ('gmail.com', 'googlemail.com') then
    raise exception 'Only valid Gmail addresses can be used to create an account.';
  end if;
  if loc !~ '^[a-z0-9][a-z0-9.]{4,28}[a-z0-9]$' or loc ~ '\.\.' then
    raise exception 'That is not a valid Gmail address.';
  end if;
  if exists (
    select 1 from auth.users u
    where u.id <> new.id and u.email is not null
      and public.normalize_gmail(u.email) = public.normalize_gmail(new.email)
  ) then
    raise exception 'An account with this Gmail address already exists.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_gmail_signup on auth.users;
create trigger trg_enforce_gmail_signup
  before insert or update of email on auth.users
  for each row execute function public.enforce_gmail_signup();
