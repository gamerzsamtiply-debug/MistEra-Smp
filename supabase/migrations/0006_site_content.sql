-- 0006: everything on the public site becomes editable from Admin.
-- Safe to re-run. Existing data is kept. Empty values fall back to the built-in text on the website.

-- Homepage hero + "about" block + SEO description (all editable in Admin > Settings)
alter table public.site_settings
  add column if not exists hero_title       text not null default '',
  add column if not exists about_heading    text not null default '',
  add column if not exists about_text       text not null default '',
  add column if not exists about_tagline    text not null default '',
  add column if not exists seo_description  text not null default '';

-- More editable pages: About us, Rules, Privacy (plus the existing Information and Terms)
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.content_pages'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%slug%'
  loop
    execute format('alter table public.content_pages drop constraint %I', c.conname);
  end loop;
  alter table public.content_pages
    add constraint content_pages_slug_check check (slug in ('information','about','rules','terms','privacy'));
end $$;
