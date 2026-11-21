import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';

export default createEndpoint({
  description: 'Lists the signed-in user own album submissions',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const { records } = await zite.albumSubmissions.findAll({ filters: { uploader: context.user.id }, sort: [{ field: 'submittedAt', direction: 'desc' }], limit: 200 });
    return { items: records.map((a) => ({ id: a.id, imageUrl: a.imageUrl ?? '', caption: a.caption ?? '', status: a.status ?? 'Pending', submittedAt: a.submittedAt ?? '' })) };
  },
});
