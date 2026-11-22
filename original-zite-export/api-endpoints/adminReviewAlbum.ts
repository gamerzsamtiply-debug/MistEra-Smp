import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, fail, logActivity } from '../server/lib';

export default createEndpoint({
  description: 'Approves, declines or deletes an album submission',
  authenticated: true,
  inputSchema: z.object({ id: z.string(), action: z.enum(['Approved', 'Declined', 'Delete']) }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    const a = await zite.albumSubmissions.findOne({ id: input.id });
    if (!a) throw fail('NOT_FOUND', 'That submission no longer exists.');
    if (input.action === 'Delete') await zite.albumSubmissions.delete({ id: a.id });
    else await zite.albumSubmissions.update({ id: a.id, record: { status: input.action } });
    await logActivity(context, input.action === 'Delete' ? 'Deleted album image' : `${input.action} album image`, 'Community Album', a.caption || a.imageUrl || '');
    return { ok: true };
  },
});
