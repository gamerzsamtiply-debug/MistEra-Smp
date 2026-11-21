import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { findRow } from '../lib.js';
import type { AlbumRow } from '../types.js';

// Deletes one of the signed-in user's own album submissions
export default authEndpoint(z.object({ id: z.string().max(64) }), async ({ input, user }) => {
  const a = await findRow<AlbumRow>('album_submissions', input.id);
  if (!a || a.uploader !== user.id) throw fail('FORBIDDEN', 'You can only manage your own submissions.');
  must(await db().from('album_submissions').delete().eq('id', a.id).eq('uploader', user.id), 'album.deleteMine');
  return { ok: true };
});
