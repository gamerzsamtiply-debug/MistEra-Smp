import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, mustOr } from '../db.js';
import { buildStaffList, profileMap } from '../lib.js';
import type { AlbumRow, PartnerRow, PostRow } from '../types.js';

// Returns homepage previews: latest posts, staff, partners and album
export default publicEndpoint(z.object({}), async () => {
  const [postsR, partnersR, albumR, staffAll] = await Promise.all([
    db().from('posts').select('*').eq('published', true).order('published_at', { ascending: false, nullsFirst: false }).limit(40),
    db().from('partners').select('*').order('created_at', { ascending: true }).limit(6),
    db().from('album_submissions').select('*').eq('status', 'Approved').order('submitted_at', { ascending: false }).limit(8),
    buildStaffList().catch((e) => { console.error('[home] staff failed:', e); return []; }),
  ]);
  const posts = (mustOr(postsR, 'posts.home', [])) as PostRow[];
  const partners = (mustOr(partnersR, 'partners.home', [])) as PartnerRow[];
  const album = (mustOr(albumR, 'album.home', [])) as AlbumRow[];
  const pm = await profileMap(album.map((a) => a.uploader)).catch(() => new Map());
  const mapPost = (p: PostRow) => ({ id: p.id, title: p.title ?? '', body: p.body ?? '', imageUrl: p.image_url ?? '', publishedAt: p.published_at ?? '' });
  const staff = staffAll.slice(0, 8).map(({ id, name, avatarUrl, position, profileId }) => ({ id, name, avatarUrl, position, profileId }));
  return {
    announcements: posts.filter((p) => p.kind === 'Announcement').slice(0, 3).map(mapPost),
    updates: posts.filter((p) => p.kind === 'Update').slice(0, 3).map(mapPost),
    partners: partners.map((p) => ({ id: p.id, name: p.name ?? '', category: p.category ?? '', logoUrl: p.logo_url ?? '', websiteUrl: p.website_url ?? '', description: p.description ?? '' })),
    album: album.map((a) => ({ id: a.id, imageUrl: a.image_url ?? '', caption: a.caption ?? '', uploader: (a.uploader && pm.get(a.uploader)) || null })),
    staff,
  };
});
