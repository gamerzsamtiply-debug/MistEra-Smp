import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import type { SuggestionRow } from '../types.js';

// Lists the signed-in user's own suggestions
export default authEndpoint(z.object({}), async ({ user }) => {
  const r = await db().from('suggestions').select('*').eq('author', user.id).order('submitted_at', { ascending: false }).limit(200);
  const rows = (must(r, 'suggestions.mine') ?? []) as SuggestionRow[];
  return { items: rows.map((s) => ({ id: s.id, title: s.title ?? '', description: s.description ?? '', status: s.status ?? 'Open', submittedAt: s.submitted_at ?? '' })) };
});
