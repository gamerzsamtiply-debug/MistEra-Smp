import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { ensureProfile } from '../server/lib';

export default createEndpoint({
  description: 'Returns the signed-in user profile and permissions',
  authenticated: true,
  inputSchema: z.object({}),
  outputSchema: z.any(),
  execute: async ({ context }) => {
    const p = await ensureProfile(context);
    return {
      profile: { id: p.id, username: p.username ?? '', bio: p.bio ?? '', avatarUrl: p.avatarUrl ?? '', role: p.role ?? 'Member' },
      isOwner: p.role === 'Owner',
      isAdmin: p.role === 'Owner' || p.role === 'Admin',
    };
  },
});
