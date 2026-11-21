import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { findRow, logActivity, requireAdmin } from '../lib.js';
import type { AlbumRow } from '../types.js';

// Approves, declines or deletes an album submission
export default authEndpoint(z.object({ id: z.string().max(64), action: z.enum(['Approved', 'Declined', 'Delete']) }), async ({ input, user }) => {
  await requireAdmin(user);
  const a = await findRow<AlbumRow>('album_submissions', input.id);
  if (!a) throw fail('NOT_FOUND', 'That submission no longer exists.');
  if (input.action === 'Delete') must(await db().from('album_submissions').delete().eq('id', a.id), 'album.delete');
  else must(await db().from('album_submissions').update({ status: input.action }).eq('id', a.id), 'album.review');
  await logActivity(user, input.action === 'Delete' ? 'Deleted album image' : `${input.action} album image`, 'Community Album', a.caption || a.image_url || '');
  return { ok: true };
});
