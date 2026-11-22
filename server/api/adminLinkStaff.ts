import { z } from 'zod';
import { authEndpoint } from '../endpoint.js';
import { db, must, isUuid } from '../db.js';
import { fail } from '../errors.js';
import { logActivity, requireAdmin } from '../lib.js';
import type { ProfileRow, StaffRow } from '../types.js';

// Links a staff entry to a registered account by username, or unlinks it (username = null).
// Linking is cosmetic (profile link + avatar fallback); it never grants any access.
export default authEndpoint(z.object({ id: z.string().max(80), username: z.string().max(40).nullable() }), async ({ input, user }) => {
  const me = await requireAdmin(user);
  if (!isUuid(input.id)) throw fail('NOT_FOUND', 'That staff member no longer exists.');
  const s = must(await db().from('staff_members').select('id,name,position').eq('id', input.id).maybeSingle(), 'staff_members.find') as Pick<StaffRow, 'id' | 'name' | 'position'> | null;
  if (!s) throw fail('NOT_FOUND', 'That staff member no longer exists.');
  if (me.role !== 'Owner' && (s.position === 'Owner' || s.position === 'Admin')) throw fail('FORBIDDEN', 'Only the site owner can change Owner or Admin entries.');
  if (input.username === null) {
    must(await db().from('staff_members').update({ profile_id: null, claim_hash: null, claim_expires: null }).eq('id', s.id), 'staff_members.unlink');
    await logActivity(user, 'Unlinked staff account', `Staff ${s.name}`);
    return { ok: true };
  }
  const uname = input.username.trim().replace(/^@/, '');
  const p = must(await db().from('profiles').select('id,username').eq('username', uname).maybeSingle(), 'profiles.byUsername') as Pick<ProfileRow, 'id' | 'username'> | null;
  if (!p) throw fail('NOT_FOUND', 'No registered user has that username.');
  const taken = must(await db().from('staff_members').select('id').eq('profile_id', p.id).neq('id', s.id).maybeSingle(), 'staff_members.byProfile') as { id: string } | null;
  if (taken) throw fail('CONFLICT', 'That account is already linked to another staff member.');
  must(await db().from('staff_members').update({ profile_id: p.id, claim_hash: null, claim_expires: null }).eq('id', s.id), 'staff_members.link');
  await logActivity(user, 'Linked staff account', `Staff ${s.name}`, `@${p.username}`);
  return { ok: true };
});
