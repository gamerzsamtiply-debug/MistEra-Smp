import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must, isUuid } from '../db.js';
import { fail } from '../errors.js';
import { logActivity, requireAdmin } from '../lib.js';

// Deletes one feedback message
export default authEndpoint(z.object({ id: z.string().max(80) }), async ({ input, user }) => {
  await requireAdmin(user);
  if (!isUuid(input.id)) throw fail('NOT_FOUND', 'That feedback was already removed.');
  must(await db().from('feedback').delete().eq('id', input.id), 'feedback.delete');
  await logActivity(user, 'Deleted feedback', `Feedback ${input.id}`);
  return { ok: true };
});
