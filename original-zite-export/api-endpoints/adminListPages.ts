import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin } from '../server/lib';

export default createEndpoint({
  description: 'Lists Information and Terms pages for editing',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    await requireAdmin(context);
    const { records } = await zite.contentPages.findAll({ limit: 10 });
    return {
      pages: (['information', 'terms'] as const).map((slug) => {
        const p = records.find((r) => r.slug === slug);
        return { slug, title: p?.title ?? (slug === 'terms' ? 'Terms of Service' : 'Server Information'), content: p?.content ?? '', published: !!p?.published, updatedAt: p?.updatedAt ?? '' };
      }),
    };
  },
});
