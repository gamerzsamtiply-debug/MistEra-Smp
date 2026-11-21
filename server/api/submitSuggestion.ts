import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { countRows, ensureProfile } from '../lib.js';
import { enforceRateLimit } from '../ratelimit.js';

// Submits a suggestion from the signed-in user
export default authEndpoint(z.object({ title: z.string().max(1000), description: z.string().max(20000) }), async ({ input, user }) => {
  await ensureProfile(user);
  await enforceRateLimit('submitSuggestion', user.id, 30, 3600, 'You are submitting suggestions too quickly. Please try again later.');
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 4 || title.length > 100) throw fail('BAD_REQUEST', 'Title must be between 4 and 100 characters.');
  if (description.length < 10 || description.length > 2000) throw fail('BAD_REQUEST', 'Description must be between 10 and 2000 characters.');
  const open = await countRows('suggestions', (q) => q.eq('author', user.id).eq('status', 'Open'));
  if (open >= 20) throw fail('RATE_LIMITED', 'You have too many open suggestions. Please wait for staff to review them.');
  must(await db().from('suggestions').insert({ title, description, author: user.id, status: 'Open' }), 'suggestions.submit');
  return { ok: true };
});
