import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { findRow } from '../lib.js';
import type { SuggestionRow } from '../types.js';

// Deletes one of the signed-in user's own suggestions
export default authEndpoint(z.object({ id: z.string().max(64) }), async ({ input, user }) => {
  const s = await findRow<SuggestionRow>('suggestions', input.id);
  if (!s || s.author !== user.id) throw fail('FORBIDDEN', 'You can only manage your own suggestions.');
  must(await db().from('suggestions').delete().eq('id', s.id).eq('author', user.id), 'suggestions.deleteMine');
  return { ok: true };
});
