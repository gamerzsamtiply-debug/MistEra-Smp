import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists published announcements or updates',
  inputSchema: z.object({ kind: z.enum(['Announcement', 'Update']) }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const { records } = await zite.posts.findAll({ filters: { published: true, kind: input.kind }, sort: [{ field: 'publishedAt', direction: 'desc' }], limit: 200 });
    return { posts: records.map((p) => ({ id: p.id, title: p.title ?? '', body: p.body ?? '', imageUrl: p.imageUrl ?? '', publishedAt: p.publishedAt ?? '' })) };
  },
});
