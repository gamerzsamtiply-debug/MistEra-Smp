import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must, isUuid } from '../db.js';
import { fail } from '../errors.js';
import { cleanUrl, logActivity, requireAdmin, STAFF_POSITIONS } from '../lib.js';
import type { StaffRow } from '../types.js';

const RESTRICTED = ['Owner', 'Admin'];

// Creates or updates a staff member (name, avatar, position). No account required.
export default authEndpoint(
  z.object({ id: z.string().max(64).optional(), name: z.string().max(100), avatarUrl: z.string().max(4096), position: z.enum(STAFF_POSITIONS as [string, ...string[]]) }),
  async ({ input, user }) => {
    const me = await requireAdmin(user);
    const name = input.name.trim();
    if (name.length < 2 || name.length > 40) throw fail('BAD_REQUEST', 'Name must be 2–40 characters.');
    // Same rule as role changes: only the owner account hands out or edits the top positions.
    if (me.role !== 'Owner' && RESTRICTED.includes(input.position)) throw fail('FORBIDDEN', 'Only the site owner can assign the Owner or Admin position.');
    // There is only one Owner: pick a different position for the current one before giving it to someone else.
    if (input.position === 'Owner') {
      const o = must(await db().from('staff_members').select('id,name').eq('position', 'Owner').limit(5), 'staff_members.owner') as { id: string; name: string }[];
      const other = o.find((x) => x.id !== input.id);
      if (other) throw fail('BAD_REQUEST', `${other.name} is already the Owner. Change their position first, then give Owner to someone else.`);
    }
    const record = { name, avatar_url: cleanUrl(input.avatarUrl), position: input.position };
    if (input.id) {
      if (!isUuid(input.id)) throw fail('NOT_FOUND', 'That staff member no longer exists.');
      const cur = must(await db().from('staff_members').select('id,position').eq('id', input.id).maybeSingle(), 'staff_members.find') as Pick<StaffRow, 'id' | 'position'> | null;
      if (!cur) throw fail('NOT_FOUND', 'That staff member no longer exists.');
      if (me.role !== 'Owner' && cur.position && RESTRICTED.includes(cur.position)) throw fail('FORBIDDEN', 'Only the site owner can edit Owner or Admin entries.');
      must(await db().from('staff_members').update(record).eq('id', input.id), 'staff_members.update');
    } else {
      must(await db().from('staff_members').insert(record), 'staff_members.insert');
    }
    await logActivity(user, input.id ? 'Updated staff member' : 'Added staff member', `Staff ${name}`, input.position);
    return { ok: true };
  },
);
