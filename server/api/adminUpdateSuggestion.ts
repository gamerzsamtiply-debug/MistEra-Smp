import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { findRow, logActivity, requireAdmin } from '../lib.js';
import type { SuggestionRow } from '../types.js';

// Changes a suggestion status or deletes it
export default authEndpoint(z.object({ id: z.string().max(64), action: z.enum(['Open', 'Under Review', 'Accepted', 'Declined', 'Delete']) }), async ({ input, user }) => {
  await requireAdmin(user);
  const s = await findRow<SuggestionRow>('suggestions', input.id);
  if (!s) throw fail('NOT_FOUND', 'That suggestion no longer exists.');
  if (input.action === 'Delete') must(await db().from('suggestions').delete().eq('id', s.id), 'suggestions.delete');
  else must(await db().from('suggestions').update({ status: input.action }).eq('id', s.id), 'suggestions.update');
  await logActivity(user, input.action === 'Delete' ? 'Deleted suggestion' : `Marked suggestion ${input.action}`, `Suggestion: ${s.title}`);
  return { ok: true };
});
