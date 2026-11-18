import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, profileMap, uid } from '../server/lib';

export default createEndpoint({
  description: 'Lists all suggestions for admins',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    await requireAdmin(context);
    const [{ records }, pm] = await Promise.all([zite.suggestions.findAll({ sort: [{ field: 'submittedAt', direction: 'desc' }], limit: 1000 }), profileMap()]);
    return { items: records.map((s) => ({ id: s.id, title: s.title ?? '', description: s.description ?? '', status: s.status ?? 'Open', submittedAt: s.submittedAt ?? '', author: pm.get(uid(s.author)) ?? null })) };
  },
});
