import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, profileMap, uid } from '../server/lib';

export default createEndpoint({
  description: 'Lists album submissions by status for moderation',
  authenticated: true,
  inputSchema: z.object({ status: z.enum(['Pending', 'Approved', 'Declined']) }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    const [{ records }, pm] = await Promise.all([
      zite.albumSubmissions.findAll({ filters: { status: input.status }, sort: [{ field: 'submittedAt', direction: 'desc' }], limit: 500 }),
      profileMap(),
    ]);
    return { items: records.map((a) => ({ id: a.id, imageUrl: a.imageUrl ?? '', caption: a.caption ?? '', submittedAt: a.submittedAt ?? '', status: a.status ?? 'Pending', uploader: pm.get(uid(a.uploader)) ?? null })) };
  },
});
