import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, mustOr } from '../db.js';
import { buildStaffList, requireAdmin } from '../lib.js';

// Staff entries for the admin panel, including account-link state
export default authEndpoint(z.object({}), async ({ user }) => {
  await requireAdmin(user);
  const [staff, claims] = await Promise.all([
    buildStaffList(),
    db().from('staff_members').select('id,claim_expires').not('claim_hash', 'is', null),
  ]);
  const pending = new Map((mustOr(claims, 'staff_members.claims', [] as { id: string; claim_expires: string | null }[])).map((c) => [c.id, c.claim_expires]));
  const now = Date.now();
  return { staff: staff.map((s) => ({ ...s, claimPending: !!pending.get(s.id) && new Date(pending.get(s.id) as string).getTime() > now })) };
});
