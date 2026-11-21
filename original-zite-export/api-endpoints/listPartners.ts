import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists all partners',
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async () => {
    const { records } = await zite.partners.findAll({ sort: [{ field: 'name', direction: 'asc' }], limit: 500 });
    return { partners: records.map((p) => ({ id: p.id, name: p.name ?? '', category: p.category ?? 'Community', description: p.description ?? '', logoUrl: p.logoUrl ?? '', websiteUrl: p.websiteUrl ?? '' })) };
  },
});
