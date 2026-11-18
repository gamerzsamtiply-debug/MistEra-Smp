import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { profileMap, STAFF_ROLES, toPublicUser } from '../lib.js';
import type { AlbumRow, PartnerRow, PostRow, ProfileRow } from '../types.js';

// Returns homepage previews: latest posts, staff, partners and album
export default publicEndpoint(z.object({}), async () => {
  const [postsR, partnersR, albumR, staffR] = await Promise.all([
    db().from('posts').select('*').eq('published', true).order('published_at', { ascending: false, nullsFirst: false }).limit(40),
    db().from('partners').select('*').order('created_at', { ascending: true }).limit(6),
    db().from('album_submissions').select('*').eq('status', 'Approved').order('submitted_at', { ascending: false }).limit(8),
    db().from('profiles').select('*').in('role', STAFF_ROLES).order('joined_at', { ascending: true }).limit(500),
  ]);
  const posts = (must(postsR, 'posts.home') ?? []) as PostRow[];
  const partners = (must(partnersR, 'partners.home') ?? []) as PartnerRow[];
  const album = (must(albumR, 'album.home') ?? []) as AlbumRow[];
  const staffRows = (must(staffR, 'profiles.staff') ?? []) as ProfileRow[];
  const pm = await profileMap(album.map((a) => a.uploader));
  const mapPost = (p: PostRow) => ({ id: p.id, title: p.title ?? '', body: p.body ?? '', imageUrl: p.image_url ?? '', publishedAt: p.published_at ?? '' });
  const order: string[] = ['Owner', 'Admin', 'Moderator', 'Staff'];
  const staff = staffRows
    .map(toPublicUser)
    .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))
    .slice(0, 8);
  return {
    announcements: posts.filter((p) => p.kind === 'Announcement').slice(0, 3).map(mapPost),
    updates: posts.filter((p) => p.kind === 'Update').slice(0, 3).map(mapPost),
    partners: partners.map((p) => ({ id: p.id, name: p.name ?? '', category: p.category ?? '', logoUrl: p.logo_url ?? '', websiteUrl: p.website_url ?? '', description: p.description ?? '' })),
    album: album.map((a) => ({ id: a.id, imageUrl: a.image_url ?? '', caption: a.caption ?? '', uploader: (a.uploader && pm.get(a.uploader)) || null })),
    staff,
  };
});
