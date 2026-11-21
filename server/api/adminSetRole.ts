import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must } from '../db.js';
import { fail } from '../errors.js';
import { findProfileById, logActivity, requireAdmin } from '../lib.js';

// Changes a user's staff role with owner protections
export default authEndpoint(z.object({ profileId: z.string().max(64), role: z.enum(['Admin', 'Moderator', 'Staff', 'Member']) }), async ({ input, user }) => {
  const me = await requireAdmin(user);
  const target = await findProfileById(input.profileId);
  if (!target) throw fail('NOT_FOUND', 'That user no longer exists.');
  if (target.role === 'Owner') throw fail('FORBIDDEN', "The Owner's role can't be changed.");
  if (me.role !== 'Owner' && (input.role === 'Admin' || target.role === 'Admin')) throw fail('FORBIDDEN', 'Only the Owner can grant or remove Admin access.');
  if (target.id === me.id) throw fail('FORBIDDEN', "You can't change your own role.");
  must(await db().from('profiles').update({ role: input.role }).eq('id', target.id), 'profiles.setRole');
  await logActivity(user, 'Changed staff role', `User @${target.username}`, `${target.role ?? 'Member'} → ${input.role}`);
  return { ok: true };
});
