import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { fail, uid } from '../server/lib';

export default createEndpoint({
  description: 'Deletes one of the signed-in user own suggestions',
  authenticated: true,
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    const s = await zite.suggestions.findOne({ id: input.id });
    if (!s || uid(s.author) !== context.user.id) throw fail('FORBIDDEN', 'You can only manage your own suggestions.');
    await zite.suggestions.delete({ id: s.id });
    return { ok: true };
  },
});
