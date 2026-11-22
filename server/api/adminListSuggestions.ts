import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, selectAll } from '../db.js';
import { profileMap, requireAdmin } from '../lib.js';
import type { SuggestionRow } from '../types.js';

// Lists all suggestions for admins
export default authEndpoint(z.object({}), async ({ user }) => {
  await requireAdmin(user);
  const rows = await selectAll<SuggestionRow>((from, to) => db().from('suggestions').select('*').order('submitted_at', { ascending: false }).range(from, to), 1000, 'suggestions.adminList');
  const pm = await profileMap(rows.map((s) => s.author));
  return {
    items: rows.map((s) => ({ id: s.id, title: s.title ?? '', description: s.description ?? '', status: s.status ?? 'Open', submittedAt: s.submitted_at ?? '', author: (s.author && pm.get(s.author)) || null })),
  };
});
