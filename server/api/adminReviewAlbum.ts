import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { findRow, logActivity, requireModerator } from '../lib.js';
import type { AlbumRow } from '../types.js';

// Approves or declines an album submission (Moderators, Admins, Owner). Deleting one for good is Admin/Owner only.
export default authEndpoint(z.object({ id: z.string().max(64), action: z.enum(['Approved', 'Declined', 'Delete']) }), async ({ input, user }) => {
  const me = await requireModerator(user);
  if (input.action === 'Delete' && me.role === 'Moderator') throw fail('FORBIDDEN', 'Only Admins can delete album posts permanently. You can decline it instead.');
  const a = await findRow<AlbumRow>('album_submissions', input.id);
  if (!a) throw fail('NOT_FOUND', 'That submission no longer exists.');
  if (input.action === 'Delete') must(await db().from('album_submissions').delete().eq('id', a.id), 'album.delete');
  else must(await db().from('album_submissions').update({ status: input.action }).eq('id', a.id), 'album.review');
  await logActivity(user, input.action === 'Delete' ? 'Deleted album image' : `${input.action} album image`, 'Community Album', a.caption || a.image_url || '');
  return { ok: true };
});
