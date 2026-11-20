import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { profileMap, requireAdmin } from '../lib.js';
import type { AlbumRow } from '../types.js';

// Lists album submissions by status for moderation
export default authEndpoint(z.object({ status: z.enum(['Pending', 'Approved', 'Declined']) }), async ({ input, user }) => {
  await requireAdmin(user);
  const r = await db().from('album_submissions').select('*').eq('status', input.status).order('submitted_at', { ascending: false }).limit(500);
  const rows = (must(r, 'album.adminList') ?? []) as AlbumRow[];
  const pm = await profileMap(rows.map((a) => a.uploader));
  return {
    items: rows.map((a) => ({ id: a.id, mediaType: a.media_type === 'video' ? 'video' : 'image', imageUrl: a.image_url ?? '', caption: a.caption ?? '', submittedAt: a.submitted_at ?? '', status: a.status ?? 'Pending', uploader: (a.uploader && pm.get(a.uploader)) || null })),
  };
});
