import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { fail } from '../server/lib';

export default createEndpoint({
  description: 'Returns a published content page (information or terms)',
  inputSchema: z.object({ slug: z.enum(['information', 'terms']) }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const p = await zite.contentPages.findOne({ filters: { slug: input.slug, published: true } });
    if (!p) throw fail('NOT_FOUND', 'This page has not been published yet.');
    return { title: p.title ?? '', content: p.content ?? '', updatedAt: p.updatedAt ?? '' };
  },
});
