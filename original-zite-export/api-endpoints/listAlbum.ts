import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { profileMap, uid } from '../server/lib';

export default createEndpoint({
  description: 'Lists approved community album images',
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async () => {
    const [{ records }, pm] = await Promise.all([
      zite.albumSubmissions.findAll({ filters: { status: 'Approved' }, sort: [{ field: 'submittedAt', direction: 'desc' }], limit: 500 }),
      profileMap(),
    ]);
    return { images: records.map((a) => ({ id: a.id, imageUrl: a.imageUrl ?? '', caption: a.caption ?? '', submittedAt: a.submittedAt ?? '', uploader: pm.get(uid(a.uploader)) ?? null })) };
  },
});
