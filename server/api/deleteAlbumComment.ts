import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { ensureProfile, findRow } from '../lib.js';
import type { AlbumCommentRow } from '../types.js';

// Deletes a comment (and its replies). Allowed for the author and for Moderators, Admins and the Owner.
export default authEndpoint(z.object({ id: z.string().max(64) }), async ({ input, user }) => {
  const me = await ensureProfile(user);
  const c = await findRow<AlbumCommentRow>('album_comments', input.id);
  if (!c) throw fail('NOT_FOUND', 'That comment no longer exists.');
  const moderator = me.role === 'Owner' || me.role === 'Admin' || me.role === 'Moderator';
  if (c.user_id !== user.id && !moderator) throw fail('FORBIDDEN', 'You can only delete your own comments.');
  must(await db().from('album_comments').delete().eq('id', c.id), 'album_comments.delete');
  return { ok: true };
});
