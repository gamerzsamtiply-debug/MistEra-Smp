import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, fail, logActivity } from '../server/lib';

export default createEndpoint({
  description: 'Deletes an announcement or update',
  authenticated: true,
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    const p = await zite.posts.findOne({ id: input.id });
    if (!p) throw fail('NOT_FOUND', 'That post was already deleted.');
    await zite.posts.delete({ id: p.id });
    await logActivity(context, `Deleted ${(p.kind ?? 'post').toLowerCase()}`, `${p.kind}: ${p.title}`);
    return { ok: true };
  },
});
