import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { ensureProfile, fail } from '../server/lib';

export default createEndpoint({
  description: 'Submits a suggestion from the signed-in user',
  authenticated: true,
  inputSchema: z.object({ title: z.string(), description: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await ensureProfile(context);
    const title = input.title.trim(), description = input.description.trim();
    if (title.length < 4 || title.length > 100) throw fail('BAD_REQUEST', 'Title must be between 4 and 100 characters.');
    if (description.length < 10 || description.length > 2000) throw fail('BAD_REQUEST', 'Description must be between 10 and 2000 characters.');
    const { records } = await zite.suggestions.findAll({ filters: { author: context.user.id, status: 'Open' }, limit: 30 });
    if (records.length >= 20) throw fail('RATE_LIMITED', 'You have too many open suggestions. Please wait for staff to review them.');
    await zite.suggestions.create({ record: { title, description, author: context.user.id, status: 'Open' } });
    return { ok: true };
  },
});
