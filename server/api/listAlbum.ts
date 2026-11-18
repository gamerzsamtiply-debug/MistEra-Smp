import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { profileMap } from '../lib.js';
import type { AlbumRow } from '../types.js';

// Lists approved community album images
export default publicEndpoint(z.object({}), async () => {
  const r = await db().from('album_submissions').select('*').eq('status', 'Approved').order('submitted_at', { ascending: false }).limit(500);
  const rows = (must(r, 'album.approved') ?? []) as AlbumRow[];
  const pm = await profileMap(rows.map((a) => a.uploader));
  return {
    images: rows.map((a) => ({ id: a.id, imageUrl: a.image_url ?? '', caption: a.caption ?? '', submittedAt: a.submitted_at ?? '', uploader: (a.uploader && pm.get(a.uploader)) || null })),
  };
});
