import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin } from '../server/lib';

export default createEndpoint({
  description: 'Lists registered users and their roles for admins',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    await requireAdmin(context);
    const { records } = await zite.profiles.findAll({ sort: [{ field: 'joinedAt', direction: 'desc' }], limit: 2000 });
    return { users: records.map((p) => ({ id: p.id, username: p.username ?? '', avatarUrl: p.avatarUrl ?? '', role: p.role ?? 'Member', joinedAt: p.joinedAt ?? '' })) };
  },
});
