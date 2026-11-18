import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { ensureProfile } from '../lib.js';

// Returns the signed-in user profile and permissions
export default authEndpoint(z.object({}), async ({ user }) => {
  const p = await ensureProfile(user);
  return {
    profile: { id: p.id, username: p.username ?? '', bio: p.bio ?? '', avatarUrl: p.avatar_url ?? '', role: p.role ?? 'Member' },
    isOwner: p.role === 'Owner',
    isAdmin: p.role === 'Owner' || p.role === 'Admin',
  };
});
