import { z } from 'zod';
import { createEndpoint } from 'zitejs/backend';
import { zite } from 'zitejs/db';
import { requireAdmin, fail, logActivity } from '../server/lib';

export default createEndpoint({
  description: 'Changes a user staff role with owner protections',
  authenticated: true,
  inputSchema: z.object({ profileId: z.string(), role: z.enum(['Admin', 'Moderator', 'Staff', 'Member']) }),
  outputSchema: z.any(),
  execute: async ({ input, context }) => {
    const me = await requireAdmin(context);
    const target = await zite.profiles.findOne({ id: input.profileId });
    if (!target) throw fail('NOT_FOUND', 'That user no longer exists.');
    if (target.role === 'Owner') throw fail('FORBIDDEN', "The Owner's role can't be changed.");
    if (me.role !== 'Owner' && (input.role === 'Admin' || target.role === 'Admin')) throw fail('FORBIDDEN', 'Only the Owner can grant or remove Admin access.');
    if (target.id === me.id) throw fail('FORBIDDEN', "You can't change your own role.");
    await zite.profiles.update({ id: target.id, record: { role: input.role } });
    await logActivity(context, 'Changed staff role', `User @${target.username}`, `${target.role ?? 'Member'} → ${input.role}`);
    return { ok: true };
  },
});
