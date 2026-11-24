import { z } from 'zod';
import { optionalAuthEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { ensureProfile, findRow } from '../lib.js';
import { guestKeyOrNull } from '../guest.js';
import type { AlbumCommentRow } from '../types.js';

// Deletes a comment (and its replies). Allowed for the author (member or the same guest browser) and for Moderators, Admins and the Owner.
export default optionalAuthEndpoint(z.object({ id: z.string().max(64), visitorId: z.string().max(64).optional() }), async ({ input, user }) => {
  const c = await findRow<AlbumCommentRow>('album_comments', input.id);
  if (!c) throw fail('NOT_FOUND', 'That comment no longer exists.');
  if (user) {
    const me = await ensureProfile(user);
    const moderator = me.role === 'Owner' || me.role === 'Admin' || me.role === 'Moderator';
    if (c.user_id !== user.id && !moderator) throw fail('FORBIDDEN', 'You can only delete your own comments.');
  } else {
    const key = guestKeyOrNull(input.visitorId);
    if (!key || c.guest_key !== key) throw fail('FORBIDDEN', 'You can only delete your own comments.');
  }
  must(await db().from('album_comments').delete().eq('id', c.id), 'album_comments.delete');
  return { ok: true };
});
