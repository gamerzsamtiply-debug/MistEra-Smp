import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import type { AlbumRow } from '../types.js';

// Lists the signed-in user's own album submissions
export default authEndpoint(z.object({}), async ({ user }) => {
  const r = await db().from('album_submissions').select('*').eq('uploader', user.id).order('submitted_at', { ascending: false }).limit(200);
  const rows = (must(r, 'album.mine') ?? []) as AlbumRow[];
  return { items: rows.map((a) => ({ id: a.id, mediaType: a.media_type === 'video' ? 'video' : 'image', imageUrl: a.image_url ?? '', caption: a.caption ?? '', status: a.status ?? 'Pending', submittedAt: a.submitted_at ?? '' })) };
});
