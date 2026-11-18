import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists the signed-in user own suggestions',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const { records } = await zite.suggestions.findAll({ filters: { author: context.user.id }, sort: [{ field: 'submittedAt', direction: 'desc' }], limit: 200 });
    return { items: records.map((s) => ({ id: s.id, title: s.title ?? '', description: s.description ?? '', status: s.status ?? 'Open', submittedAt: s.submittedAt ?? '' })) };
  },
});
