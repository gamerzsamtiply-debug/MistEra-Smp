import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, fail, logActivity } from '../server/lib';

export default createEndpoint({
  description: 'Changes a suggestion status or deletes it',
  authenticated: true,
  inputSchema: z.object({ id: z.string(), action: z.enum(['Open', 'Under Review', 'Accepted', 'Declined', 'Delete']) }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    const s = await zite.suggestions.findOne({ id: input.id });
    if (!s) throw fail('NOT_FOUND', 'That suggestion no longer exists.');
    if (input.action === 'Delete') await zite.suggestions.delete({ id: s.id });
    else await zite.suggestions.update({ id: s.id, record: { status: input.action } });
    await logActivity(context, input.action === 'Delete' ? 'Deleted suggestion' : `Marked suggestion ${input.action}`, `Suggestion: ${s.title}`);
    return { ok: true };
  },
});
