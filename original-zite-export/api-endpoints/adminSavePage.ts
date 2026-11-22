import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, fail, logActivity } from '../server/lib';

export default createEndpoint({
  description: 'Saves and publishes the Information or Terms page',
  authenticated: true,
  inputSchema: z.object({ slug: z.enum(['information', 'terms']), title: z.string(), content: z.string(), published: z.boolean() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    if (!input.title.trim()) throw fail('BAD_REQUEST', 'Page title is required.');
    if (input.published && !input.content.trim()) throw fail('BAD_REQUEST', "You can't publish an empty page.");
    const record = { slug: input.slug, title: input.title.trim(), content: input.content, published: input.published };
    const existing = await zite.contentPages.findOne({ filters: { slug: input.slug } });
    if (existing) await zite.contentPages.update({ id: existing.id, record });
    else await zite.contentPages.create({ record });
    await logActivity(context, `Edited ${input.slug === 'terms' ? 'Terms of Service' : 'Information'} page`, 'Website Content', input.published ? 'Published' : 'Unpublished');
    return { ok: true };
  },
});
