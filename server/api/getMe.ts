import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, mustOr } from '../db.js';
import { displayRole, ensureProfile, isOwnerUser } from '../lib.js';

// Returns the signed-in user profile and permissions
export default authEndpoint(z.object({}), async ({ user }) => {
  const p = await ensureProfile(user);
  const sr = await db().from('staff_members').select('id,position').eq('profile_id', p.id).maybeSingle();
  const staff = mustOr(sr, 'staff_members.mine', null as { id: string; position: string } | null);
  return {
    profile: { id: p.id, username: p.username ?? '', bio: p.bio ?? '', avatarUrl: p.avatar_url ?? '', bannerUrl: p.banner_url ?? '', role: displayRole(p.role) },
    staffPosition: staff ? (p.role === 'Owner' ? 'Admin' : staff.position) : null,
    isOwner: p.role === 'Owner',
    /** The real site-owner account (the only one that can grant or remove the Owner role). */
    isPrimaryOwner: isOwnerUser(user, p.role),
    isAdmin: p.role === 'Owner' || p.role === 'Admin',
    /** Moderators, Admins and the Owner: may open the Admin Panel's album approvals. */
    isModerator: p.role === 'Owner' || p.role === 'Admin' || p.role === 'Moderator',
  };
});
