import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, fail, logActivity } from '../server/lib';

export default createEndpoint({
  description: 'Deletes a partner',
  authenticated: true,
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    const p = await zite.partners.findOne({ id: input.id });
    if (!p) throw fail('NOT_FOUND', 'That partner was already removed.');
    await zite.partners.delete({ id: p.id });
    await logActivity(context, 'Deleted partner', `Partner ${p.name}`);
    return { ok: true };
  },
});
