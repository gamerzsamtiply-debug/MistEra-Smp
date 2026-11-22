import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must, isUuid } from '../db.js';
import { fail } from '../errors.js';
import { logActivity, requireAdmin } from '../lib.js';
import type { StaffRow } from '../types.js';

// Removes a staff member from the public Staff page (never deletes their account)
export default authEndpoint(z.object({ id: z.string().max(80) }), async ({ input, user }) => {
  const me = await requireAdmin(user);
  if (!isUuid(input.id)) throw fail('NOT_FOUND', 'That staff member was already removed.');
  const s = must(await db().from('staff_members').select('id,name,position').eq('id', input.id).maybeSingle(), 'staff_members.find') as Pick<StaffRow, 'id' | 'name' | 'position'> | null;
  if (!s) throw fail('NOT_FOUND', 'That staff member was already removed.');
  if (me.role !== 'Owner' && (s.position === 'Owner' || s.position === 'Admin')) throw fail('FORBIDDEN', 'Only the site owner can remove Owner or Admin entries.');
  must(await db().from('staff_members').delete().eq('id', s.id), 'staff_members.delete');
  await logActivity(user, 'Removed staff member', `Staff ${s.name}`);
  return { ok: true };
});
