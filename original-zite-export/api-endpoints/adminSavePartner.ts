import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, cleanUrl, fail, logActivity } from '../server/lib';

export default createEndpoint({
  description: 'Creates or updates a partner',
  authenticated: true,
  inputSchema: z.object({ id: z.string().optional(), name: z.string(), category: z.enum(['Discord', 'Hosting', 'Shop', 'Server', 'SMP', 'Community']), description: z.string(), logoUrl: z.string(), websiteUrl: z.string() }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    await requireAdmin(context);
    if (input.name.trim().length < 2) throw fail('BAD_REQUEST', 'Partner name is required.');
    const record = { name: input.name.trim(), category: input.category, description: input.description.trim().slice(0, 600), logoUrl: cleanUrl(input.logoUrl), websiteUrl: cleanUrl(input.websiteUrl) };
    if (input.id) await zite.partners.update({ id: input.id, record });
    else await zite.partners.create({ record });
    await logActivity(context, input.id ? 'Updated partner' : 'Added partner', `Partner ${record.name}`);
    return { ok: true };
  },
});
