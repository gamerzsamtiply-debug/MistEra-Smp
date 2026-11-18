import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { findRow, logActivity, requireAdmin } from '../lib.js';
import type { PostRow } from '../types.js';

// Deletes an announcement or update
export default authEndpoint(z.object({ id: z.string().max(64) }), async ({ input, user }) => {
  await requireAdmin(user);
  const p = await findRow<PostRow>('posts', input.id);
  if (!p) throw fail('NOT_FOUND', 'That post was already deleted.');
  must(await db().from('posts').delete().eq('id', p.id), 'posts.delete');
  await logActivity(user, `Deleted ${(p.kind ?? 'post').toLowerCase()}`, `${p.kind}: ${p.title}`);
  return { ok: true };
});
