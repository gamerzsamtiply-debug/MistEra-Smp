-- ============================================================================
-- MistEra SMP - migration 0008: profile banner
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to run more than once. Run it AFTER 0001 ... 0007.
--
-- Adds profiles.banner_url so every member can set a banner image on their profile.
-- ============================================================================
alter table public.profiles add column if not exists banner_url text not null default '';
