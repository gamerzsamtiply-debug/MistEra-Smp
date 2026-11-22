import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin } from '../server/lib';

export default createEndpoint({
  description: 'Lists all announcements or updates, including drafts',
  authenticated: true,
  inputSchema: z.object({ kind: z.enum(['Announcement', 'Update']) }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    const { records } = await zite.posts.findAll({ filters: { kind: input.kind }, sort: [{ field: 'publishedAt', direction: 'desc' }], limit: 500 });
    return { posts: records.map((p) => ({ id: p.id, title: p.title ?? '', body: p.body ?? '', imageUrl: p.imageUrl ?? '', published: !!p.published, publishedAt: p.publishedAt ?? '' })) };
  },
});
