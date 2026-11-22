import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must, isUuid } from '../db.js';
import { fail } from '../errors.js';
import { logActivity, requireAdmin, newClaimCode, hashClaimCode } from '../lib.js';
import type { StaffRow } from '../types.js';

const TTL_MS = 48 * 3600 * 1000;

// Creates a one-time code the staff member enters on their Profile page to link their own account.
// Only a hash is stored, the code expires after 48 hours, and a new code replaces the previous one.
export default authEndpoint(z.object({ id: z.string().max(80) }), async ({ input, user }) => {
  const me = await requireAdmin(user);
  if (!isUuid(input.id)) throw fail('NOT_FOUND', 'That staff member no longer exists.');
  const s = must(await db().from('staff_members').select('id,name,position,profile_id').eq('id', input.id).maybeSingle(), 'staff_members.find') as Pick<StaffRow, 'id' | 'name' | 'position' | 'profile_id'> | null;
  if (!s) throw fail('NOT_FOUND', 'That staff member no longer exists.');
  if (s.profile_id) throw fail('CONFLICT', 'This staff member already has a linked account. Unlink it first.');
  if (me.role !== 'Owner' && (s.position === 'Owner' || s.position === 'Admin')) throw fail('FORBIDDEN', 'Only the site owner can change Owner or Admin entries.');
  const code = newClaimCode();
  const expires = new Date(Date.now() + TTL_MS).toISOString();
  must(await db().from('staff_members').update({ claim_hash: hashClaimCode(code), claim_expires: expires }).eq('id', s.id), 'staff_members.claimCode');
  await logActivity(user, 'Created staff link code', `Staff ${s.name}`);
  return { code, expiresAt: expires };
});
