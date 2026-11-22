import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { fail, uid } from '../server/lib';

export default createEndpoint({
  description: 'Returns a public profile and its approved album images',
  inputSchema: z.object({ profileId: z.string().min(1) }),
  outputSchema: z.any(),
  execute: async ({ input }) => {
    const p = await zite.profiles.findOne({ id: input.profileId });
    if (!p) throw fail('NOT_FOUND', "This player profile doesn't exist.");
    const userId = uid(p.user);
    const { records } = userId
      ? await zite.albumSubmissions.findAll({ filters: { uploader: userId, status: 'Approved' }, sort: [{ field: 'submittedAt', direction: 'desc' }], limit: 200 })
      : { records: [] };
    return {
      profile: { id: p.id, username: p.username ?? 'player', bio: p.bio ?? '', avatarUrl: p.avatarUrl ?? '', role: p.role ?? 'Member', joinedAt: p.joinedAt ?? '' },
      images: records.map((a) => ({ id: a.id, imageUrl: a.imageUrl ?? '', caption: a.caption ?? '' })),
    };
  },
});
