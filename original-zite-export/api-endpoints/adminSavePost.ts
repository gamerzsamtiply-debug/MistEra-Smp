import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, cleanUrl, fail, logActivity } from '../server/lib';

export default createEndpoint({
  description: 'Creates, edits, publishes or unpublishes an announcement or update',
  authenticated: true,
  inputSchema: z.object({ id: z.string().optional(), kind: z.enum(['Announcement', 'Update']), title: z.string(), body: z.string(), imageUrl: z.string(), published: z.boolean(), publishedAt: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    if (input.title.trim().length < 3) throw fail('BAD_REQUEST', 'Title must be at least 3 characters.');
    if (!input.body.trim()) throw fail('BAD_REQUEST', 'Description is required.');
    const date = input.publishedAt ? new Date(input.publishedAt) : new Date();
    if (isNaN(date.getTime())) throw fail('BAD_REQUEST', 'Please choose a valid publication date.');
    const record = { kind: input.kind, title: input.title.trim(), body: input.body.trim(), imageUrl: cleanUrl(input.imageUrl), published: input.published, publishedAt: date.toISOString() };
    if (input.id) await zite.posts.update({ id: input.id, record });
    else await zite.posts.create({ record });
    await logActivity(context, `${input.id ? 'Edited' : 'Created'} ${input.kind.toLowerCase()}${input.published ? ' (published)' : ' (draft)'}`, `${input.kind}: ${record.title}`);
    return { ok: true };
  },
});
